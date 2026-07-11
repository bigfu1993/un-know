package com.unknown.platform.modules.auth.model;

import jakarta.validation.constraints.NotNull;

public record SelectRoleRequest(
    @NotNull ClientRole role
) {
}
