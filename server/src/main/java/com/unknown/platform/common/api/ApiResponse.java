package com.unknown.platform.common.api;

/** 后端统一响应包裹结构，保证 H5、小程序和管理端使用一致的 code/message/data/requestId 协议。 */
public record ApiResponse<T>(String code, String message, T data, String requestId) {

  /**
   * 构造成功响应。
   *
   * @param data 响应数据
   * @return 统一成功响应
   */
  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>("OK", "success", data, RequestIds.current());
  }

  /**
   * 构造失败响应。
   *
   * @param code 稳定错误码
   * @param message 面向前端展示的错误信息
   * @return 统一失败响应
   */
  public static <T> ApiResponse<T> error(String code, String message) {
    return new ApiResponse<>(code, message, null, RequestIds.current());
  }
}
