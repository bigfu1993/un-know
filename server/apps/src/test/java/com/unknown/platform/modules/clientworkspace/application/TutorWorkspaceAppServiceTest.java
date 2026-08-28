package com.unknown.platform.modules.clientworkspace.application;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorDemand;
import com.unknown.platform.modules.clientworkspace.model.ConfirmTutorTrialRequest;
import java.lang.reflect.Proxy;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class TutorWorkspaceAppServiceTest {

  @Test
  void allowsCurrentTrialScheduleOutsideNonEmptyHistoricalAvailability() {
    TrialEndpointJdbcTemplate jdbcTemplate = new TrialEndpointJdbcTemplate(
        "2099年9月6日 8:00-9:00"
    );
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate)
    );

    TutorDemand demand = service.confirmTutorTrial(
        "TD-1",
        "TA-1",
        new ConfirmTutorTrialRequest("2099-09-06", "2099-09-06", "2099年9月6日 13:00-15:00"),
        "Bearer parent"
    );

    assertEquals("TD-1", demand.id());
  }

  /** 只实现当前试课 endpoint 所经过的 JDBC 边界，保留非空历史 availability 作为回归夹具。 */
  private static final class TrialEndpointJdbcTemplate extends JdbcTemplate {
    private final String historicalAvailability;

    private TrialEndpointJdbcTemplate(String historicalAvailability) {
      this.historicalAvailability = historicalAvailability;
    }

    @Override
    public int update(String sql, Object... args) {
      return 1;
    }

    @Override
    public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
      if (sql.contains("FROM auth_session")) {
        return requiredType.cast(7L);
      }
      throw new AssertionError("未覆盖的单值查询：" + sql);
    }

    @Override
    public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
      try {
        if (sql.contains("SELECT availability")) {
          return List.of(rowMapper.mapRow(resultSet(Map.of("availability", historicalAvailability)), 0));
        }
        if (sql.contains("FROM tutor_demand") && sql.contains("FOR UPDATE")) {
          return List.of(rowMapper.mapRow(resultSet(Map.of(
              "id", 1L,
              "parent_user_id", 7L,
              "public_id", "TD-1",
              "status", "RECRUITING"
          )), 0));
        }
        if (sql.contains("FROM tutor_demand td")) {
          return List.of(rowMapper.mapRow(resultSet(Map.ofEntries(
              Map.entry("address_label", "教学地址"),
              Map.entry("budget", "按小时结算"),
              Map.entry("child", "孩子"),
              Map.entry("description", "需求说明"),
              Map.entry("id", 1L),
              Map.entry("period_dates", ""),
              Map.entry("period_end", "2099-09-30"),
              Map.entry("period_start", "2099-09-01"),
              Map.entry("public_id", "TD-1"),
              Map.entry("publisher_nickname", "家长"),
              Map.entry("publisher_phone", ""),
              Map.entry("school", "学校"),
              Map.entry("status", "RECRUITING"),
              Map.entry("subject", "math"),
              Map.entry("title", "数学家教")
          )), 0));
        }
        if (sql.contains("FROM tutor_applicant ta")) {
          return List.of();
        }
        throw new AssertionError("未覆盖的列表查询：" + sql);
      } catch (SQLException exception) {
        throw new DataAccessResourceFailureException("测试 ResultSet 映射失败", exception);
      }
    }
  }

  private static ResultSet resultSet(Map<String, Object> values) {
    return (ResultSet) Proxy.newProxyInstance(
        TutorWorkspaceAppServiceTest.class.getClassLoader(),
        new Class<?>[]{ResultSet.class},
        (proxy, method, args) -> {
          String methodName = method.getName();
          if ("getString".equals(methodName)) {
            Object value = values.get(String.valueOf(args[0]));
            return value == null ? null : String.valueOf(value);
          }
          if ("getLong".equals(methodName)) {
            Object value = values.get(String.valueOf(args[0]));
            return value instanceof Number number ? number.longValue() : 0L;
          }
          if ("getObject".equals(methodName)) {
            return values.get(String.valueOf(args[0]));
          }
          if ("wasNull".equals(methodName)) {
            return false;
          }
          if ("toString".equals(methodName)) {
            return "TrialEndpointResultSet";
          }
          throw new UnsupportedOperationException("测试 ResultSet 未实现：" + methodName);
        }
    );
  }
}
