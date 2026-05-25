package com.altes.alphacure.clinic.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicRegisterRequest {

    @NotBlank(message = "Le nom de la clinique est obligatoire")
    @Size(max = 150)
    private String name;

    @NotBlank(message = "Le code de la clinique est obligatoire")
    @Size(max = 50)
    private String code;

    @Size(max = 50)
    private String phone;

    @Email
    @NotBlank(message = "L'adresse email est obligatoire")
    @Size(max = 150)
    private String email;

    private String address;
    private String country;
    private String city;

    @NotBlank(message = "Le plan de souscription est obligatoire")
    private String planName;

    // Administrateur de la clinique
    @NotBlank(message = "Le nom d'utilisateur de l'admin est obligatoire")
    private String adminUsername;

    @Email
    @NotBlank(message = "L'email de l'admin est obligatoire")
    private String adminEmail;

    @NotBlank(message = "Le mot de passe de l'admin est obligatoire")
    private String adminPassword;

    private String adminFirstName;
    private String adminLastName;
}
