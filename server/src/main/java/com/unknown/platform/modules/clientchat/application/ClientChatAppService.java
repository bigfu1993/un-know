package com.unknown.platform.modules.clientchat.application;

import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.clientchat.model.ChatConversationResponse;
import com.unknown.platform.modules.clientchat.model.ChatMessageResponse;
import com.unknown.platform.modules.clientchat.model.ChatQuickActionRequest;
import com.unknown.platform.modules.clientchat.model.ChatQuickActionResponse;
import com.unknown.platform.modules.clientchat.model.CreateChatConversationRequest;
import com.unknown.platform.modules.clientchat.model.SendChatMessageRequest;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 独立聊天服务，支持用户间文字消息、订单卡片和可配置快捷按钮。 */
@Service
public class ClientChatAppService {
  private final JdbcTemplate jdbcTemplate;
  private final ClientSessionService clientSessionService;

  public ClientChatAppService(JdbcTemplate jdbcTemplate, ClientSessionService clientSessionService) {
    this.jdbcTemplate = jdbcTemplate;
    this.clientSessionService = clientSessionService;
  }

  /** 查询当前用户的聊天会话摘要，最近更新排在最前。 */
  public List<ChatConversationResponse> conversations(String authorization) {
    long userId = clientSessionService.requireUserId(authorization);
    return jdbcTemplate.query(
        """
            SELECT c.public_id,
                   COALESCE(NULLIF(p.nickname, ''), '未设置昵称') AS peer_nickname,
                   COALESCE(p.phone, '') AS peer_phone,
                   c.title,
                   c.related_biz_type,
                   c.related_biz_id,
                   COALESCE(m.content, '') AS last_message,
                   TO_CHAR(c.updated_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD HH24:MI') AS updated_at
            FROM chat_conversation c
            JOIN app_user p ON p.id = c.peer_user_id
            LEFT JOIN LATERAL (
              SELECT content
              FROM chat_message
              WHERE conversation_id = c.id
              ORDER BY created_at DESC, id DESC
              LIMIT 1
            ) m ON TRUE
            WHERE c.owner_user_id = ?
              AND c.status = 'active'
            ORDER BY c.updated_at DESC, c.id DESC
            """,
        (rs, rowNum) -> new ChatConversationResponse(
            rs.getString("public_id"),
            new UserNickname(rs.getString("peer_nickname"), rs.getString("peer_phone")),
            rs.getString("title"),
            rs.getString("related_biz_type"),
            rs.getString("related_biz_id"),
            rs.getString("last_message"),
            rs.getString("updated_at"),
            0
        ),
        userId
    );
  }

  /** 创建或复用一条当前用户到对方用户的会话。 */
  @Transactional
  public ChatConversationResponse createConversation(CreateChatConversationRequest request, String authorization) {
    long ownerUserId = clientSessionService.requireUserId(authorization);
    long peerUserId = parseUserId(request.peerUserId());
    if (ownerUserId == peerUserId) {
      throw new BusinessException("CHAT_PEER_SELF", "不能和自己创建会话");
    }
    requireUser(peerUserId);

    String title = defaultText(request.title(), "沟通会话");
    List<String> existingIds = jdbcTemplate.query(
        """
            SELECT public_id
            FROM chat_conversation
            WHERE owner_user_id = ?
              AND peer_user_id = ?
              AND COALESCE(related_biz_type, '') = COALESCE(?, '')
              AND COALESCE(related_biz_id, '') = COALESCE(?, '')
              AND status = 'active'
            LIMIT 1
            """,
        (rs, rowNum) -> rs.getString("public_id"),
        ownerUserId,
        peerUserId,
        request.relatedBizType(),
        request.relatedBizId()
    );
    if (!existingIds.isEmpty()) {
      return conversation(ownerUserId, existingIds.get(0));
    }

    String publicId = nextPublicId("CC");
    jdbcTemplate.update(
        """
            INSERT INTO chat_conversation (
              public_id, owner_user_id, peer_user_id, title, related_biz_type, related_biz_id, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, NOW())
            """,
        publicId,
        ownerUserId,
        peerUserId,
        title,
        clean(request.relatedBizType()),
        clean(request.relatedBizId())
    );
    return conversation(ownerUserId, publicId);
  }

