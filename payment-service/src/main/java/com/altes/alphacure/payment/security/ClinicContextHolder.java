package com.altes.alphacure.payment.security;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

/**
 * Fournit le contexte clinique (clinic_id) depuis le JWT ou
 * le header X-Clinic-Id injecté par le Gateway (sécurisé, anti-spoofing).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClinicContextHolder {

    private static final String HEADER_CLINIC_ID = "X-Clinic-Id";

    public UUID getClinicId() {
        // 1. Essayer de récupérer depuis le JWT (Le plus sécurisé)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            UUID clinicId = resolveClinicId(jwt);
            if (clinicId != null) {
                return clinicId;
            }
        }

        // 2. Fallback : Header injecté par la Gateway (À utiliser avec prudence)
        // Note: Assurez-vous que votre Gateway supprime ce header s'il vient du client
        // externe
        HttpServletRequest request = getCurrentRequest();
        if (request != null) {
            String headerClinicId = request.getHeader(HEADER_CLINIC_ID);
            if (headerClinicId != null && !headerClinicId.isBlank()) {
                log.warn("Récupération du Clinic ID via Header. Assurez-vous que ce header est trustworthy.");
                return UUID.fromString(headerClinicId);
            }
        }

        throw new AccessDeniedException("Contexte clinique introuvable. Accès refusé.");
    }

    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return (attributes != null) ? attributes.getRequest() : null;
    }

    public UUID getUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            String userId = jwt.getClaimAsString("sub");
            return userId != null ? UUID.fromString(userId) : null;
        }
        return null;
    }

    private UUID resolveClinicId(Jwt jwt) {
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
