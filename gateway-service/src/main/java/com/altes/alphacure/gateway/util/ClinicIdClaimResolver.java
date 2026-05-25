package com.altes.alphacure.gateway.util;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

public final class ClinicIdClaimResolver {

    private ClinicIdClaimResolver() {
    }

    public static String extractClinicIdString(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        Object claim = jwt.getClaim("clinic_id");
        if (claim == null) {
            return null;
        }
        if (claim instanceof String s) {
            return s.isBlank() ? null : s.trim();
        }
        if (claim instanceof List<?> list && !list.isEmpty()) {
            Object first = list.getFirst();
            return first == null ? null : first.toString().trim();
        }
        String asString = claim.toString().trim();
        return asString.isEmpty() ? null : asString;
    }
}
