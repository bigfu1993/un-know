package com.unknown.platform.modules.product.model;

import java.math.BigDecimal;

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
