package com.altes.alphacure.staff.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

/**
 * DTO de création / modification d'un membre du staff.
 * Inclut les informations pour la création optionnelle d'un accès Keycloak.
 */
@Data
public class StaffRequest {

    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;

    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;

    private UUID typeId;         // référence vers StaffType / nomenclature

    private String matricule;

    private String phone;

    @Email(message = "Email invalide")
    private String email;

    // ─── Pour création accès utilisateur ──────────────────────────────────────

    /** Si true : crée un compte Keycloak pour ce membre du staff */
    private boolean createUserAccess;

    /** Nom d'utilisateur Keycloak (requis si createUserAccess=true) */
    private String username;

    /** Mot de passe initial (requis si createUserAccess=true) */
    private String password;

    /** Rôle Keycloak à assigner (MEDECIN, INFIRMIER, RECEPTIONNISTE, CAISSIER, LABORANTIN...) */
    private String roleName;
}
