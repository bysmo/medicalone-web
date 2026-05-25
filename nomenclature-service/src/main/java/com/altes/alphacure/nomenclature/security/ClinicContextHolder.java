package com.altes.alphacure.nomenclature.security;

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

@Component
@RequiredArgsConstructor
@Slf4j
public class ClinicContextHolder {

    // Constante pour le header interne (si utilisé par la Gateway)
    private static final String HEADER_CLINIC_ID = "X-Clinic-Id";

    /**
     * Récupère l'ID de la clinique.
     * Priorité : JWT (Source de vérité) > Header (Injecté par Gateway sécurisée).
     */
    public UUID getClinicId() {
        // 1. Essayer de récupérer depuis le JWT (Le plus sécurisé)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            UUID clinicId = ClinicIdClaimResolver.resolveClinicId(jwt);
            if (clinicId != null) {
                log.debug("[ClinicContextHolder] clinic_id résolu depuis JWT: {} (sub={})",
                        clinicId, jwt.getClaimAsString("sub"));
                return clinicId;
            }
            // JWT présent mais clinic_id absent — log les claims disponibles pour diagnostic
            log.warn("[ClinicContextHolder] JWT valide mais clinic_id ABSENT. sub={}, claims disponibles={}",
                    jwt.getClaimAsString("sub"),
                    jwt.getClaims().keySet());
        } else {
            log.warn("[ClinicContextHolder] Aucun JWT dans le SecurityContext. auth={}", auth);
        }

        // 2. Fallback : Header injecté par la Gateway (À utiliser avec prudence)
        // Note: Assurez-vous que votre Gateway supprime ce header s'il vient du client
        // externe
        HttpServletRequest request = getCurrentRequest();
        if (request != null) {
            String headerClinicId = request.getHeader(HEADER_CLINIC_ID);
            if (headerClinicId != null && !headerClinicId.isBlank()) {
                log.warn("[ClinicContextHolder] Récupération du Clinic ID via Header X-Clinic-Id: {}. Assurez-vous que ce header est trustworthy.", headerClinicId);
                return UUID.fromString(headerClinicId);
            }
        }

        throw new AccessDeniedException("Contexte clinique introuvable. Accès refusé.");
    }

    // Méthode utilitaire propre pour récupérer la requête courante
    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return (attributes != null) ? attributes.getRequest() : null;
    }
}