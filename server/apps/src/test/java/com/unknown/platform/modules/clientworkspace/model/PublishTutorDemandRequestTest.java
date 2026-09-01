package com.unknown.platform.modules.clientworkspace.model;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 家教发布请求的计划日期字段契约测试。 */
class PublishTutorDemandRequestTest {

  @Test
  void serializesTutorPlanDatesAsPlannedDates() {
    PublishTutorDemandRequest request = new PublishTutorDemandRequest(
        "数学家教",
        "补充信息",
        "math",
        "ADDR1",
        "授课地址",
        "CHILD1",
        "孩子",
        "2026-09-06",
        "2026-09-08",
        List.of("2026-09-06", "2026-09-08"),
        true,
        "",
        new BigDecimal("100"),
        "hourly",
        List.of(),
        ""
    );

    JsonNode payload = new ObjectMapper().valueToTree(request);

    assertThat(payload.path("plannedDates").get(0).asText()).isEqualTo("2026-09-06");
    assertThat(payload.findValue("periodDates")).isNull();
  }

  @Test
  void rejectsTutorDemandWithoutPlannedDates() {
    PublishTutorDemandRequest request = new PublishTutorDemandRequest(
        "数学家教",
        "补充信息",
        "math",
        "ADDR1",
        "授课地址",
        "CHILD1",
        "孩子",
        "2026-09-06",
        "2026-09-08",
        List.of(),
        true,
        "",
        new BigDecimal("100"),
        "hourly",
        List.of(),
        ""
    );

    try (var validatorFactory = Validation.buildDefaultValidatorFactory()) {
      assertThat(validatorFactory.getValidator().validate(request))
          .anyMatch((violation) -> violation.getPropertyPath().toString().equals("plannedDates"));
    }
  }
}
