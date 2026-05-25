package com.altes.alphacure.identity.client;

import com.altes.alphacure.identity.dto.TokenResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

/**
 * Client HTTP vers Keycloak — opérations d'authentification.
 *
 * Responsabilités :
 *  - Obtenir un token (login) via Resource Owner Password Credentials
 *  - Rafraîchir un token
 *  - Révoquer un token (logout)
 *
 * IMPORTANT : La gestion des utilisateurs (création, activation, rôles)
 * reste dans clinic-service/KeycloakAdminClient car elle est liée
 * au cycle de vie des cliniques.
 */
@Component
@Slf4j
public class KeycloakAuthClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${keycloak.auth-server-url:http://alphacure-keycloak:8180}")
    private String serverUrl;

    @Value("${keycloak.realm:alphacure}")
    private String realm;

    @Value("${keycloak.client-id:alphacure-app}")
    private String clientId;

    @Value("${keycloak.client-secret:}")
    private String clientSecret;

    /**
     * Authentifie un utilisateur et retourne les tokens Keycloak.
     *
     * @param username Nom d'utilisateur
     * @param password Mot de passe
     * @return TokenResponse contenant access_token et refresh_token
     */
    public TokenResponse login(String username, String password) {
        String tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "password");
        body.add("client_id", clientId);
        body.add("username", username);
        body.add("password", password);
        if (clientSecret != null && !clientSecret.isBlank()) {
            body.add("client_secret", clientSecret);
        }

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<TokenResponse> response = restTemplate.postForEntity(
                    tokenUrl, request, TokenResponse.class
            );
            log.info("[KeycloakAuth] Login réussi pour l'utilisateur : {}", username);
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.warn("[KeycloakAuth] Échec de connexion pour '{}' — statut : {}", username, e.getStatusCode());
            if (e.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                throw new RuntimeException("Identifiants incorrects.");
            }
            throw new RuntimeException("Erreur d'authentification : " + e.getMessage());
        }
    }

    /**
     * Rafraîchit un access_token à partir du refresh_token.
     */
    public TokenResponse refresh(String refreshToken) {
        String tokenUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/token";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "refresh_token");
        body.add("client_id", clientId);
        body.add("refresh_token", refreshToken);
        if (clientSecret != null && !clientSecret.isBlank()) {
            body.add("client_secret", clientSecret);
        }

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<TokenResponse> response = restTemplate.postForEntity(
                    tokenUrl, request, TokenResponse.class
            );
            log.debug("[KeycloakAuth] Token rafraîchi avec succès.");
            return response.getBody();
        } catch (HttpClientErrorException e) {
            log.warn("[KeycloakAuth] Échec de rafraîchissement — statut : {}", e.getStatusCode());
            throw new RuntimeException("Session expirée. Veuillez vous reconnecter.");
        }
    }

    /**
     * Révoque le refresh_token (logout côté Keycloak).
     */
    public void logout(String refreshToken) {
        String logoutUrl = serverUrl + "/realms/" + realm + "/protocol/openid-connect/logout";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("client_id", clientId);
        body.add("refresh_token", refreshToken);
        if (clientSecret != null && !clientSecret.isBlank()) {
            body.add("client_secret", clientSecret);
        }

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            restTemplate.postForEntity(logoutUrl, request, Void.class);
            log.info("[KeycloakAuth] Logout effectué avec succès.");
        } catch (Exception e) {
            log.warn("[KeycloakAuth] Erreur lors du logout (non critique) : {}", e.getMessage());
        }
    }
}
