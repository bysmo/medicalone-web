package com.altes.alphacure.staff.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Client Keycloak Admin pour staff-service.
 * Crée des accès utilisateur Keycloak directement (sans passer par identity-service).
 * Appelé uniquement quand le responsable RH crée un compte d'accès pour un personnel.
 */
@Component
@Slf4j
public class KeycloakAdminClient {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${keycloak.auth-server-url:http://alphacure-keycloak:8180}")
    private String serverUrl;

    @Value("${keycloak.realm:alphacure}")
    private String realm;

    @Value("${keycloak.admin-username:admin}")
    private String adminUsername;

    @Value("${keycloak.admin-password:admin}")
    private String adminPassword;

    private String getAdminToken() {
        String tokenUrl = serverUrl + "/realms/master/protocol/openid-connect/token";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        MultiValueMap<String, String> map = new LinkedMultiValueMap<>();
        map.add("client_id", "admin-cli");
        map.add("grant_type", "password");
        map.add("username", adminUsername);
        map.add("password", adminPassword);
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restTemplate.postForObject(
                tokenUrl, new HttpEntity<>(map, headers), Map.class);
        if (response != null && response.containsKey("access_token")) {
            return (String) response.get("access_token");
        }
        throw new RuntimeException("Impossible d'obtenir le token admin Keycloak");
    }

    /**
     * Crée un compte utilisateur Keycloak pour un membre du staff.
     *
     * @param username  Identifiant de connexion
     * @param email     Email
     * @param password  Mot de passe initial
     * @param firstName Prénom
     * @param lastName  Nom
     * @param clinicId  UUID de la clinique (injecté dans les attributes Keycloak)
     * @param roleName  Rôle Keycloak (MEDECIN, INFIRMIER, RECEPTIONNISTE, CAISSIER...)
     */
    public void createStaffUser(String username, String email, String password,
                                String firstName, String lastName,
                                UUID clinicId, String roleName) {
        String token = getAdminToken();
        String createUrl = serverUrl + "/admin/realms/" + realm + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> userBody = new HashMap<>();
        userBody.put("username", username);
        userBody.put("email", email);
        userBody.put("enabled", true);
        userBody.put("emailVerified", true);
        userBody.put("firstName", firstName != null ? firstName : "");
        userBody.put("lastName", lastName != null ? lastName : "");

        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", password);
        credential.put("temporary", false);
        userBody.put("credentials", Collections.singletonList(credential));

        // Attributs Keycloak — clinic_id est CRITIQUE pour le cloisonnement
        Map<String, List<String>> attributes = new HashMap<>();
        attributes.put("clinic_id", Collections.singletonList(clinicId.toString()));
        attributes.put("access_level", Collections.singletonList("1"));
        userBody.put("attributes", attributes);

        try {
            restTemplate.postForEntity(createUrl, new HttpEntity<>(userBody, headers), Void.class);
            log.info("[Staff] Compte Keycloak créé pour : {} (clinique: {})", username, clinicId);
            assignRole(username, roleName, token);
        } catch (Exception e) {
            log.error("[Staff] Erreur création compte Keycloak pour {} : {}", username, e.getMessage());
            throw new RuntimeException("Erreur création compte Keycloak : " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    private void assignRole(String username, String roleName, String token) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<Void> req = new HttpEntity<>(headers);

            // Récupérer l'ID utilisateur
            String userUrl = serverUrl + "/admin/realms/" + realm + "/users?username=" + username;
            ResponseEntity<List> userResp = restTemplate.exchange(userUrl, HttpMethod.GET, req, List.class);
            if (userResp.getBody() == null || userResp.getBody().isEmpty()) return;
            String userId = (String) ((Map<String, Object>) userResp.getBody().get(0)).get("id");

            // Récupérer le rôle
            String roleUrl = serverUrl + "/admin/realms/" + realm + "/roles/" + roleName;
            ResponseEntity<Map> roleResp = null;
            try {
                roleResp = restTemplate.exchange(roleUrl, HttpMethod.GET, req, Map.class);
            } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
                if ("RECEPTIONNISTE".equals(roleName)) {
                    log.warn("[Staff] Rôle RECEPTIONNISTE non trouvé dans Keycloak, tentative avec RECEPTIONISTE");
                    String fallbackUrl = serverUrl + "/admin/realms/" + realm + "/roles/RECEPTIONISTE";
                    try {
                        roleResp = restTemplate.exchange(fallbackUrl, HttpMethod.GET, req, Map.class);
                    } catch (Exception ex) {
                        log.error("[Staff] Rôle RECEPTIONISTE non trouvé également : {}", ex.getMessage());
                    }
                }
            }

            if (roleResp == null || roleResp.getBody() == null) {
                log.error("[Staff] Rôle {} introuvable dans Keycloak", roleName);
                return;
            }

            // Assigner le rôle
            String assignUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
            headers.setContentType(MediaType.APPLICATION_JSON);
            restTemplate.postForEntity(assignUrl,
                    new HttpEntity<>(Collections.singletonList(roleResp.getBody()), headers), Void.class);
            log.info("[Staff] Rôle {} assigné à {}", roleName, username);
        } catch (Exception e) {
            log.error("[Staff] Erreur assignation rôle {} à {} : {}", roleName, username, e.getMessage());
        }
    }
}
