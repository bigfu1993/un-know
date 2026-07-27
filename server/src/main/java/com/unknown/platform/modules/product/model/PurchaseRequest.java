package com.unknown.platform.modules.product.model;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 商品购买请求，用户角色与下单人统一从登录请求头解析。 */
public record PurchaseRequest(
    @NotBlank String productId,
    @NotNull DeliveryMode deliveryMode,
    @NotNull PaymentMethod paymentMethod,
    @Min(1) int quantity
) {
}
