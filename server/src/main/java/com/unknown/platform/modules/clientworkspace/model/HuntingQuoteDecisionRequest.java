package com.unknown.platform.modules.clientworkspace.model;

import java.math.BigDecimal;

/** 委托报价协商处理请求体，用于确认、拒绝或改价后推送给对方确认。 */
public record HuntingQuoteDecisionRequest(
    String action,
    BigDecimal amount
) {
}
