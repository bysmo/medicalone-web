package com.altes.alphacure.staff.config;

import feign.RequestInterceptor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

/**
 * Configuration Feign — Propagation automatique du JWT entre microservices.
 * staff-service → clinic-service (ClinicClient)
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
                log.debug("[Feign/Staff] JWT propagé vers : {}", requestTemplate.url());
            } else {
                log.warn("[Feign/Staff] Aucun JWT disponible pour : {}", requestTemplate.url());
            }
        };
    }
}
