package com.unknown.platform.modules.clientprofile.controller.client;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unknown.platform.common.api.ScheduleTimeTemplate;
import com.unknown.platform.common.exception.GlobalExceptionHandler;
import com.unknown.platform.common.security.ClientRequestContext;
import com.unknown.platform.common.security.ClientSessionService;
import com.unknown.platform.modules.auth.model.ClientRole;
import com.unknown.platform.modules.clientprofile.application.ClientProfileAppService;
import com.unknown.platform.modules.clientprofile.application.ScheduleTimeTemplatePolicy;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.jdbc.core.JdbcTemplate;

class ClientProfileControllerTest {
  private ClientProfileAppService clientProfileAppService;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    clientProfileAppService = new StrictTemplateClientProfileAppService();
    mockMvc = MockMvcBuilders
        .standaloneSetup(new ClientProfileController(clientProfileAppService))
        .setControllerAdvice(new GlobalExceptionHandler())
        .setCustomArgumentResolvers(new ClientRequestContextResolver())
        .build();
  }

  /** 只执行时间模板核心 policy，避免 controller 边界测试依赖数据库或 mocking agent。 */
  private static final class StrictTemplateClientProfileAppService extends ClientProfileAppService {
    private StrictTemplateClientProfileAppService() {
      super(new JdbcTemplate(), new ClientSessionService(new JdbcTemplate()), new ObjectMapper());
    }

    @Override
    public ScheduleTimeTemplate updateScheduleTimeTemplate(String authorization, ScheduleTimeTemplate template) {
      ScheduleTimeTemplatePolicy.validateForSave(template);
      return template;
    }
  }

  @Test
  void acceptsStrictScheduleTimeTemplateJson() throws Exception {
    mockMvc.perform(put("/client/profile/schedule-time-template")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"morning":{"start":"08:30","end":"11:20"}}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.morning.start").value("08:30"))
        .andExpect(jsonPath("$.data.morning.end").value("11:20"));
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("invalidScheduleTimeTemplateJson")
  void rejectsInvalidScheduleTimeTemplateJsonWithStableError(String ignoredName, String payload) throws Exception {
    mockMvc.perform(put("/client/profile/schedule-time-template")
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("SCHEDULE_TIME_TEMPLATE_INVALID"))
        .andExpect(jsonPath("$.message").value("时间模板格式不正确"));
  }

  private static Stream<Arguments> invalidScheduleTimeTemplateJson() {
    return Stream.of(
        Arguments.of("未知顶层键", "{\"morning\":{\"start\":\"08:30\",\"end\":\"11:20\"},\"night\":{\"start\":\"20:00\",\"end\":\"21:00\"}}"),
        Arguments.of("未知 range 键", "{\"morning\":{\"start\":\"08:30\",\"end\":\"11:20\",\"label\":\"上午\"}}"),
        Arguments.of("缺少 start", "{\"morning\":{\"end\":\"11:20\"}}"),
        Arguments.of("缺少 end", "{\"morning\":{\"start\":\"08:30\"}}"),
        Arguments.of("空 range", "{\"morning\":{}}"),
        Arguments.of("空模板", "{}"),
        Arguments.of("顶层数组", "[]"),
        Arguments.of("顶层字符串", "\"morning\""),
        Arguments.of("range 数组", "{\"morning\":[]}"),
        Arguments.of("时间错误类型", "{\"morning\":{\"start\":830,\"end\":\"11:20\"}}"),
        Arguments.of("错误 JSON", "{\"morning\":{\"start\":\"08:30\",\"end\":\"11:20\"}")
    );
  }

  private static final class ClientRequestContextResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
      return parameter.getParameterType() == ClientRequestContext.class;
    }

    @Override
    public Object resolveArgument(
        MethodParameter parameter,
        ModelAndViewContainer mavContainer,
        NativeWebRequest webRequest,
        WebDataBinderFactory binderFactory
    ) {
      return new ClientRequestContext(ClientRole.parent, "Bearer parent");
    }
  }
}
