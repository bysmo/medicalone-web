package com.altes.alphacure.staff.controller;

import com.altes.alphacure.staff.client.KeycloakAdminClient;
import com.altes.alphacure.staff.client.ClinicClient;
import com.altes.alphacure.staff.client.NumberingDocumentType;
import com.altes.alphacure.staff.dto.StaffRequest;
import com.altes.alphacure.staff.entity.Staff;
import com.altes.alphacure.staff.entity.StaffType;
import com.altes.alphacure.staff.repository.StaffRepository;
import com.altes.alphacure.staff.repository.StaffTypeRepository;
import com.altes.alphacure.staff.security.ClinicContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Gestion du staff — cloisonné par clinique.
 *
 * Fonctionnalités :
 *  - CRUD des membres du personnel
 *  - Création d'accès utilisateur Keycloak pour chaque personnel
 *
 * Rôles Keycloak : ADMIN, MANAGER_CLINIQUE, RH
 */
@RestController
@RequestMapping("/api/v1/staff")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Staff", description = "Gestion du personnel de la clinique")
public class StaffController {

    private final StaffRepository staffRepository;
    private final StaffTypeRepository staffTypeRepository;
    private final ClinicContextHolder clinicContextHolder;
    private final KeycloakAdminClient keycloakAdminClient;
    private final ClinicClient clinicClient;

    // ─── CRUD Staff ───────────────────────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH','MEDECIN')")
    @Operation(summary = "Lister tous les membres du staff de la clinique")
    public ResponseEntity<List<Staff>> getAll(
            @RequestParam(required = false) String search) {
        UUID clinicId = clinicContextHolder.getClinicId();
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(staffRepository.searchByClinicId(clinicId, search));
        }
        return ResponseEntity.ok(staffRepository.findByClinicId(clinicId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH','MEDECIN')")
    @Operation(summary = "Obtenir un membre du staff par ID")
    public ResponseEntity<Staff> getOne(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Staff staff = staffRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Membre du staff non trouvé ou accès refusé"));
        return ResponseEntity.ok(staff);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH')")
    @Operation(summary = "Créer un membre du staff (et optionnellement un accès Keycloak)")
    public ResponseEntity<?> create(@Valid @RequestBody StaffRequest request) {
        UUID clinicId = clinicContextHolder.getClinicId();

        // Vérification email unique par clinique
        if (request.getEmail() != null && staffRepository.existsByClinicIdAndEmail(clinicId, request.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Un membre du staff avec cet email existe déjà."));
        }

        String matricule = request.getMatricule();
        if (matricule == null || matricule.isBlank()) {
            try {
                matricule = clinicClient.getNextNumber(NumberingDocumentType.STAFF_MATRICULE, null);
            } catch (Exception e) {
                log.error("[Staff] Échec génération matricule automatique: {}", e.getMessage());
            }
        }

        Staff staff = Staff.builder()
                .clinicId(clinicId)
                .matricule(matricule)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .typeId(request.getTypeId())
                .phone(request.getPhone())
                .email(request.getEmail())
                .build();

        Staff saved = staffRepository.save(staff);
        log.info("[Staff] Nouveau membre créé : {} {} (clinique: {})",
                saved.getFirstName(), saved.getLastName(), clinicId);

        // Création optionnelle d'un accès Keycloak
        if (request.isCreateUserAccess()) {
            if (request.getUsername() == null || request.getUsername().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le nom d'utilisateur est requis pour créer un accès."));
            }
            if (request.getPassword() == null || request.getPassword().length() < 8) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe doit contenir au moins 8 caractères."));
            }
            if (request.getRoleName() == null || request.getRoleName().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Le rôle est requis pour créer un accès."));
            }
            try {
                keycloakAdminClient.createStaffUser(
                        request.getUsername(),
                        request.getEmail(),
                        request.getPassword(),
                        request.getFirstName(),
                        request.getLastName(),
                        clinicId,
                        request.getRoleName()
                );
                log.info("[Staff] Accès Keycloak créé : {} → rôle {}", request.getUsername(), request.getRoleName());
            } catch (Exception e) {
                log.error("[Staff] Erreur création accès Keycloak pour {} : {}", request.getUsername(), e.getMessage());
                // On retourne le staff créé même si Keycloak échoue
                return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                        "staff", saved,
                        "warning", "Le membre du staff a été créé, mais l'accès Keycloak a échoué : " + e.getMessage()
                ));
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH')")
    @Operation(summary = "Modifier un membre du staff")
    public ResponseEntity<Staff> update(@PathVariable UUID id, @Valid @RequestBody StaffRequest request) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Staff existing = staffRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Membre du staff non trouvé ou accès refusé"));

        existing.setFirstName(request.getFirstName());
        existing.setLastName(request.getLastName());
        existing.setTypeId(request.getTypeId());
        existing.setPhone(request.getPhone());
        existing.setEmail(request.getEmail());
        if (request.getMatricule() != null && !request.getMatricule().isBlank()) {
            existing.setMatricule(request.getMatricule());
        }

        return ResponseEntity.ok(staffRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Supprimer un membre du staff")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Staff existing = staffRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Membre du staff non trouvé ou accès refusé"));
        staffRepository.delete(existing);
        return ResponseEntity.noContent().build();
    }

    // ─── Accès utilisateur Keycloak ───────────────────────────────────────────

    /**
     * Crée un accès Keycloak pour un membre du staff existant.
     * Endpoint séparé pour créer l'accès après coup (si non fait à la création).
     */
    @PostMapping("/{id}/create-access")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH')")
    @Operation(summary = "Créer un accès utilisateur Keycloak pour un membre du staff")
    public ResponseEntity<?> createAccess(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Staff staff = staffRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Membre du staff non trouvé ou accès refusé"));

        String username = body.get("username");
        String password = body.get("password");
        String roleName = body.get("roleName");

        if (username == null || username.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Le nom d'utilisateur est requis."));
        if (password == null || password.length() < 8)
            return ResponseEntity.badRequest().body(Map.of("message", "Le mot de passe doit contenir au moins 8 caractères."));
        if (roleName == null || roleName.isBlank())
            return ResponseEntity.badRequest().body(Map.of("message", "Le rôle est requis."));

        try {
            keycloakAdminClient.createStaffUser(
                    username, staff.getEmail(), password,
                    staff.getFirstName(), staff.getLastName(),
                    clinicId, roleName
            );
            log.info("[Staff] Accès Keycloak créé pour le staff id={} : {} → {}", id, username, roleName);
            return ResponseEntity.ok(Map.of(
                    "message", "Accès créé avec succès.",
                    "username", username,
                    "role", roleName
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de la création de l'accès : " + e.getMessage()));
        }
    }

    // ─── Types de staff ───────────────────────────────────────────────────────

    @GetMapping("/types")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH','MEDECIN')")
    @Operation(summary = "Lister les types de staff")
    public ResponseEntity<List<StaffType>> getTypes() {
        return ResponseEntity.ok(staffTypeRepository.findAll());
    }

    @PostMapping("/types")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Créer un type de staff")
    public ResponseEntity<StaffType> createType(@RequestBody StaffType type) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffTypeRepository.save(type));
    }
}