  /** 查询会话内消息，按创建时间正序返回。 */
  public List<ChatMessageResponse> messages(String conversationId, String authorization) {
    long userId = clientSessionService.requireUserId(authorization);
    long rowId = requireConversation(userId, conversationId);
    return jdbcTemplate.query(
        """
            SELECT m.public_id,
                   c.public_id AS conversation_public_id,
                   m.sender_user_id,
                   COALESCE(NULLIF(u.nickname, ''), '未设置昵称') AS sender_nickname,
                   COALESCE(u.phone, '') AS sender_phone,
                   m.message_type,
                   m.content,
                   m.related_card_type,
                   m.related_card_id,
                   TO_CHAR(m.created_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD HH24:MI') AS created_at
            FROM chat_message m
            JOIN chat_conversation c ON c.id = m.conversation_id
            JOIN app_user u ON u.id = m.sender_user_id
            WHERE m.conversation_id = ?
            ORDER BY m.created_at, m.id
            """,
        (rs, rowNum) -> new ChatMessageResponse(
            rs.getString("public_id"),
            rs.getString("conversation_public_id"),
            rs.getLong("sender_user_id") == userId,
            new UserNickname(rs.getString("sender_nickname"), rs.getString("sender_phone")),
            rs.getString("message_type"),
            rs.getString("content"),
            rs.getString("related_card_type"),
            rs.getString("related_card_id"),
            rs.getString("created_at")
        ),
        rowId
    );
  }

