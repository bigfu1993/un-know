package com.unknown.platform.common.exception;

/** 可预期业务异常，携带稳定错误码供前端展示和后续埋点统计。 */
public class BusinessException extends RuntimeException {
  private final String code;

  public BusinessException(String code, String message) {
    super(message);
    this.code = code;
  }

  /**
   * 获取前端和日志可稳定识别的业务错误码。
   *
   * @return 业务错误码
   */
  public String code() {
    return code;
  }
}
