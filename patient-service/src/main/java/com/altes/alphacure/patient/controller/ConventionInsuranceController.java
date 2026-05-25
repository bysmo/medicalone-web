package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.entity.ConventionInsurance;
import com.altes.alphacure.patient.repository.ConventionInsuranceRepository;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/conventions")
@RequiredArgsConstructor
@Tag(name = "Conventions Assurance", description = "Gestion des conventions d'assurances pour les actes médicaux")
public class ConventionInsuranceController {

    private final ConventionInsuranceRepository conventionInsuranceRepository;
    private final ClinicContextHolder clinicContextHolder;

    @GetMapping("/insurer/{insuranceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE')")
    @Operation(summary = "Lister les conventions d'un assureur")
    public ResponseEntity<List<ConventionInsurance>> getConventions(@PathVariable UUID insuranceId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(conventionInsuranceRepository.findByClinicIdAndInsuranceId(clinicId, insuranceId));
    }

    @PostMapping("/insurer/{insuranceId}")
    @PreAuthorize("hasRole('ADMIN')")
    @jakarta.transaction.Transactional
    @Operation(summary = "Enregistrer les conventions d'un assureur")
    public ResponseEntity<List<ConventionInsurance>> saveConventions(
            @PathVariable UUID insuranceId,
            @RequestBody List<ConventionInsurance> conventions) {
        UUID clinicId = clinicContextHolder.getClinicId();

        for (ConventionInsurance conv : conventions) {
            ConventionInsurance existing = conventionInsuranceRepository
                    .findByClinicIdAndInsuranceIdAndActeId(clinicId, insuranceId, conv.getActeId())
                    .orElse(null);
            if (existing != null) {
                existing.setIsCovered(conv.getIsCovered());
                existing.setMaxAmountCovered(conv.getMaxAmountCovered());
                conventionInsuranceRepository.save(existing);
            } else {
                conv.setClinicId(clinicId);
                conv.setInsuranceId(insuranceId);
                conventionInsuranceRepository.save(conv);
            }
        }
        return ResponseEntity.ok(conventionInsuranceRepository.findByClinicIdAndInsuranceId(clinicId, insuranceId));
    }
}
