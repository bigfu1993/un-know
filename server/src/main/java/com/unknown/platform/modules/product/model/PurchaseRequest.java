package com.unknown.platform.modules.product.model;

import com.unknown.platform.modules.auth.model.ClientRole;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 商品购买请求，后端根据商品配置重新计算应付金额，前端金额仅作展示。 */
public record PurchaseRequest(
    @NotBlank String productId,
    @NotNull ClientRole role,
    @NotNull DeliveryMode deliveryMode,
    @NotNull PaymentMethod paymentMethod,
    @Min(1) int quantity
) {
}
