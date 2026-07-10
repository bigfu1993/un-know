package com.unknown.platform.modules.product.model;

import java.math.BigDecimal;
import java.util.List;

public record ProductSummary(
    String id,
    String title,
    String category,
    String source,
    String model,
    String description,
    BigDecimal price,
    BigDecimal retailPrice,
    BigDecimal serviceFee,
    int stock,
    String location,
    String urgency,
    List<DeliveryMode> deliveryModes
) {
}
