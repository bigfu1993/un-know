package com.unknown.platform.common.api;

import java.util.UUID;

/** 请求标识生成器，用于接口响应和后续日志链路关联。 */
public final class RequestIds {
  private RequestIds() {
  }

  /**
   * 生成当前响应使用的请求标识。
   *
   * @return req_ 前缀的随机请求标识
   */
  public static String current() {
    return "req_" + UUID.randomUUID();
  }
}
