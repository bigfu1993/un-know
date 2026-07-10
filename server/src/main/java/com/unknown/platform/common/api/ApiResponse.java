package com.unknown.platform.common.api;

public record ApiResponse<T>(String code, String message, T data, String requestId) {

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>("OK", "success", data, RequestIds.current());
  }

  public static <T> ApiResponse<T> error(String code, String message) {
    return new ApiResponse<>(code, message, null, RequestIds.current());
  }
}

