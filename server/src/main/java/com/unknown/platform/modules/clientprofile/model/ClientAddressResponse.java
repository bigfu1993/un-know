package com.unknown.platform.modules.clientprofile.model;

/**
 * 客户端地址响应，字段命名与 H5 地址表单草稿保持一致，方便直接映射展示。
 */
public record ClientAddressResponse(
    String id,
    String contactName,
    String campusArea,
    String buildingFloor,
    String deliveryAddress,
    String contactPhone,
    boolean isCurrent,
    String createdAt,
    String updatedAt
) {
}
