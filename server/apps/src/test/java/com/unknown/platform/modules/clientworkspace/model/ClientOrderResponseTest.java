package com.unknown.platform.modules.clientworkspace.model;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.ClientOrder;
import com.unknown.platform.modules.clientworkspace.model.ClientWorkspaceResponse.TutorDemand;
import java.util.List;
import org.junit.jupiter.api.Test;

/** 进行中家教订单的计划日期响应字段契约测试。 */
class ClientOrderResponseTest {

  @Test
  void serializesTutorPlanDatesAsPlannedDates() {
    TutorDemand demand = new TutorDemand(
        "TD1",
        "孩子",
        "数学",
        "学校",
        "200元/小时",
        "RECRUITING",
        "数学家教",
        "补充信息",
        "授课地址",
        "2026-09-06 至 2026-09-08",
        List.of("2026-09-06", "2026-09-08"),
        new UserNickname("家长", ""),
        "tutorDemand",
        List.of()
    );
    ClientOrder order = ClientOrder.builder()
        .id("TD1")
        .role(ClientRole.parent)
        .plannedDates(List.of("2026-09-06", "2026-09-08"))
        .tutorDemand(demand)
        .build();

    JsonNode response = new ObjectMapper().valueToTree(order);

    assertThat(response.path("plannedDates").get(0).asText()).isEqualTo("2026-09-06");
    assertThat(response.path("tutorDemand").path("plannedDates").get(1).asText()).isEqualTo("2026-09-08");
    assertThat(response.findValue("periodDates")).isNull();
  }
}
