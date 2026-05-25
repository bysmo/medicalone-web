package com.altes.alphacure.clinic.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClinicUserCreateRequest {
    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    private String username;

    @Email
    @NotBlank(message = "L'adresse email est obligatoire")
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;

    private String firstName;
    private String lastName;

    @NotBlank(message = "Le rôle est obligatoire")
    private String roleName;
}
