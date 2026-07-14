package com.unknown.platform.modules.clienthome.model;

import com.unknown.platform.modules.auth.model.ClientRole;

/** 当前登录角色的账户摘要，供首页头像浮层和账户卡片展示。 */
public record RoleProfile(
    ClientRole role,
    String name,
    String label,
    int creditScore,
    String balanceText,
    String accountStatus,
    String tutorCertificationStatus,
    String huntingCertificationStatus,
    boolean tutorExposureEnabled
) {
}
