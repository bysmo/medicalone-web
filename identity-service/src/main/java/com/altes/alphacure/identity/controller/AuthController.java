package com.altes.alphacure.identity.controller;

import com.altes.alphacure.identity.client.KeycloakAuthClient;
import com.altes.alphacure.identity.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrôleur d'authentification — Proxy Keycloak.
 *
 * Routes publiques (sans JWT) :
 *   POST /api/v1/auth/login    → obtenir access_token + refresh_token
 *   POST /api/v1/auth/refresh  → rafraîchir le token
 *
 * Routes protégées (JWT requis) :
 *   POST /api/v1/auth/logout   → révoquer la session
 *   GET  /api/v1/auth/me       → profil de l'utilisateur courant
 *
 * Identity-service ne stocke PLUS d'utilisateurs en base de données.
 * Keycloak est la seule source de vérité pour les identités.
 * La création/gestion des utilisateurs se fait via clinic-service/KeycloakAdminClient.
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentification", description = "Login, logout, refresh et profil utilisateur")
public class AuthController {

    private final KeycloakAuthClient keycloakAuthClient;

    /**
     * Connexion — Relayée à Keycloak via ROPC.
     * Retourne access_token + refresh_token.
     * Route publique : pas de JWT requis.
     */
    @PostMapping("/login")
    @Operation(summary = "Connexion utilisateur", description = "Retourne access_token et refresh_token depuis Keycloak")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("[Auth] Tentative de connexion pour : {}", request.getUsername());
        TokenResponse token = keycloakAuthClient.login(request.getUsername(), request.getPassword());
        return ResponseEntity.ok(token);
    }

    /**
     * Rafraîchissement du token.
     * Route publique : le refresh_token remplace le JWT.
     */
    @PostMapping("/refresh")
    @Operation(summary = "Rafraîchir le token", description = "Renouvelle l'access_token avec le refresh_token")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        log.debug("[Auth] Rafraîchissement de token demandé.");
        TokenResponse token = keycloakAuthClient.refresh(request.getRefreshToken());
        return ResponseEntity.ok(token);
    }

    /**
     * Déconnexion — Révocation du refresh_token dans Keycloak.
     * Route protégée : JWT requis.
     */
    @PostMapping("/logout")
    @Operation(summary = "Déconnexion", description = "Révoque la session Keycloak (refresh_token)")
    public ResponseEntity<Map<String, String>> logout(@Valid @RequestBody RefreshRequest request) {
        log.info("[Auth] Logout demandé.");
        keycloakAuthClient.logout(request.getRefreshToken());
        return ResponseEntity.ok(Map.of("message", "Déconnexion réussie."));
    }

    /**
     * Profil de l'utilisateur courant — extrait directement du JWT.
     * Aucun appel BDD, aucun appel Keycloak Admin.
     * Route protégée : JWT requis.
     */
    @GetMapping("/me")
    @Operation(summary = "Profil utilisateur courant", description = "Retourne les informations extraites du JWT")
    public ResponseEntity<UserInfoResponse> me(@AuthenticationPrincipal Jwt jwt) {

        // Extraction des rôles depuis realm_access.roles
        List<String> roles = List.of();
        var realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof List<?> r) {
            roles = r.stream().map(Object::toString).toList();
        }

        // Extraction du clinic_id
        UUID clinicId = resolveClinicId(jwt);

        // Extraction de l'access_level
        int accessLevel = 0;
        Object level = jwt.getClaim("access_level");
        if (level instanceof Number n) accessLevel = n.intValue();
        else if (level instanceof String s) {
            try { accessLevel = Integer.parseInt(s); } catch (NumberFormatException ignored) {}
        }

        UserInfoResponse userInfo = UserInfoResponse.builder()
                .sub(jwt.getSubject())
                .username(jwt.getClaimAsString("preferred_username"))
                .email(jwt.getClaimAsString("email"))
                .firstName(jwt.getClaimAsString("given_name"))
                .lastName(jwt.getClaimAsString("family_name"))
                .clinicId(clinicId)
                .accessLevel(accessLevel)
                .roles(roles)
                .enabled(true) // si le token est valide, l'utilisateur est actif
                .build();

        return ResponseEntity.ok(userInfo);
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
