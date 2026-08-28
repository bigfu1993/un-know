package com.unknown.platform.modules.clientprofile.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.common.api.ScheduleTimeTemplate;
import com.unknown.platform.common.api.UserNickname;
import com.unknown.platform.common.security.ClientRequestContext;
import com.unknown.platform.modules.clientprofile.application.ClientProfileAppService;
import com.unknown.platform.modules.clientprofile.model.ClientAddressRequest;
import com.unknown.platform.modules.clientprofile.model.ClientAddressResponse;
import com.unknown.platform.modules.clientprofile.model.SubmitHuntingCertificationRequest;
import com.unknown.platform.modules.clientprofile.model.SubmitHuntingCertificationResponse;
import com.unknown.platform.modules.clientprofile.model.SubmitTutorCertificationRequest;
import com.unknown.platform.modules.clientprofile.model.SubmitTutorCertificationResponse;
import com.unknown.platform.modules.clientprofile.model.TutorExposureResponse;
import com.unknown.platform.modules.clientprofile.model.UpdateNicknameRequest;
import com.unknown.platform.modules.clientprofile.model.UpdateTutorExposureRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 客户端个人资料接口，提供登录后的认证资料和地址簿管理能力。
 */
@RestController
@RequestMapping("/client/profile")
public class ClientProfileController {
  private final ClientProfileAppService clientProfileAppService;

  public ClientProfileController(ClientProfileAppService clientProfileAppService) {
    this.clientProfileAppService = clientProfileAppService;
  }

  /**
   * 修改当前登录用户昵称。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param request 昵称请求
   * @return 最新用户昵称快照
   */
  @PutMapping("/nickname")
  public ApiResponse<UserNickname> updateNickname(ClientRequestContext context, @Valid @RequestBody UpdateNicknameRequest request) {
    return ApiResponse.ok(clientProfileAppService.updateNickname(context.authorization(), request));
  }

  /**
   * 更新当前登录用户的可排期时间模板。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param templateJson 时间模板原始 JSON
   * @return 已保存的时间模板
   */
  @PutMapping("/schedule-time-template")
  public ApiResponse<ScheduleTimeTemplate> updateScheduleTimeTemplate(
      ClientRequestContext context,
      @RequestBody String templateJson
  ) {
    return ApiResponse.ok(
        clientProfileAppService.updateScheduleTimeTemplate(
            context.authorization(),
            ScheduleTimeTemplateRequestParser.parse(templateJson)
        )
    );
  }

  /**
   * 查询当前登录账号的地址列表。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @return 地址列表
   */
  @GetMapping("/addresses")
  public ApiResponse<List<ClientAddressResponse>> listAddresses(ClientRequestContext context) {
    return ApiResponse.ok(clientProfileAppService.listAddresses(context.authorization()));
  }

  /**
   * 新增地址，首个地址会自动成为当前使用地址。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param request 地址表单
   * @return 新增后的地址
   */
  @PostMapping("/addresses")
  public ApiResponse<ClientAddressResponse> createAddress(ClientRequestContext context, @Valid @RequestBody ClientAddressRequest request) {
    return ApiResponse.ok(clientProfileAppService.createAddress(context.authorization(), request));
  }

  /**
   * 编辑指定地址。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param addressId 地址对外 ID
   * @param request 地址表单
   * @return 编辑后的地址
   */
  @PutMapping("/addresses/{addressId}")
  public ApiResponse<ClientAddressResponse> updateAddress(
      ClientRequestContext context,
      @PathVariable String addressId,
      @Valid @RequestBody ClientAddressRequest request
  ) {
    return ApiResponse.ok(clientProfileAppService.updateAddress(context.authorization(), addressId, request));
  }

  /**
   * 将指定地址设为当前使用地址。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param addressId 地址对外 ID
   * @return 切换后的地址列表
   */
  @PostMapping("/addresses/{addressId}/current")
  public ApiResponse<List<ClientAddressResponse>> useAddress(ClientRequestContext context, @PathVariable String addressId) {
    return ApiResponse.ok(clientProfileAppService.useAddress(context.authorization(), addressId));
  }

  /**
   * 删除指定地址。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param addressId 地址对外 ID
   * @return 删除后的地址列表
   */
  @DeleteMapping("/addresses/{addressId}")
  public ApiResponse<List<ClientAddressResponse>> deleteAddress(ClientRequestContext context, @PathVariable String addressId) {
    return ApiResponse.ok(clientProfileAppService.deleteAddress(context.authorization(), addressId));
  }

  /**
   * 切换家教资料公开状态，开启后家长端可以看到该学生的家教信息。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param request 开关状态
   * @return 最新开关状态
   */
  @PutMapping("/tutor-exposure")
  public ApiResponse<TutorExposureResponse> updateTutorExposure(ClientRequestContext context, @RequestBody UpdateTutorExposureRequest request) {
    return ApiResponse.ok(clientProfileAppService.updateTutorExposure(context.authorization(), request));
  }

  /**
   * 提交狩猎认证资料，成功后账号进入审核中状态。
   *
   * @param context 客户端请求上下文（角色 + 登录令牌）
   * @param request 狩猎认证资料
   * @return 狩猎认证审核状态
   */
  @PostMapping("/hunting-certification")
  public ApiResponse<SubmitHuntingCertificationResponse> submitHuntingCertification(
      ClientRequestContext context,
      @Valid @RequestBody SubmitHuntingCertificationRequest request
  ) {
    return ApiResponse.ok(clientProfileAppService.submitHuntingCertification(context.authorization(), request));
  }

  @PostMapping("/tutor-certification")
  public ApiResponse<SubmitTutorCertificationResponse> submitTutorCertification(
      ClientRequestContext context,
      @Valid @RequestBody SubmitTutorCertificationRequest request
  ) {
    return ApiResponse.ok(clientProfileAppService.submitTutorCertification(context.authorization(), request));
  }
}
