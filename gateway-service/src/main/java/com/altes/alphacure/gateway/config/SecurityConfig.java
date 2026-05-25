package com.altes.alphacure.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Configuration de sécurité du Gateway.
 *
 * Règles :
 *  - /api/v1/auth/**             → public (login, refresh token)
 *  - /api/v1/clinics/register    → public (inscription clinique)
 *  - /actuator/health            → public (liveness / readiness)
 *  - Tout le reste               → JWT Keycloak obligatoire
 *
 * Le filtre ClinicContextGatewayFilter (ordre -100) s'exécute APRÈS
 * l'authentification et injecte X-Clinic-Id / X-User-Id depuis le JWT vérifié,
 * après avoir retiré ces en-têtes des requêtes entrantes (anti-spoofing).
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .cors(Customizer.withDefaults())
            .authorizeExchange(exchanges -> exchanges
                .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // ── Routes publiques ────────────────────────────────────────
                .pathMatchers(
                    "/api/v1/auth/login",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/token",
                    "/api/v1/clinics/register",
                    "/actuator/health",
                    "/actuator/info"
                ).permitAll()
                // ── SuperAdmin : restreint au rôle SUPER_ADMIN ──────────────
                .pathMatchers("/api/v1/platform-admin/**").hasRole("SUPER_ADMIN")
                // ── Tout le reste : JWT valide obligatoire ───────────────────
                .anyExchange().authenticated()
            )
            // Vérification JWT Keycloak (JWKS)
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults())
            );

        return http.build();
    }
}
