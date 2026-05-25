package com.altes.alphacure.clinic.config;

import feign.RequestInterceptor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Configuration Feign — Propagation automatique du JWT entre microservices.
 *
 * Lorsque clinic-service appelle patient-service ou nomenclature-service,
 * le token JWT de l'utilisateur courant est automatiquement injecté dans
 * l'en-tête Authorization de la requête sortante.
 *
 * Cela garantit que le service cible peut :
 *  - Vérifier l'authentification (anyRequest().authenticated())
 *  - Extraire clinic_id depuis le JWT (cloisonnement garanti)
 *  - Appliquer les @PreAuthorize basés sur les rôles
 */
@Configuration
@Slf4j
public class FeignSecurityConfig {

    @Bean
    public RequestInterceptor jwtFeignRequestInterceptor() {
        return requestTemplate -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                String token = jwtAuth.getToken().getTokenValue();
                requestTemplate.header("Authorization", "Bearer " + token);
                log.debug("[Feign] JWT propagé vers : {}", requestTemplate.url());
            } else {
                log.error("[Feign] Aucun JWT disponible pour la requête vers : {}", requestTemplate.url());
                throw new IllegalStateException(
                        "JWT requis pour les appels inter-services (provisionnement clinique). Reconnectez-vous en SUPER_ADMIN.");
            }
        };
    }
}
