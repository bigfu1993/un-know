package com.unknown.platform.modules.product.model;

import java.math.BigDecimal;

/** 商品购买结果，返回订单号、金额拆分和当前订单状态供前端直接展示。 */
public record PurchaseResponse(
    String orderId,
    String productId,
    String status,
    int quantity,
    BigDecimal productAmount,
    BigDecimal serviceFee,
    BigDecimal deliveryFee,
    BigDecimal payableAmount,
    DeliveryMode deliveryMode,
    PaymentMethod paymentMethod,
    String contactPhone,
    String message
) {
}
