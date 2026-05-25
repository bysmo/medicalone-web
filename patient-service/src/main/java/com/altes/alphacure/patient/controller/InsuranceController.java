package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.entity.Insurance;
import com.altes.alphacure.patient.repository.InsuranceRepository;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/insurances")
@RequiredArgsConstructor
@Tag(name = "Assureurs", description = "Gestion des assureurs (assurances)")
public class InsuranceController {

    private final InsuranceRepository insuranceRepository;
    private final ClinicContextHolder clinicContextHolder;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Lister tous les assureurs")
    public ResponseEntity<List<Insurance>> getAllInsurances() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(insuranceRepository.findByClinicIdOrGlobal(clinicId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Créer un assureur")
    public ResponseEntity<Insurance> createInsurance(@RequestBody Insurance insurance) {
        insurance.setClinicId(clinicContextHolder.getClinicId());
        return ResponseEntity.status(HttpStatus.CREATED).body(insuranceRepository.save(insurance));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Modifier un assureur")
    public ResponseEntity<Insurance> updateInsurance(@PathVariable UUID id, @RequestBody Insurance insurance) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Insurance existing = insuranceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assureur non trouvé: " + id));
        if (existing.getClinicId() == null) {
            throw new RuntimeException("Les assureurs globaux ne peuvent pas être modifiés.");
        }
        if (!existing.getClinicId().equals(clinicId)) {
            throw new RuntimeException("Accès non autorisé à cet assureur.");
        }
        existing.setName(insurance.getName());
        existing.setType(insurance.getType());
        existing.setAccessLevel(insurance.getAccessLevel());
        return ResponseEntity.ok(insuranceRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Supprimer un assureur")
    public ResponseEntity<Void> deleteInsurance(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Insurance existing = insuranceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Assureur non trouvé: " + id));
        if (existing.getClinicId() == null) {
            throw new RuntimeException("Les assureurs globaux ne peuvent pas être supprimés.");
        }
        if (!existing.getClinicId().equals(clinicId)) {
            throw new RuntimeException("Accès non autorisé.");
        }
        insuranceRepository.delete(existing);
        return ResponseEntity.noContent().build();
    }
}
