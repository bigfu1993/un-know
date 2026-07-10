package com.unknown.platform.modules.product.model;

import com.unknown.platform.modules.auth.model.ClientRole;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PurchaseRequest(
    @NotBlank String productId,
    @NotNull ClientRole role,
    @NotNull DeliveryMode deliveryMode,
    @NotNull PaymentMethod paymentMethod,
    @Min(1) int quantity
) {
}
