package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.entity.ExternalPrescribingDoctor;
import com.altes.alphacure.patient.repository.ExternalPrescribingDoctorRepository;
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
@RequestMapping("/api/v1/external-prescribing-doctors")
@RequiredArgsConstructor
@Tag(name = "Médecins Prescripteurs Externes", description = "Gestion des médecins prescripteurs externes")
public class ExternalPrescribingDoctorController {

    private final ExternalPrescribingDoctorRepository externalPrescribingDoctorRepository;
    private final ClinicContextHolder clinicContextHolder;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Lister tous les médecins prescripteurs externes de la clinique")
    public ResponseEntity<List<ExternalPrescribingDoctor>> getAll() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(externalPrescribingDoctorRepository.findByClinicIdOrderByFullNameAsc(clinicId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Créer un nouveau médecin prescripteur externe")
    public ResponseEntity<ExternalPrescribingDoctor> create(@RequestBody ExternalPrescribingDoctor doc) {
        doc.setClinicId(clinicContextHolder.getClinicId());
        return ResponseEntity.status(HttpStatus.CREATED).body(externalPrescribingDoctorRepository.save(doc));
    }
}
