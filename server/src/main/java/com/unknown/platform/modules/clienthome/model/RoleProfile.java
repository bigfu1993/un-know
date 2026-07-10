package com.unknown.platform.modules.clienthome.model;

import com.unknown.platform.modules.auth.model.ClientRole;

public record RoleProfile(
    ClientRole role,
    String name,
    String label,
    int creditScore,
    String balanceText,
    String accountStatus
) {
}

