package com.unknown.platform.modules.clienthome.model;

/** 首页模块入口卡片，用于驱动不同角色的主导航和快捷入口展示。 */
public record ModuleCard(
    String key,
    String title,
    String description,
    String action,
    String priority
) {
}