  /** 发送文字或业务卡片消息，并同步刷新会话更新时间。 */
  @Transactional
  public ChatMessageResponse sendMessage(String conversationId, SendChatMessageRequest request, String authorization) {
    long userId = clientSessionService.requireUserId(authorization);
    long rowId = requireConversation(userId, conversationId);
    String content = clean(request.content());
    if (content.isBlank()) {
      throw new BusinessException("CHAT_MESSAGE_EMPTY", "消息内容不能为空");
    }
    String publicId = nextPublicId("CM");
    jdbcTemplate.update(
        """
            INSERT INTO chat_message (
              public_id, conversation_id, sender_user_id, message_type, content, related_card_type, related_card_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
        publicId,
        rowId,
        userId,
        defaultText(request.messageType(), "text"),
        content,
        clean(request.relatedCardType()),
        clean(request.relatedCardId())
    );
    jdbcTemplate.update("UPDATE chat_conversation SET updated_at = NOW() WHERE id = ?", rowId);
    return messages(conversationId, authorization).stream()
        .filter((message) -> message.id().equals(publicId))
        .findFirst()
        .orElseThrow(() -> new BusinessException("CHAT_MESSAGE_NOT_FOUND", "消息发送后读取失败"));
  }

  /** 查询当前用户配置的聊天快捷按钮。 */
  public List<ChatQuickActionResponse> quickActions(String authorization) {
    long userId = clientSessionService.requireUserId(authorization);
    return jdbcTemplate.query(
        """
            SELECT public_id, label, content, sort_order
            FROM chat_quick_action
            WHERE owner_user_id = ?
              AND enabled = TRUE
            ORDER BY sort_order, id
            """,
        (rs, rowNum) -> new ChatQuickActionResponse(
            rs.getString("public_id"),
            rs.getString("label"),
            rs.getString("content"),
            rs.getInt("sort_order")
        ),
        userId
    );
  }

  /** 新增快捷按钮，后续聊天窗口可直接展示为自定义快捷操作。 */
  @Transactional
  public ChatQuickActionResponse createQuickAction(ChatQuickActionRequest request, String authorization) {
    long userId = clientSessionService.requireUserId(authorization);
    String publicId = nextPublicId("CQA");
    int sortOrder = request.sortOrder() == null ? 100 : request.sortOrder();
    jdbcTemplate.update(
        """
            INSERT INTO chat_quick_action (public_id, owner_user_id, label, content, sort_order, updated_at)
            VALUES (?, ?, ?, ?, ?, NOW())
            """,
        publicId,
        userId,
        request.label().strip(),
        request.content().strip(),
        sortOrder
    );
    return quickActions(authorization).stream()
        .filter((action) -> action.id().equals(publicId))
        .findFirst()
        .orElseThrow(() -> new BusinessException("CHAT_QUICK_ACTION_NOT_FOUND", "快捷按钮保存后读取失败"));
  }

  private ChatConversationResponse conversation(long ownerUserId, String conversationId) {
    return conversationsForId(ownerUserId, conversationId).stream()
        .findFirst()
        .orElseThrow(() -> new BusinessException("CHAT_CONVERSATION_NOT_FOUND", "会话不存在或无权查看"));
  }

  private List<ChatConversationResponse> conversationsForId(long ownerUserId, String conversationId) {
    return jdbcTemplate.query(
        """
            SELECT c.public_id,
                   COALESCE(NULLIF(p.nickname, ''), '未设置昵称') AS peer_nickname,
                   COALESCE(p.phone, '') AS peer_phone,
                   c.title,
                   c.related_biz_type,
                   c.related_biz_id,
                   COALESCE(m.content, '') AS last_message,
                   TO_CHAR(c.updated_at AT TIME ZONE 'Asia/Shanghai', 'MM-DD HH24:MI') AS updated_at
            FROM chat_conversation c
            JOIN app_user p ON p.id = c.peer_user_id
            LEFT JOIN LATERAL (
              SELECT content
              FROM chat_message
              WHERE conversation_id = c.id
              ORDER BY created_at DESC, id DESC
              LIMIT 1
            ) m ON TRUE
            WHERE c.owner_user_id = ?
              AND c.public_id = ?
              AND c.status = 'active'
            LIMIT 1
            """,
        (rs, rowNum) -> new ChatConversationResponse(
            rs.getString("public_id"),
            new UserNickname(rs.getString("peer_nickname"), rs.getString("peer_phone")),
            rs.getString("title"),
            rs.getString("related_biz_type"),
            rs.getString("related_biz_id"),
            rs.getString("last_message"),
            rs.getString("updated_at"),
            0
        ),
        ownerUserId,
        conversationId
    );
  }

  private long requireConversation(long ownerUserId, String conversationId) {
    List<Long> rows = jdbcTemplate.query(
        """
            SELECT id
            FROM chat_conversation
            WHERE owner_user_id = ?
              AND public_id = ?
              AND status = 'active'
            LIMIT 1
            """,
        (rs, rowNum) -> rs.getLong("id"),
        ownerUserId,
        conversationId
    );
    if (rows.isEmpty()) {
      throw new BusinessException("CHAT_CONVERSATION_NOT_FOUND", "会话不存在或无权查看");
    }
    return rows.get(0);
  }

  private void requireUser(long userId) {
    Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM app_user WHERE id = ?", Integer.class, userId);
    if (count == null || count == 0) {
      throw new BusinessException("CHAT_PEER_NOT_FOUND", "对方用户不存在");
    }
  }

  private long parseUserId(String rawUserId) {
    try {
      return Long.parseLong(rawUserId.strip());
    } catch (RuntimeException error) {
      throw new BusinessException("CHAT_PEER_INVALID", "对方用户 ID 不正确");
    }
  }

  private String clean(String value) {
    return value == null ? "" : value.strip();
  }

  private String defaultText(String value, String fallback) {
    String cleanedValue = clean(value);
    return cleanedValue.isBlank() ? fallback : cleanedValue;
  }

  private String nextPublicId(String prefix) {
    String randomSuffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
    return prefix + System.currentTimeMillis() + randomSuffix;
  }
}
