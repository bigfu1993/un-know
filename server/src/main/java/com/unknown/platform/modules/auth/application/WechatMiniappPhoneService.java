package com.unknown.platform.modules.auth.application;

import com.unknown.platform.common.exception.BusinessException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Service
public class WechatMiniappPhoneService {
  private static final String ACCESS_TOKEN_URL =
      "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={appId}&secret={appSecret}";
  private static final String PHONE_NUMBER_URL =
      "https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token={accessToken}";

  private final RestClient restClient;
  private final String appId;
  private final String appSecret;

  public WechatMiniappPhoneService(
      RestClient.Builder restClientBuilder,
      @Value("${unknown.wechat.miniapp.app-id:}") String appId,
      @Value("${unknown.wechat.miniapp.app-secret:}") String appSecret
  ) {
    this.restClient = restClientBuilder.build();
    this.appId = appId;
    this.appSecret = appSecret;
  }

  public String getPhoneNumber(String phoneCode) {
    if (!StringUtils.hasText(appId) || !StringUtils.hasText(appSecret)) {
      throw new BusinessException("WECHAT_MINIAPP_NOT_CONFIGURED", "未配置微信小程序一键登录参数");
    }

    String accessToken = getAccessToken();
    Map<String, Object> response = restClient.post()
        .uri(PHONE_NUMBER_URL, accessToken)
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("code", phoneCode))
        .retrieve()
        .body(new ParameterizedTypeReference<>() {
        });

    assertWechatSuccess(response, "WECHAT_PHONE_FAILED", "微信手机号授权失败");
    Object phoneInfo = response == null ? null : response.get("phone_info");
    if (!(phoneInfo instanceof Map<?, ?> phoneInfoMap)) {
      throw new BusinessException("WECHAT_PHONE_EMPTY", "微信未返回手机号信息");
    }

    Object phoneNumber = phoneInfoMap.get("purePhoneNumber");
    if (phoneNumber == null) {
      phoneNumber = phoneInfoMap.get("phoneNumber");
    }
    if (phoneNumber instanceof String phone && StringUtils.hasText(phone)) {
      return phone;
    }
    throw new BusinessException("WECHAT_PHONE_EMPTY", "微信未返回手机号信息");
  }

  private String getAccessToken() {
    Map<String, Object> response = restClient.get()
        .uri(ACCESS_TOKEN_URL, appId, appSecret)
        .retrieve()
        .body(new ParameterizedTypeReference<>() {
        });

    assertWechatSuccess(response, "WECHAT_TOKEN_FAILED", "微信 access_token 获取失败");
    Object accessToken = response == null ? null : response.get("access_token");
    if (accessToken instanceof String token && StringUtils.hasText(token)) {
      return token;
    }
    throw new BusinessException("WECHAT_TOKEN_EMPTY", "微信未返回 access_token");
  }

  private void assertWechatSuccess(Map<String, Object> response, String code, String message) {
    if (response == null) {
      throw new BusinessException(code, message);
    }
    Object errCode = response.get("errcode");
    if (errCode == null || "0".equals(String.valueOf(errCode))) {
      return;
    }
    Object errMsg = response.get("errmsg");
    throw new BusinessException(code, message + "：" + errMsg);
  }
}
