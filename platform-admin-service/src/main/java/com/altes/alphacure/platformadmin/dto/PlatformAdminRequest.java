package com.altes.alphacure.platformadmin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PlatformAdminRequest {
    @NotBlank(message = "Username obligatoire")
    @Size(max = 100)
    private String username;

    @NotBlank(message = "Mot de passe obligatoire")
    @Size(min = 8, max = 255)
    private String password;

    @Email
    @Size(max = 150)
    private String email;
}
