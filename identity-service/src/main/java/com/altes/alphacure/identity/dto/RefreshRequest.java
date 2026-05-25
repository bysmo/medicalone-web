package com.altes.alphacure.identity.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Requête de rafraîchissement de token — relayée à Keycloak.
 */
@Data
public class RefreshRequest {

    @NotBlank(message = "Le refresh_token est obligatoire")
    private String refreshToken;
}
