package com.altes.alphacure.clinic.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Component
@Slf4j
@RequiredArgsConstructor
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

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(map, headers);
        
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(tokenUrl, request, Map.class);
            if (response != null && response.containsKey("access_token")) {
                return (String) response.get("access_token");
            }
        } catch (Exception e) {
            log.error("Erreur lors de l'obtention du token admin Keycloak", e);
            throw new RuntimeException("Impossible de se connecter à Keycloak", e);
        }
        throw new RuntimeException("Token d'administration Keycloak introuvable");
    }

    public void createClinicAdminUser(String username, String email, String password, String firstName, String lastName, UUID clinicId) {
        String token = getAdminToken();
        String createUserUrl = serverUrl + "/admin/realms/" + realm + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        // Body JSON du nouvel utilisateur
        Map<String, Object> userBody = new HashMap<>();
        userBody.put("username", username);
        userBody.put("email", email);
        userBody.put("enabled", false); // Desactive par defaut jusqu'a la validation
        userBody.put("emailVerified", true);
        userBody.put("firstName", firstName != null ? firstName : "");
        userBody.put("lastName", lastName != null ? lastName : "");

        // Credentials
        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", password);
        credential.put("temporary", false);
        userBody.put("credentials", Collections.singletonList(credential));

        // Attributes (très important pour le cloisonnement SaaS clinic_id !)
        Map<String, List<String>> attributes = new HashMap<>();
        attributes.put("clinic_id", Collections.singletonList(clinicId.toString()));
        attributes.put("access_level", Collections.singletonList("9")); // Admin level 9
        userBody.put("attributes", attributes);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(userBody, headers);

        try {
            ResponseEntity<Void> response = restTemplate.postForEntity(createUserUrl, request, Void.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Utilisateur admin créé (désactivé) dans Keycloak : {}", username);
                
                // Assigner le rôle ADMIN à ce nouvel utilisateur
                assignRoleToUser(username, "ADMIN", token);
            } else {
                throw new RuntimeException("Erreur Keycloak: statut " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Erreur lors de la création de l'utilisateur admin dans Keycloak", e);
            throw new RuntimeException("Erreur de création utilisateur Keycloak : " + e.getMessage(), e);
        }
    }

    public void enableClinicAdminUser(String username) {
        String token = getAdminToken();
        try {
            // 1. Récupérer l'ID de l'utilisateur par son username
            String getUserUrl = serverUrl + "/admin/realms/" + realm + "/users?username=" + username;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            @SuppressWarnings("unchecked")
            ResponseEntity<List> userResponse = restTemplate.exchange(getUserUrl, HttpMethod.GET, request, List.class);
            if (userResponse.getBody() == null || userResponse.getBody().isEmpty()) {
                log.error("Impossible d'activer l'utilisateur : {} introuvable dans Keycloak", username);
                return;
            }
            
            @SuppressWarnings("unchecked")
            Map<String, Object> userMap = (Map<String, Object>) userResponse.getBody().get(0);
            String userId = (String) userMap.get("id");

            // 2. Récupérer l'utilisateur complet par son ID (pour préserver ses attributs)
            String getUserByIdUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId;
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> userDetailResponse = restTemplate.exchange(getUserByIdUrl, HttpMethod.GET, request, Map.class);
            @SuppressWarnings("unchecked")
            Map<String, Object> fullUser = (Map<String, Object>) userDetailResponse.getBody();
            if (fullUser == null) {
                log.error("Impossible de récupérer l'utilisateur complet pour ID: {}", userId);
                return;
            }

            // 3. Activer l'utilisateur en préservant le reste du profil
            String updateUserUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId;
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            fullUser.put("enabled", true);
            
            HttpEntity<Map<String, Object>> updateRequest = new HttpEntity<>(fullUser, headers);
            restTemplate.exchange(updateUserUrl, HttpMethod.PUT, updateRequest, Void.class);
            log.info("Utilisateur {} activé avec succès dans Keycloak !", username);
        } catch (Exception e) {
            log.error("Erreur lors de l'activation de l'utilisateur dans Keycloak", e);
            throw new RuntimeException("Impossible d'activer l'utilisateur dans Keycloak", e);
        }
    }

    public void createClinicUser(String username, String email, String password, String firstName, String lastName, UUID clinicId, String roleName) {
        String token = getAdminToken();
        String createUserUrl = serverUrl + "/admin/realms/" + realm + "/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        // Body JSON du nouvel utilisateur
        Map<String, Object> userBody = new HashMap<>();
        userBody.put("username", username);
        userBody.put("email", email);
        userBody.put("enabled", true); // Activé par défaut pour le personnel de clinique
        userBody.put("emailVerified", true);
        userBody.put("firstName", firstName != null ? firstName : "");
        userBody.put("lastName", lastName != null ? lastName : "");

        // Credentials
        Map<String, Object> credential = new HashMap<>();
        credential.put("type", "password");
        credential.put("value", password);
        credential.put("temporary", false);
        userBody.put("credentials", Collections.singletonList(credential));

        // Attributes (très important pour le cloisonnement SaaS clinic_id !)
        Map<String, List<String>> attributes = new HashMap<>();
        attributes.put("clinic_id", Collections.singletonList(clinicId.toString()));
        attributes.put("access_level", Collections.singletonList("1")); // Niveau classique
        userBody.put("attributes", attributes);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(userBody, headers);

        try {
            ResponseEntity<Void> response = restTemplate.postForEntity(createUserUrl, request, Void.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Utilisateur staff créé dans Keycloak : {}", username);
                assignRoleToUser(username, roleName, token);
            } else {
                throw new RuntimeException("Erreur Keycloak: statut " + response.getStatusCode());
            }
        } catch (HttpClientErrorException.Conflict e) {
            log.warn("Utilisateur {} existe déjà — synchronisation clinic_id et rôle {}", username, roleName);
            String userId = findUserIdByUsernameOrEmail(username, email, token);
            if (userId == null) {
                throw new RuntimeException("Utilisateur existant introuvable dans Keycloak : " + username);
            }
            ensureUserClinicContext(userId, clinicId, "1", token);
            assignRoleToUser(username, roleName, token);
        } catch (Exception e) {
            log.error("Erreur lors de la création de l'utilisateur staff dans Keycloak", e);
            throw new RuntimeException("Erreur de création utilisateur Keycloak : " + e.getMessage(), e);
        }
    }

    /**
     * Garantit clinic_id (et access_level) sur un utilisateur Keycloak existant.
     * Indispensable pour que le JWT contienne clinic_id via le mapper client alphacure-ui.
     */
    @SuppressWarnings("unchecked")
    public void ensureUserClinicContext(String userId, UUID clinicId, String accessLevel, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        String getUserByIdUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId;
        ResponseEntity<Map> userDetailResponse = restTemplate.exchange(getUserByIdUrl, HttpMethod.GET, request, Map.class);
        Map<String, Object> fullUser = userDetailResponse.getBody();
        if (fullUser == null) {
            throw new RuntimeException("Utilisateur Keycloak introuvable : " + userId);
        }

        Map<String, List<String>> attributes = (Map<String, List<String>>) fullUser.get("attributes");
        if (attributes == null) {
            attributes = new HashMap<>();
            fullUser.put("attributes", attributes);
        }
        attributes.put("clinic_id", Collections.singletonList(clinicId.toString()));
        if (accessLevel != null) {
            attributes.put("access_level", Collections.singletonList(accessLevel));
        }

        String updateUserUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId;
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> updateRequest = new HttpEntity<>(fullUser, headers);
        restTemplate.exchange(updateUserUrl, HttpMethod.PUT, updateRequest, Void.class);
        log.info("Contexte clinique synchronisé pour userId={} clinicId={}", userId, clinicId);
    }

    @SuppressWarnings("unchecked")
    private String findUserIdByUsernameOrEmail(String username, String email, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        String searchUrl = serverUrl + "/admin/realms/" + realm + "/users?username=" + username;
        ResponseEntity<List> response = restTemplate.exchange(searchUrl, HttpMethod.GET, request, List.class);
        List<Map<String, Object>> users = (List<Map<String, Object>>) response.getBody();

        if ((users == null || users.isEmpty()) && email != null && !email.isBlank()) {
            searchUrl = serverUrl + "/admin/realms/" + realm + "/users?email=" + email;
            response = restTemplate.exchange(searchUrl, HttpMethod.GET, request, List.class);
            users = (List<Map<String, Object>>) response.getBody();
        }

        if (users == null || users.isEmpty()) {
            return null;
        }
        return (String) users.get(0).get("id");
    }

    /**
     * Répare clinic_id manquant pour un compte staff de la clinique (admin connecté).
     */
    public void repairUserClinicContext(String usernameOrEmail, UUID clinicId) {
        String token = getAdminToken();
        String userId = findUserIdByUsernameOrEmail(usernameOrEmail, usernameOrEmail, token);
        if (userId == null) {
            userId = findUserIdByUsernameOrEmail(usernameOrEmail, null, token);
        }
        if (userId == null) {
            throw new RuntimeException("Utilisateur introuvable : " + usernameOrEmail);
        }
        ensureUserClinicContext(userId, clinicId, "1", token);
    }

    private void assignRoleToUser(String username, String roleName, String token) {
        try {
            // 1. Récupérer l'ID de l'utilisateur créé
            String getUserUrl = serverUrl + "/admin/realms/" + realm + "/users?username=" + username;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            @SuppressWarnings("unchecked")
            ResponseEntity<List> userResponse = restTemplate.exchange(getUserUrl, HttpMethod.GET, request, List.class);
            if (userResponse.getBody() == null || userResponse.getBody().isEmpty()) {
                log.error("Utilisateur introuvable pour assignation du rôle");
                return;
            }
            
            @SuppressWarnings("unchecked")
            Map<String, Object> userMap = (Map<String, Object>) userResponse.getBody().get(0);
            String userId = (String) userMap.get("id");

            // 2. Récupérer le rôle par son nom
            String getRoleUrl = serverUrl + "/admin/realms/" + realm + "/roles/" + roleName;
            @SuppressWarnings("unchecked")
            ResponseEntity<Map> roleResponse = restTemplate.exchange(getRoleUrl, HttpMethod.GET, request, Map.class);
            if (roleResponse.getBody() == null) {
                log.error("Rôle {} introuvable dans Keycloak", roleName);
                return;
            }
            
            Map<String, Object> roleMap = roleResponse.getBody();

            // 3. Attribuer le rôle à l'utilisateur
            String assignRoleUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<List<Map<String, Object>>> assignRequest = new HttpEntity<>(Collections.singletonList(roleMap), headers);
            restTemplate.postForEntity(assignRoleUrl, assignRequest, Void.class);
            log.info("Rôle {} assigné avec succès à {}", roleName, username);
        } catch (Exception e) {
            log.error("Erreur d'assignation de rôle dans Keycloak", e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getUserDetails(String emailOrUsername, UUID clinicId) {
        String token = getAdminToken();
        try {
            // 1. Rechercher par username
            String searchUrl = serverUrl + "/admin/realms/" + realm + "/users?username=" + emailOrUsername;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<List> response = restTemplate.exchange(searchUrl, HttpMethod.GET, request, List.class);
            List<Map<String, Object>> users = (List<Map<String, Object>>) response.getBody();
            
            // Si vide, rechercher par email
            if (users == null || users.isEmpty()) {
                searchUrl = serverUrl + "/admin/realms/" + realm + "/users?email=" + emailOrUsername;
                response = restTemplate.exchange(searchUrl, HttpMethod.GET, request, List.class);
                users = (List<Map<String, Object>>) response.getBody();
            }
            
            if (users == null || users.isEmpty()) {
                return null;
            }
            
            // Prendre le premier utilisateur trouvé
            Map<String, Object> userMap = users.get(0);
            String userId = (String) userMap.get("id");
            
            // Vérifier / réparer le cloisonnement clinic_id
            if (!verifyOrRepairClinicId(userId, userMap, clinicId, token)) {
                return null;
            }
            
            // 2. Récupérer le statut brute-force (locked)
            String bruteForceUrl = serverUrl + "/admin/realms/" + realm + "/attack-detection/brute-force/users/" + userId;
            ResponseEntity<Map> bfResponse = restTemplate.exchange(bruteForceUrl, HttpMethod.GET, request, Map.class);
            boolean isLocked = false;
            if (bfResponse.getBody() != null) {
                Boolean disabled = (Boolean) bfResponse.getBody().get("disabled");
                if (disabled != null) {
                    isLocked = disabled;
                }
            }
            
            // 3. Récupérer les rôles
            String rolesUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId + "/role-mappings/realm";
            ResponseEntity<List> rolesResponse = restTemplate.exchange(rolesUrl, HttpMethod.GET, request, List.class);
            List<String> roleNames = new ArrayList<>();
            if (rolesResponse.getBody() != null) {
                for (Object roleObj : rolesResponse.getBody()) {
                    Map<String, Object> rMap = (Map<String, Object>) roleObj;
                    roleNames.add((String) rMap.get("name"));
                }
            }
            
            // Construire la réponse simplifiée
            Map<String, Object> result = new HashMap<>();
            result.put("id", userId);
            result.put("username", userMap.get("username"));
            result.put("email", userMap.get("email"));
            result.put("enabled", userMap.get("enabled"));
            result.put("locked", isLocked);
            result.put("roles", roleNames);
            
            return result;
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des détails Keycloak de l'utilisateur {}", emailOrUsername, e);
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    public void updateUserEnabledStatus(String username, boolean enabled, UUID clinicId) {
        String token = getAdminToken();
        try {
            // 1. Récupérer l'utilisateur
            String getUserUrl = serverUrl + "/admin/realms/" + realm + "/users?username=" + username;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<List> userResponse = restTemplate.exchange(getUserUrl, HttpMethod.GET, request, List.class);
            if (userResponse.getBody() == null || userResponse.getBody().isEmpty()) {
                throw new RuntimeException("Utilisateur introuvable dans Keycloak");
            }
            
            Map<String, Object> userMap = (Map<String, Object>) userResponse.getBody().get(0);
            String userId = (String) userMap.get("id");

            // Récupérer l'utilisateur complet par ID pour préserver ses attributs
            String getUserByIdUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId;
            ResponseEntity<Map> userDetailResponse = restTemplate.exchange(getUserByIdUrl, HttpMethod.GET, request, Map.class);
            Map<String, Object> fullUser = (Map<String, Object>) userDetailResponse.getBody();
            if (fullUser == null) {
                throw new RuntimeException("Impossible de récupérer l'utilisateur complet pour ID: " + userId);
            }
            
            if (!verifyOrRepairClinicId(userId, fullUser, clinicId, token)) {
                throw new RuntimeException("Accès refusé : cet utilisateur appartient à une autre clinique");
            }
            
            // 2. Mettre à jour l'état enabled en préservant le reste
            String updateUserUrl = serverUrl + "/admin/realms/" + realm + "/users/" + userId;
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            fullUser.put("enabled", enabled);
            
            HttpEntity<Map<String, Object>> updateRequest = new HttpEntity<>(fullUser, headers);
            restTemplate.exchange(updateUserUrl, HttpMethod.PUT, updateRequest, Void.class);
            log.info("Statut de l'utilisateur {} mis à jour : enabled={}", username, enabled);
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour du statut enabled pour {}", username, e);
            throw new RuntimeException(e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public void unlockUser(String username, UUID clinicId) {
        String token = getAdminToken();
        try {
            // 1. Récupérer l'utilisateur
            String getUserUrl = serverUrl + "/admin/realms/" + realm + "/users?username=" + username;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            
            ResponseEntity<List> userResponse = restTemplate.exchange(getUserUrl, HttpMethod.GET, request, List.class);
            if (userResponse.getBody() == null || userResponse.getBody().isEmpty()) {
                throw new RuntimeException("Utilisateur introuvable dans Keycloak");
            }
            
            Map<String, Object> userMap = (Map<String, Object>) userResponse.getBody().get(0);
            String userId = (String) userMap.get("id");
            
            if (!verifyOrRepairClinicId(userId, userMap, clinicId, token)) {
                throw new RuntimeException("Accès refusé : cet utilisateur appartient à une autre clinique");
            }
            
            // 2. Déverrouiller (supprimer brute-force)
            String bruteForceUrl = serverUrl + "/admin/realms/" + realm + "/attack-detection/brute-force/users/" + userId;
            restTemplate.exchange(bruteForceUrl, HttpMethod.DELETE, request, Void.class);
            log.info("Utilisateur {} déverrouillé avec succès dans Keycloak !", username);
        } catch (Exception e) {
            log.error("Erreur lors du déverrouillage de l'utilisateur {}", username, e);
            throw new RuntimeException(e.getMessage());
        }
    }

    /**
     * Vérifie que l'utilisateur appartient à la clinique ; répare clinic_id s'il est absent.
     */
    @SuppressWarnings("unchecked")
    private boolean verifyOrRepairClinicId(String userId, Map<String, Object> userMap, UUID clinicId, String token) {
        Map<String, List<String>> attributes = (Map<String, List<String>>) userMap.get("attributes");
        String userClinicId = null;
        if (attributes != null && attributes.containsKey("clinic_id") && !attributes.get("clinic_id").isEmpty()) {
            userClinicId = attributes.get("clinic_id").get(0);
        }

        if (userClinicId == null || userClinicId.isBlank()) {
            log.warn("Attribut clinic_id absent pour userId={} — réparation avec clinicId={}", userId, clinicId);
            ensureUserClinicContext(userId, clinicId, "1", token);
            return true;
        }

        if (!clinicId.toString().equalsIgnoreCase(userClinicId)) {
            log.warn("Clinique {} ≠ clinique utilisateur {}", clinicId, userClinicId);
            return false;
        }
        return true;
    }
}
