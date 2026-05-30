package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.PatientMedicalBackground;
import com.altes.alphacure.medicalrecord.repository.PatientMedicalBackgroundRepository;
import com.altes.alphacure.medicalrecord.security.ClinicContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Gestion des données médicales de base du patient (groupe sanguin, allergies, vaccins, etc.)
 * Endpoint base : /api/v1/medical/patients/{patientId}/background
 */
@RestController
@RequestMapping("/api/v1/medical/patients")
@RequiredArgsConstructor
public class PatientMedicalBackgroundController {

    private final PatientMedicalBackgroundRepository backgroundRepository;
    private final ClinicContextHolder clinicContextHolder;

    /**
     * GET /api/v1/medical/patients/{patientId}/background
     * Récupère les données médicales de base d'un patient.
     * Retourne 200 avec les données ou 200 avec un objet vide si aucune donnée n'existe.
     */
    @GetMapping("/{patientId}/background")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','RECEPTIONNISTE','ADMIN','MANAGER_CLINIQUE')")
    public ResponseEntity<PatientMedicalBackground> getBackground(@PathVariable UUID patientId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Optional<PatientMedicalBackground> existing = backgroundRepository.findByPatientIdAndClinicId(patientId, clinicId);
        return existing
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(PatientMedicalBackground.builder()
                        .patientId(patientId)
                        .clinicId(clinicId)
                        .build()));
    }

    /**
     * PUT /api/v1/medical/patients/{patientId}/background
     * Crée ou met à jour les données médicales de base d'un patient (upsert).
     */
    @PutMapping("/{patientId}/background")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','RECEPTIONNISTE','ADMIN','MANAGER_CLINIQUE')")
    public ResponseEntity<PatientMedicalBackground> saveBackground(
            @PathVariable UUID patientId,
            @RequestBody Map<String, Object> body) {

        UUID clinicId = clinicContextHolder.getClinicId();
        PatientMedicalBackground bg = backgroundRepository
                .findByPatientIdAndClinicId(patientId, clinicId)
                .orElse(PatientMedicalBackground.builder()
                        .patientId(patientId)
                        .clinicId(clinicId)
                        .build());

        if (body.containsKey("bloodGroup"))     bg.setBloodGroup((String) body.get("bloodGroup"));
        if (body.containsKey("rhesusFacteur"))  bg.setRhesusFacteur((String) body.get("rhesusFacteur"));
        if (body.containsKey("electrophorese")) bg.setElectrophorese((String) body.get("electrophorese"));
        if (body.containsKey("allergies"))      bg.setAllergies((String) body.get("allergies"));
        if (body.containsKey("vaccins"))        bg.setVaccins((String) body.get("vaccins"));
        if (body.containsKey("hivSerology"))    bg.setHivSerology((String) body.get("hivSerology"));
        if (body.containsKey("otherSerologies")) bg.setOtherSerologies((String) body.get("otherSerologies"));
        if (body.containsKey("medicalNotes"))   bg.setMedicalNotes((String) body.get("medicalNotes"));

        if (body.containsKey("isDiabetic"))    bg.setIsDiabetic(parseBoolean(body.get("isDiabetic")));
        if (body.containsKey("isAsthmatic"))   bg.setIsAsthmatic(parseBoolean(body.get("isAsthmatic")));
        if (body.containsKey("isHypertensive")) bg.setIsHypertensive(parseBoolean(body.get("isHypertensive")));

        PatientMedicalBackground saved = backgroundRepository.save(bg);
        return ResponseEntity.ok(saved);
    }

    private Boolean parseBoolean(Object val) {
        if (val == null) return null;
        if (val instanceof Boolean) return (Boolean) val;
        return Boolean.parseBoolean(val.toString());
    }
}
