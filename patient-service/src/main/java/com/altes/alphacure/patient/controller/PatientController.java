package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.dto.PatientRequest;
import com.altes.alphacure.patient.dto.PatientResponse;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import com.altes.alphacure.patient.service.PatientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Gestion des patients — cloisonné par clinique via ClinicContextHolder.
 *
 * Rôles Keycloak réels : ADMIN, MEDECIN, INFIRMIER, RECEPTIONNISTE, LABORANTIN,
 *                        CAISSIER, PHARMACIEN, COMPTABLE, MANAGER_CLINIQUE, SUPER_ADMIN
 */
@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Tag(name = "Patients", description = "Gestion des patients")
public class PatientController {

    private final PatientService patientService;
    private final ClinicContextHolder clinicContextHolder;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','MANAGER_CLINIQUE')")
    @Operation(summary = "Créer un nouveau patient")
    public ResponseEntity<PatientResponse> createPatient(@Valid @RequestBody PatientRequest request) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(patientService.createPatient(clinicId, request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','LABORANTIN','PHARMACIEN','MANAGER_CLINIQUE','COMPTABLE')")
    @Operation(summary = "Lister les patients de la clinique (paginé)")
    public ResponseEntity<Page<PatientResponse>> getPatients(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy) {
        UUID clinicId = clinicContextHolder.getClinicId();
        PageRequest pageable = PageRequest.of(page, size, Sort.by(sortBy).descending());
        return ResponseEntity.ok(patientService.getPatients(clinicId, search, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','LABORANTIN','PHARMACIEN','MANAGER_CLINIQUE','COMPTABLE')")
    @Operation(summary = "Obtenir un patient par ID")
    public ResponseEntity<PatientResponse> getPatient(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(patientService.getPatientById(clinicId, id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','MANAGER_CLINIQUE')")
    @Operation(summary = "Mettre à jour un patient")
    public ResponseEntity<PatientResponse> updatePatient(
            @PathVariable UUID id,
            @Valid @RequestBody PatientRequest request) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(patientService.updatePatient(clinicId, id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Supprimer un patient")
    public ResponseEntity<Void> deletePatient(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        patientService.deletePatient(clinicId, id);
        return ResponseEntity.noContent().build();
    }
}
