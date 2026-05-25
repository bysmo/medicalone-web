package com.altes.alphacure.identity.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

/**
 * Informations de l'utilisateur courant extraites du JWT Keycloak.
 * Renvoyées par GET /api/v1/auth/me
 */
@Data
@Builder
public class UserInfoResponse {
    private String sub;           // ID Keycloak
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private UUID clinicId;        // Cloisonnement SaaS
    private int accessLevel;
    private List<String> roles;
    private boolean enabled;
}
