package com.unknown.platform.modules.clientworkspace.application;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unknown.platform.common.exception.BusinessException;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.ClientOrder;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorDemand;
import com.unknown.platform.modules.clientworkspace.model.ConfirmTutorTrialRequest;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.lang.reflect.Proxy;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class TutorWorkspaceAppServiceTest {

  @Test
  void archivesPendingPublishTutorDemandFromOngoingOrders() {
    TrialEndpointJdbcTemplate jdbcTemplate = new TrialEndpointJdbcTemplate("");
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );
    ClientOrder order = ClientOrder.builder()
        .id("TD-1")
        .role(ClientRole.parent)
        .status("PENDING_PUBLISH")
        .category("tutor")
        .build();

    assertTrue(service.isArchivedTutorOrder(order));
  }

  @Test
  void mapsRecruitingJobPlannedDatesFromPlannedDatesQueryAlias() {
    TrialEndpointJdbcTemplate jdbcTemplate = new TrialEndpointJdbcTemplate("");
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );

    List<TutorDemand> demands = service.recruitingTutorDemandsForJobs(ClientRole.student);

    assertEquals(List.of("2099-09-06", "2099-09-08"), demands.get(0).plannedDates());
    assertTrue(jdbcTemplate.tutorDemandQuerySql().contains("td.period_dates AS planned_dates"));
  }

  @Test
  void mapsStructuredTestedDatesToStudentOngoingOrder() {
    TrialEndpointJdbcTemplate jdbcTemplate = TrialEndpointJdbcTemplate.forStudentOngoing(
        "2099年9月6日 13:00-15:00",
        "[{\"date\":\"2099-09-06\",\"timeRanges\":[{\"start\":\"13:00\",\"end\":\"15:00\"}]}]"
    );
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );

    ClientOrder order = service.tutorOrders(ClientRole.student, 8L).get(0);

    assertEquals(List.of("2099-09-01", "2099-09-06"), order.plannedDates());
    assertEquals("2099-09-06", order.testedDates().get(0).date());
    assertEquals("13:00", order.testedDates().get(0).timeRanges().get(0).start());
    assertTrue(jdbcTemplate.studentOngoingQuerySql().contains("schedule_dates"));
  }

  @Test
  void allowsCurrentTrialScheduleOutsideNonEmptyHistoricalAvailability() {
    TrialEndpointJdbcTemplate jdbcTemplate = new TrialEndpointJdbcTemplate(
        "2099年9月6日 8:00-9:00"
    );
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );

    TutorDemand demand = service.confirmTutorTrial(
        "TD-1",
        "TA-1",
        new ConfirmTutorTrialRequest(List.of(
            new ConfirmTutorTrialRequest.TrialScheduleDate(
                "2099-09-08",
                List.of(new ConfirmTutorTrialRequest.TrialScheduleTimeRange("18:00", "20:00"))
            ),
            new ConfirmTutorTrialRequest.TrialScheduleDate(
                "2099-09-06",
                List.of(
                    new ConfirmTutorTrialRequest.TrialScheduleTimeRange("16:00", "17:00"),
                    new ConfirmTutorTrialRequest.TrialScheduleTimeRange("13:00", "15:00")
                )
            )
        )),
        "Bearer parent"
    );

    assertEquals("TD-1", demand.id());
    assertFalse(jdbcTemplate.applicantUpdateSql().contains("trial_start"));
    assertFalse(jdbcTemplate.applicantUpdateSql().contains("trial_end"));
    assertFalse(jdbcTemplate.applicantUpdateSql().contains("trial_half_day"));
    assertArrayEquals(
        new Object[]{
            "TRIAL_CONFIRMING",
            1L,
            "TA-1",
            "APPLICATION_PENDING",
            "APPLICATION_PENDING",
            "TRIAL_CONFIRMING",
            "TRIAL_CONFIRMING"
        },
        jdbcTemplate.applicantUpdateArgs()
    );
    assertArrayEquals(
        new Object[]{
            "trial",
            "2099-09-06",
            "2099-09-08",
            "2099年9月6日 13:00-15:00 16:00-17:00；2099年9月8日 18:00-20:00",
            "[{\"date\":\"2099-09-06\",\"timeRanges\":[{\"start\":\"13:00\",\"end\":\"15:00\"},{\"start\":\"16:00\",\"end\":\"17:00\"}]},{\"date\":\"2099-09-08\",\"timeRanges\":[{\"start\":\"18:00\",\"end\":\"20:00\"}]}]",
            "parent",
            1L,
            "TA-1"
        },
        jdbcTemplate.scheduleUpdateArgs()
    );
    assertTrue(jdbcTemplate.scheduleUpdateSql().contains("schedule_dates"));
  }

  @Test
  void rejectsTwentyFourHourTimeInsteadOfNormalizingItToMidnight() {
    TrialEndpointJdbcTemplate jdbcTemplate = new TrialEndpointJdbcTemplate("");
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );

    BusinessException error = assertThrows(
        BusinessException.class,
        () -> service.confirmTutorTrial(
            "TD-1",
            "TA-1",
            new ConfirmTutorTrialRequest(List.of(
                new ConfirmTutorTrialRequest.TrialScheduleDate(
                    "2099-09-06",
                    List.of(new ConfirmTutorTrialRequest.TrialScheduleTimeRange("24:00", "1:00"))
                )
            )),
            "Bearer parent"
        )
    );

    assertEquals("TUTOR_TRIAL_SCHEDULE_INVALID", error.code());
  }

  @Test
  void rejectsNullNestedScheduleElementsAtRequestValidationBoundary() {
    try (ValidatorFactory validatorFactory = Validation.buildDefaultValidatorFactory()) {
      Validator validator = validatorFactory.getValidator();
      ConfirmTutorTrialRequest nullDateRequest = new ConfirmTutorTrialRequest(Collections.singletonList(null));
      ConfirmTutorTrialRequest nullRangeRequest = new ConfirmTutorTrialRequest(List.of(
          new ConfirmTutorTrialRequest.TrialScheduleDate("2099-09-06", Collections.singletonList(null))
      ));

      assertFalse(validator.validate(nullDateRequest).isEmpty());
      assertFalse(validator.validate(nullRangeRequest).isEmpty());
    }
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("invalidTrialScheduleRequests")
  void rejectsInvalidStructuredTrialSchedules(
      String caseName,
      ConfirmTutorTrialRequest request,
      String expectedCode
  ) {
    TrialEndpointJdbcTemplate jdbcTemplate = new TrialEndpointJdbcTemplate("");
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );

    BusinessException error = assertThrows(
        BusinessException.class,
        () -> service.confirmTutorTrial("TD-1", "TA-1", request, "Bearer parent"),
        caseName
    );

    assertEquals(expectedCode, error.code());
  }

  @Test
  void confirmsTrialFromStageScheduleWithoutLegacyApplicantFields() {
    TrialEndpointJdbcTemplate jdbcTemplate = TrialEndpointJdbcTemplate.forStudentConfirmation(
        "2099年9月6日 13:00-15:00"
    );
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );

    TutorDemand demand = service.confirmTutorTrialStart("TA-1", "Bearer student");

    assertEquals("TD-1", demand.id());
  }

  @Test
  void rejectsTrialConfirmationWhenOnlyServiceStageScheduleExists() {
    TrialEndpointJdbcTemplate jdbcTemplate = TrialEndpointJdbcTemplate.forStudentConfirmation(
        "service",
        "2099年9月6日 13:00-15:00"
    );
    TutorWorkspaceAppService service = new TutorWorkspaceAppService(
        jdbcTemplate,
        new ClientSessionService(jdbcTemplate),
        new ClientWorkspaceSupport(jdbcTemplate),
        new ObjectMapper()
    );

    BusinessException error = assertThrows(
        BusinessException.class,
        () -> service.confirmTutorTrialStart("TA-1", "Bearer student")
    );

    assertEquals("TUTOR_TRIAL_SCHEDULE_REQUIRED", error.code());
  }

  private static Stream<Arguments> invalidTrialScheduleRequests() {
    return Stream.of(
        Arguments.of(
            "空日程",
            new ConfirmTutorTrialRequest(List.of()),
            "TUTOR_TRIAL_SCHEDULE_REQUIRED"
        ),
        Arguments.of(
            "重复日期",
            new ConfirmTutorTrialRequest(List.of(
                trialScheduleDate("2099-09-06", "9:00", "10:00"),
                trialScheduleDate("2099-09-06", "13:00", "14:00")
            )),
            "TUTOR_TRIAL_SCHEDULE_INVALID"
        ),
        Arguments.of(
            "超过三天",
            new ConfirmTutorTrialRequest(List.of(
                trialScheduleDate("2099-09-06", "9:00", "10:00"),
                trialScheduleDate("2099-09-07", "9:00", "10:00"),
                trialScheduleDate("2099-09-08", "9:00", "10:00"),
                trialScheduleDate("2099-09-09", "9:00", "10:00")
            )),
            "TUTOR_TRIAL_SCHEDULE_TOO_MANY_DAYS"
        ),
        Arguments.of(
            "非法日期",
            new ConfirmTutorTrialRequest(List.of(trialScheduleDate("2099-02-30", "9:00", "10:00"))),
            "TUTOR_TRIAL_SCHEDULE_INVALID"
        ),
        Arguments.of(
            "起止时间相同",
            new ConfirmTutorTrialRequest(List.of(trialScheduleDate("2099-09-06", "9:00", "9:00"))),
            "TUTOR_TRIAL_SCHEDULE_INVALID"
        )
    );
  }

  private static ConfirmTutorTrialRequest.TrialScheduleDate trialScheduleDate(
      String date,
      String start,
      String end
  ) {
    return new ConfirmTutorTrialRequest.TrialScheduleDate(
        date,
        List.of(new ConfirmTutorTrialRequest.TrialScheduleTimeRange(start, end))
    );
  }

  /** 只实现当前试课 endpoint 所经过的 JDBC 边界，保留非空历史 availability 作为回归夹具。 */
  private static final class TrialEndpointJdbcTemplate extends JdbcTemplate {
    private final String historicalAvailability;
    private final String scheduleStage;
    private final boolean studentConfirmation;
    private final boolean studentOngoing;
    private final String trialSchedule;
    private final String testedDatesJson;
    private Object[] applicantUpdateArgs = new Object[0];
    private String applicantUpdateSql = "";
    private Object[] scheduleUpdateArgs = new Object[0];
    private String scheduleUpdateSql = "";
    private String studentOngoingQuerySql = "";
    private String tutorDemandQuerySql = "";

    private TrialEndpointJdbcTemplate(String historicalAvailability) {
      this(historicalAvailability, false, false, "", "trial", "[]");
    }

    private TrialEndpointJdbcTemplate(
        String historicalAvailability,
        boolean studentConfirmation,
        boolean studentOngoing,
        String trialSchedule,
        String scheduleStage,
        String testedDatesJson
    ) {
      this.historicalAvailability = historicalAvailability;
      this.scheduleStage = scheduleStage;
      this.studentConfirmation = studentConfirmation;
      this.studentOngoing = studentOngoing;
      this.trialSchedule = trialSchedule;
      this.testedDatesJson = testedDatesJson;
    }

    private static TrialEndpointJdbcTemplate forStudentConfirmation(String trialSchedule) {
      return forStudentConfirmation("trial", trialSchedule);
    }

    private static TrialEndpointJdbcTemplate forStudentConfirmation(String scheduleStage, String trialSchedule) {
      return new TrialEndpointJdbcTemplate("", true, false, trialSchedule, scheduleStage, "[]");
    }

    private static TrialEndpointJdbcTemplate forStudentOngoing(String trialSchedule, String testedDatesJson) {
      return new TrialEndpointJdbcTemplate("", false, true, trialSchedule, "trial", testedDatesJson);
    }

    @Override
    public int update(String sql, Object... args) {
      if (sql.contains("UPDATE tutor_applicant")) {
        applicantUpdateSql = sql;
        applicantUpdateArgs = args;
      }
      if (sql.contains("INSERT INTO tutor_application_schedule")) {
        scheduleUpdateSql = sql;
        scheduleUpdateArgs = args;
      }
      return 1;
    }

    @Override
    public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
      if (sql.contains("FROM auth_session")) {
        return requiredType.cast(studentConfirmation ? 8L : 7L);
      }
      if (sql.contains("SELECT role FROM app_user")) {
        return requiredType.cast("student");
      }
      throw new AssertionError("未覆盖的单值查询：" + sql);
    }

    @Override
    public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
      try {
        if (sql.contains("SELECT availability")) {
          return List.of(rowMapper.mapRow(resultSet(Map.of("availability", historicalAvailability)), 0));
        }
        if (sql.contains("FROM tutor_application_schedule")) {
          boolean matchesStage = args.length > 1 && scheduleStage.equals(args[1]);

          return trialSchedule.isBlank() || !matchesStage
              ? List.of()
              : List.of(rowMapper.mapRow(resultSet(Map.of("1", trialSchedule)), 0));
        }
        if (studentConfirmation && sql.contains("FOR UPDATE OF ta")) {
          return List.of(rowMapper.mapRow(resultSet(Map.ofEntries(
              Map.entry("demand_public_id", "TD-1"),
              Map.entry("id", 2L),
              Map.entry("public_id", "TA-1"),
              Map.entry("status", "TRIAL_CONFIRMING"),
              Map.entry("trial_end", ""),
              Map.entry("trial_half_day", ""),
              Map.entry("trial_start", "")
          )), 0));
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
          tutorDemandQuerySql = sql;
          return List.of(rowMapper.mapRow(resultSet(Map.ofEntries(
              Map.entry("address_label", "教学地址"),
              Map.entry("budget", "按小时结算"),
              Map.entry("child", "孩子"),
              Map.entry("description", "需求说明"),
              Map.entry("id", 1L),
              Map.entry("period_dates", ""),
              Map.entry("planned_dates", "2099-09-06、2099-09-08"),
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
        if (studentOngoing && sql.contains("FROM tutor_applicant ta")) {
          studentOngoingQuerySql = sql;
          return List.of(rowMapper.mapRow(resultSet(Map.ofEntries(
              Map.entry("address_label", "教学地址"),
              Map.entry("availability", ""),
              Map.entry("budget", "按小时结算"),
              Map.entry("child", "孩子"),
              Map.entry("demand_public_id", "TD-1"),
              Map.entry("demand_status", "RECRUITING"),
              Map.entry("description", "需求说明"),
              Map.entry("parent_nickname", "家长"),
              Map.entry("parent_phone", "18000000000"),
              Map.entry("period_dates", "2099-09-01、2099-09-06"),
              Map.entry("period_end", "2099-09-30"),
              Map.entry("period_start", "2099-09-01"),
              Map.entry("public_id", "TA-1"),
              Map.entry("school", "学校"),
              Map.entry("service_schedule", ""),
              Map.entry("status", "TRIAL_CONFIRMING"),
              Map.entry("subject", "math"),
              Map.entry("tested_dates", testedDatesJson),
              Map.entry("title", "数学家教"),
              Map.entry("trial_fee_cents", 0L),
              Map.entry("trial_schedule", trialSchedule)
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

    private String applicantUpdateSql() {
      return applicantUpdateSql;
    }

    private Object[] applicantUpdateArgs() {
      return applicantUpdateArgs;
    }

    private Object[] scheduleUpdateArgs() {
      return scheduleUpdateArgs;
    }

    private String scheduleUpdateSql() {
      return scheduleUpdateSql;
    }

    private String studentOngoingQuerySql() {
      return studentOngoingQuerySql;
    }

    private String tutorDemandQuerySql() {
      return tutorDemandQuerySql;
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
          if ("getInt".equals(methodName)) {
            Object value = values.get(String.valueOf(args[0]));
            return value instanceof Number number ? number.intValue() : 0;
          }
          if ("getBoolean".equals(methodName)) {
            Object value = values.get(String.valueOf(args[0]));
            return value instanceof Boolean bool && bool;
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
