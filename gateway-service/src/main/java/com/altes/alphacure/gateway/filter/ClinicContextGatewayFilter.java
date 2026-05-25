package com.altes.alphacure.gateway.filter;

import com.altes.alphacure.gateway.util.ClinicIdClaimResolver;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Filtre global Gateway — Cloisonnement par clinique (anti-spoofing).
 *
 * Ordre d'exécution : -100 (avant tous les filtres de routage)
 *
 * Rôle :
 * 1. RETIRER les en-têtes X-Clinic-Id, X-User-Id, X-User-Roles des requêtes
 * entrantes (empêche tout client malveillant de les forger).
 * 2. Si le token JWT est valide et authentifié, INJECTER ces en-têtes
 * depuis les claims vérifiés du JWT — les microservices peuvent donc
 * s'y fier sans re-vérifier le JWT.
 * 3. Pour les routes publiques (pas de JWT), les en-têtes restent absents.
 */
@Component
@Slf4j
public class ClinicContextGatewayFilter implements GlobalFilter, Ordered {

    /** En-têtes interdits en entrée (spoofing prevention) */
    private static final List<String> BLOCKED_HEADERS = List.of(
            "X-Clinic-Id",
            "X-User-Id",
            "X-User-Roles",
            "X-Access-Level");

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {

        // Étape 1 : Supprimer les en-têtes entrants potentiellement forgés (anti-spoofing)
        // en utilisant un décorateur pour éviter les exceptions d'immutabilité.
        ServerHttpRequest sanitizedRequest = new ServerHttpRequestDecorator(exchange.getRequest()) {
            private HttpHeaders cachedHeaders;

            @Override
            public HttpHeaders getHeaders() {
                if (cachedHeaders == null) {
                    HttpHeaders headers = new HttpHeaders();
                    headers.putAll(super.getHeaders());
                    for (String headerName : BLOCKED_HEADERS) {
                        headers.remove(headerName);
                    }
                    cachedHeaders = HttpHeaders.readOnlyHttpHeaders(headers);
                }
                return cachedHeaders;
            }
        };

        ServerWebExchange sanitizedExchange = exchange.mutate()
                .request(sanitizedRequest)
                .build();

        // Étape 2 : Enrichir avec les claims JWT si l'utilisateur est authentifié
        return sanitizedExchange.getPrincipal()
                .ofType(JwtAuthenticationToken.class)
                .flatMap(jwtAuth -> {
                    var jwt = jwtAuth.getToken();

                    String clinicId = ClinicIdClaimResolver.extractClinicIdString(jwt);
                    String userId = jwt.getClaimAsString("sub");
                    String accessLevel = jwt.getClaimAsString("access_level");

                    // Rôles Keycloak : realm_access.roles
                    List<String> roles;
                    var realmAccess = jwt.getClaimAsMap("realm_access");
                    if (realmAccess != null && realmAccess.get("roles") instanceof List<?> r) {
                        roles = r.stream().map(Object::toString).toList();
                    } else {
                        roles = List.of();
                    }

                    log.debug("[Gateway] JWT enrichissement — clinicId={} userId={} roles={}",
                            clinicId, userId, roles);

                    ServerHttpRequest enrichedRequest = new ServerHttpRequestDecorator(sanitizedRequest) {
                        private HttpHeaders cachedEnrichedHeaders;

                        @Override
                        public HttpHeaders getHeaders() {
                            if (cachedEnrichedHeaders == null) {
                                HttpHeaders headers = new HttpHeaders();
                                headers.putAll(super.getHeaders());
                                if (clinicId != null && !clinicId.isBlank()) {
                                    headers.set("X-Clinic-Id", clinicId);
                                }
                                if (userId != null && !userId.isBlank()) {
                                    headers.set("X-User-Id", userId);
                                }
                                if (!roles.isEmpty()) {
                                    headers.set("X-User-Roles", String.join(",", roles));
                                }
                                if (accessLevel != null && !accessLevel.isBlank()) {
                                    headers.set("X-Access-Level", accessLevel);
                                }
                                cachedEnrichedHeaders = HttpHeaders.readOnlyHttpHeaders(headers);
                            }
                            return cachedEnrichedHeaders;
                        }
                    };

                    return chain.filter(sanitizedExchange.mutate().request(enrichedRequest).build());
                })
                // Pas de JWT (route publique ou type de principal non-JWT) → continuer sans enrichissement
                .switchIfEmpty(chain.filter(sanitizedExchange));
    }

    @Override
    public int getOrder() {
        // -100 : s'exécute avant les filtres de routage Spring Cloud Gateway
        return -100;
    }
}
