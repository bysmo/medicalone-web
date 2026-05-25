package com.altes.alphacure.clinic.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;

@Component
@Slf4j
public class ClinicSecurityContext {
    public static UUID getClinicId() {
        // 1. JWT — source de vérité absolue
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            UUID clinicId = resolveClinicId(jwt);
            if (clinicId != null) {
                log.debug("[MedicalRecord] clinic_id extrait du JWT : {}", clinicId);
                return clinicId;
            }
        }
        // 2. Header injecté par le Gateway (fiable car nettoyé en entrée par le
        // Gateway)
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        HttpServletRequest request = attributes != null ? attributes.getRequest() : null;
        String headerClinicId = request != null ? request.getHeader("X-Clinic-Id") : null;
        if (headerClinicId != null && !headerClinicId.isBlank()) {
            log.debug("[MedicalRecord] clinic_id extrait du header Gateway : {}", headerClinicId);
            return UUID.fromString(headerClinicId);
        }
        log.error("[MedicalRecord] Aucun clinic_id trouvé — accès refusé");
        throw new AccessDeniedException("Contexte clinique introuvable. Accès refusé.");
    }

    public static UUID getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("user_id");
            if (userId != null) {
                return UUID.fromString(userId);
            }
        }
        return null;
    }

    public static int getAccessLevel() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            Object level = jwt.getClaim("access_level");
            if (level instanceof Number num) {
                return num.intValue();
            } else if (level instanceof String str) {
                try {
                    return Integer.parseInt(str);
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return 0;
    }

    public static boolean hasContext() {
        try {
            return getClinicId() != null;
        } catch (Exception e) {
            return false;
        }
    }

    private static UUID resolveClinicId(Jwt jwt) {
        if (jwt == null) {
            return null;
        }
        Object claim = jwt.getClaim("clinic_id");
        if (claim == null) {
            return null;
        }
        String raw = null;
        if (claim instanceof String s) {
            raw = s.isBlank() ? null : s.trim();
        } else if (claim instanceof java.util.List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            raw = first == null ? null : first.toString().trim();
        } else {
            String asString = claim.toString().trim();
            raw = asString.isEmpty() ? null : asString;
        }
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
