package com.unknown.platform.common.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;

/**
 * 客户端实时事件发布服务。
 *
 * <p>业务写接口成功后调用本服务发布变更事件；事件只通知前端刷新，不直接参与业务事务。</p>
 */
@Service
public class ClientRealtimeService {
  private static final Logger LOGGER = LoggerFactory.getLogger(ClientRealtimeService.class);
  private static final String ONGOING_ORDERS_CHANGED = "ongoing_orders_changed";
  private static final String ONGOING_ORDERS_SCOPE = "ongoing_orders";

  private final AtomicLong version = new AtomicLong();
  private final ClientRealtimeSessionRegistry sessionRegistry;
  private final ObjectMapper objectMapper;
  private final JdbcTemplate jdbcTemplate;

  public ClientRealtimeService(
      ClientRealtimeSessionRegistry sessionRegistry,
      ObjectMapper objectMapper,
      JdbcTemplate jdbcTemplate
  ) {
    this.sessionRegistry = sessionRegistry;
    this.objectMapper = objectMapper;
    this.jdbcTemplate = jdbcTemplate;
  }

  /**
   * 发布进行中模块变更事件。
   *
   * @param bizType 业务类型，例如 hunting、tutor、purchase
   * @param bizId 业务对象对外 ID
   * @param reason 触发原因
   */
  public void publishOngoingOrdersChanged(String bizType, String bizId, String reason) {
    ClientRealtimeEvent event = new ClientRealtimeEvent(
        ONGOING_ORDERS_CHANGED,
        ONGOING_ORDERS_SCOPE,
        defaultText(bizType),
        defaultText(bizId),
        defaultText(reason),
        version.incrementAndGet(),
        OffsetDateTime.now().toString()
    );

    try {
      Set<Long> userIds = resolveAudienceUserIds(event);
      if (!userIds.isEmpty()) {
        sessionRegistry.sendToUsers(userIds, objectMapper.writeValueAsString(event));
      }
    } catch (JsonProcessingException exception) {
      LOGGER.warn("客户端实时事件序列化失败：{}", event, exception);
    } catch (RuntimeException exception) {
      LOGGER.warn("客户端实时事件发布失败：{}", event, exception);
    }
  }

  private Set<Long> resolveAudienceUserIds(ClientRealtimeEvent event) {
    return switch (event.bizType()) {
      case "hunting" -> resolveHuntingAudience(event.bizId());
      case "tutor" -> resolveTutorAudience(event.bizId());
      case "purchase" -> resolvePurchaseAudience(event.bizId());
      default -> Set.of();
    };
  }

  private Set<Long> resolveHuntingAudience(String taskPublicId) {
    Set<Long> userIds = new HashSet<>();
    jdbcTemplate.query(
        """
            SELECT publisher_user_id, accepted_user_id
            FROM hunting_task
            WHERE public_id = ?
            LIMIT 1
            """,
        (RowCallbackHandler) rs -> {
          addNullableUserId(userIds, rs.getObject("publisher_user_id", Long.class));
          addNullableUserId(userIds, rs.getObject("accepted_user_id", Long.class));
        },
        taskPublicId
    );
    jdbcTemplate.query(
        """
            SELECT hq.quote_user_id
            FROM hunting_task_quote hq
            INNER JOIN hunting_task ht ON ht.id = hq.hunting_task_id
            WHERE ht.public_id = ?
            """,
        (RowCallbackHandler) rs -> addNullableUserId(userIds, rs.getObject("quote_user_id", Long.class)),
        taskPublicId
    );
    return userIds;
  }

  private Set<Long> resolveTutorAudience(String demandPublicId) {
    Set<Long> userIds = new HashSet<>();
    jdbcTemplate.query(
        """
            SELECT parent_user_id
            FROM tutor_demand
            WHERE public_id = ?
            LIMIT 1
            """,
        (RowCallbackHandler) rs -> addNullableUserId(userIds, rs.getObject("parent_user_id", Long.class)),
        demandPublicId
    );
    jdbcTemplate.query(
        """
            SELECT ta.applicant_user_id
            FROM tutor_applicant ta
            INNER JOIN tutor_demand td ON td.id = ta.tutor_demand_id
            WHERE td.public_id = ?
              AND ta.enabled = TRUE
            """,
        (RowCallbackHandler) rs -> addNullableUserId(userIds, rs.getObject("applicant_user_id", Long.class)),
        demandPublicId
    );
    return userIds;
  }

  private Set<Long> resolvePurchaseAudience(String orderNo) {
    List<Long> userIds = jdbcTemplate.query(
        """
            SELECT buyer_user_id
            FROM purchase_order
            WHERE order_no = ?
            LIMIT 1
            """,
        (rs, rowNum) -> rs.getLong("buyer_user_id"),
        orderNo
    );
    return new HashSet<>(userIds);
  }

  private void addNullableUserId(Set<Long> userIds, Long userId) {
    if (userId != null) {
      userIds.add(userId);
    }
  }

  private String defaultText(String value) {
    return value == null ? "" : value;
  }
}
