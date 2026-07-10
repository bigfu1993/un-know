package com.unknown.platform.common.api;

import java.util.UUID;

public final class RequestIds {
  private RequestIds() {
  }

  public static String current() {
    return "req_" + UUID.randomUUID();
  }
}

