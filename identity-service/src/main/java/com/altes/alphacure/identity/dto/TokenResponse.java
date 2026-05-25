package com.altes.alphacure.identity.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Réponse token renvoyée au client frontend.
 * Contient access_token, refresh_token et les métadonnées Keycloak.
 */
@Data
public class TokenResponse {

    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("refresh_token")
    private String refreshToken;

    @JsonProperty("expires_in")
    private Integer expiresIn;

    @JsonProperty("refresh_expires_in")
    private Integer refreshExpiresIn;

    @JsonProperty("token_type")
    private String tokenType;

    @JsonProperty("session_state")
    private String sessionState;

    @JsonProperty("scope")
    private String scope;
}
