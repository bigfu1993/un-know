package com.unknown.platform.modules.clienthome.model;

import java.util.List;

public record ClientHomeResponse(
    RoleProfile profile,
    List<ModuleCard> modules,
    List<String> alerts
) {
}

