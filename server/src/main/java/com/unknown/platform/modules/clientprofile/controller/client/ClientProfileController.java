package com.unknown.platform.modules.clientprofile.controller.client;

import com.unknown.platform.common.api.ApiResponse;
import com.unknown.platform.modules.clientprofile.application.ClientProfileAppService;
import com.unknown.platform.modules.clientprofile.model.ClientAddressRequest;
import com.unknown.platform.modules.clientprofile.model.ClientAddressResponse;
import com.unknown.platform.modules.clientprofile.model.SubmitHuntingCertificationRequest;
import com.unknown.platform.modules.clientprofile.model.SubmitHuntingCertificationResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 客户端个人资料接口，提供登录后的认证资料和地址簿管理能力。
 */
@RestController
@RequestMapping("/api/client/profile")
public class ClientProfileController {
  private final ClientProfileAppService clientProfileAppService;

  public ClientProfileController(ClientProfileAppService clientProfileAppService) {
    this.clientProfileAppService = clientProfileAppService;
  }

  /**
   * 查询当前登录账号的地址列表。
   *
   * @param authorization 登录访问令牌
   * @return 地址列表
   */
  @GetMapping("/addresses")
  public ApiResponse<List<ClientAddressResponse>> listAddresses(
      @RequestHeader(value = "Authorization", required = false) String authorization
  ) {
    return ApiResponse.ok(clientProfileAppService.listAddresses(authorization));
  }

  /**
   * 新增地址，首个地址会自动成为当前使用地址。
   *
   * @param authorization 登录访问令牌
   * @param request 地址表单
   * @return 新增后的地址
   */
  @PostMapping("/addresses")
  public ApiResponse<ClientAddressResponse> createAddress(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody ClientAddressRequest request
  ) {
    return ApiResponse.ok(clientProfileAppService.createAddress(authorization, request));
  }

  /**
   * 编辑指定地址。
   *
   * @param authorization 登录访问令牌
   * @param addressId 地址对外 ID
   * @param request 地址表单
   * @return 编辑后的地址
   */
  @PutMapping("/addresses/{addressId}")
  public ApiResponse<ClientAddressResponse> updateAddress(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String addressId,
      @Valid @RequestBody ClientAddressRequest request
  ) {
    return ApiResponse.ok(clientProfileAppService.updateAddress(authorization, addressId, request));
  }

  /**
   * 将指定地址设为当前使用地址。
   *
   * @param authorization 登录访问令牌
   * @param addressId 地址对外 ID
   * @return 切换后的地址列表
   */
  @PostMapping("/addresses/{addressId}/current")
  public ApiResponse<List<ClientAddressResponse>> useAddress(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String addressId
  ) {
    return ApiResponse.ok(clientProfileAppService.useAddress(authorization, addressId));
  }

  /**
   * 删除指定地址。
   *
   * @param authorization 登录访问令牌
   * @param addressId 地址对外 ID
   * @return 删除后的地址列表
   */
  @DeleteMapping("/addresses/{addressId}")
  public ApiResponse<List<ClientAddressResponse>> deleteAddress(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @PathVariable String addressId
  ) {
    return ApiResponse.ok(clientProfileAppService.deleteAddress(authorization, addressId));
  }

  /**
   * 提交狩猎认证资料，成功后账号进入审核中状态。
   *
   * @param authorization 登录访问令牌
   * @param request 狩猎认证资料
   * @return 狩猎认证审核状态
   */
  @PostMapping("/hunting-certification")
  public ApiResponse<SubmitHuntingCertificationResponse> submitHuntingCertification(
      @RequestHeader(value = "Authorization", required = false) String authorization,
      @Valid @RequestBody SubmitHuntingCertificationRequest request
  ) {
    return ApiResponse.ok(clientProfileAppService.submitHuntingCertification(authorization, request));
  }
}
