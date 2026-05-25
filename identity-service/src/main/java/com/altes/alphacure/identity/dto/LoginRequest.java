package com.altes.alphacure.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Requête de connexion — relayée à Keycloak (Resource Owner Password Credentials).
 */
@Data
public class LoginRequest {

    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    private String username;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;
}
