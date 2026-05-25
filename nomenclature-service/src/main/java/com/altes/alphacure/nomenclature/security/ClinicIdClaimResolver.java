package com.altes.alphacure.nomenclature.security;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.UUID;

public final class ClinicIdClaimResolver {

    private ClinicIdClaimResolver() {
    }

    public static UUID resolveClinicId(Jwt jwt) {
        String raw = extractClinicIdString(jwt);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return UUID.fromString(raw);
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
