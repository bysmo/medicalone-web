package com.altes.alphacure.patient.security;

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
 * Fournit le contexte clinique (clinic_id) depuis :
 *  1. Le claim "clinic_id" du JWT Keycloak (source de vérité principale)
 *  2. L'en-tête X-Clinic-Id UNIQUEMENT s'il est injecté par le Gateway
 *     (le Gateway retire tout X-Clinic-Id entrant avant d'injecter le sien
 *      depuis le JWT vérifié → ce mécanisme est sûr contre le spoofing)
 *
 * En cas d'absence du contexte : AccessDeniedException (HTTP 403).
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
            UUID clinicId = ClinicIdClaimResolver.resolveClinicId(jwt);
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

    public String getUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return jwt.getClaimAsString("preferred_username");
        }
        return null;
    }

    public int getAccessLevel() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            Object level = jwt.getClaim("access_level");
            if (level instanceof Number num) return num.intValue();
            if (level instanceof String s) {
                try { return Integer.parseInt(s); } catch (NumberFormatException ignored) {}
            }
        }
        return 0;
    }
}
