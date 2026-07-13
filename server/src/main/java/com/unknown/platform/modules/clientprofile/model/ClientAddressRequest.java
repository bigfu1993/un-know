package com.unknown.platform.modules.clientprofile.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 客户端地址保存请求，承接注册补充、首页补充和设置页地址管理三个入口。
 */
public record ClientAddressRequest(
    @NotBlank(message = "联系人姓名不能为空")
    @Size(max = 80, message = "联系人姓名不能超过 80 个字符")
    String contactName,

    @NotBlank(message = "常用区域不能为空")
    @Size(max = 120, message = "常用区域不能超过 120 个字符")
    String campusArea,

    @NotBlank(message = "楼栋楼层不能为空")
    @Size(max = 120, message = "楼栋楼层不能超过 120 个字符")
    String buildingFloor,

    @NotBlank(message = "收货地址不能为空")
    @Size(max = 240, message = "收货地址不能超过 240 个字符")
    String deliveryAddress,

    @NotBlank(message = "联系电话不能为空")
    @Size(max = 32, message = "联系电话不能超过 32 个字符")
    String contactPhone,

    Boolean isCurrent
) {
}
