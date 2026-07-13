package com.unknown.platform.modules.product.model;

import java.math.BigDecimal;
import java.util.List;

/** 优选商品列表项，包含价格、库存、服务费和可选配送方式。 */
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
