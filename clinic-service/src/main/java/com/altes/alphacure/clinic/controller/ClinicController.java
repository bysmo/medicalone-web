package com.altes.alphacure.clinic.controller;

import com.altes.alphacure.clinic.dto.*;
import com.altes.alphacure.clinic.service.ClinicNumberingService;
import com.altes.alphacure.clinic.service.ClinicProfileService;
import com.altes.alphacure.clinic.service.ClinicService;
import com.altes.alphacure.clinic.entity.NumberingDocumentType;
import com.altes.alphacure.clinic.security.ClinicSecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clinics")
@RequiredArgsConstructor
@Tag(name = "Clinique", description = "Gestion des inscriptions de cliniques et souscriptions")
public class ClinicController {

    private final ClinicService service;
    private final ClinicProfileService profileService;
    private final ClinicNumberingService numberingService;

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un utilisateur Keycloak staff pour sa clinique")
    public ResponseEntity<Void> createClinicUser(@Valid @RequestBody ClinicUserCreateRequest request) {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        service.createClinicUser(request, clinicId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Récupérer le statut d'un compte Keycloak pour le staff de la clinique")
    public ResponseEntity<Map<String, Object>> getUserDetails(@RequestParam String emailOrUsername) {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        Map<String, Object> details = service.getUserDetails(emailOrUsername, clinicId);
        if (details == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(details);
    }

    @PutMapping("/users/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activer ou désactiver un compte d'accès staff")
    public ResponseEntity<Void> updateUserEnabledStatus(@RequestParam String username, @RequestParam boolean enabled) {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        service.updateUserEnabledStatus(username, enabled, clinicId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/unlock")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Déverrouiller un compte bloqué par brute-force")
    public ResponseEntity<Void> unlockUser(@RequestParam String username) {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        service.unlockUser(username, clinicId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/repair-context")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Synchroniser clinic_id Keycloak pour un compte staff (après 403 médecin/infirmier)")
    public ResponseEntity<Void> repairUserContext(@RequestParam String usernameOrEmail) {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        service.repairUserClinicContext(usernameOrEmail, clinicId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/register")
    @Operation(summary = "Enregistrer une nouvelle clinique")
    public ResponseEntity<ClinicResponse> register(@Valid @RequestBody ClinicRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registerClinic(request));
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Valider la souscription d'une clinique")
    public ResponseEntity<ClinicResponse> validate(@PathVariable UUID id,
            @RequestBody SubscriptionValidationRequest request) {
        return ResponseEntity.ok(service.validateSubscription(id, request));
    }

    @PostMapping("/{id}/reprovision")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Re-provisionner actes et nomenclatures pour une clinique active")
    public ResponseEntity<ClinicResponse> reprovision(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "false") boolean force) {
        return ResponseEntity.ok(service.reprovisionClinicData(id, force));
    }

    @GetMapping("/me/branding")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','COMPTABLE','LABORANTIN','PHARMACIEN','RH','MANAGER')")
    @Operation(summary = "Logo et nom de la clinique (affichage interface)")
    public ResponseEntity<ClinicBrandingResponse> getMyBranding() {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        return ResponseEntity.ok(profileService.getBranding(clinicId));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','COMPTABLE')")
    @Operation(summary = "Profil complet de ma clinique (infos, logo, fiscal, impressions, réseaux)")
    public ResponseEntity<ClinicFullResponse> getMyClinic() {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        return ResponseEntity.ok(profileService.getMyClinic(clinicId));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour le profil de ma clinique")
    public ResponseEntity<ClinicFullResponse> updateMyClinic(@RequestBody ClinicProfileUpdateRequest request) {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        return ResponseEntity.ok(profileService.updateMyClinic(clinicId, request));
    }

    @GetMapping("/me/numbering")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Règles de numérotation automatique de la clinique")
    public ResponseEntity<List<ClinicNumberingRuleDto>> getMyNumbering() {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        return ResponseEntity.ok(numberingService.getNumberingRules(clinicId));
    }

    @PutMapping("/me/numbering")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Mettre à jour les règles de numérotation")
    public ResponseEntity<List<ClinicNumberingRuleDto>> updateMyNumbering(
            @RequestBody ClinicNumberingUpdateRequest request) {
        UUID clinicId = ClinicSecurityContext.getClinicId();
        return ResponseEntity.ok(numberingService.updateNumberingRules(clinicId, request));
    }

    @PostMapping("/numbering/next")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MANAGER_CLINIQUE','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','COMPTABLE','LABORANTIN','PHARMACIEN','RH','MANAGER')")
    @Operation(summary = "Générer le prochain numéro de séquence pour un type de document")
    public ResponseEntity<String> getNextNumber(
            @RequestParam NumberingDocumentType documentType,
            @RequestParam(required = false) UUID clinicId) {
        UUID resolvedClinicId = clinicId;
        boolean isSuperAdmin = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN") || a.getAuthority().equals("SUPER_ADMIN"));
        if (resolvedClinicId == null || !isSuperAdmin) {
            resolvedClinicId = ClinicSecurityContext.getClinicId();
        }
        return ResponseEntity.ok(numberingService.generateNextNumber(resolvedClinicId, documentType));
    }

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Lister toutes les cliniques")
    public ResponseEntity<List<ClinicResponse>> getAll() {
        return ResponseEntity.ok(service.getAllClinics());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
    @Operation(summary = "Obtenir les details d'une clinique")
    public ResponseEntity<ClinicResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getClinicById(id));
    }
}
