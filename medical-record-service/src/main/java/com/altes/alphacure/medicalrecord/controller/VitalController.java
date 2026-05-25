package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.PatientVital;
import com.altes.alphacure.medicalrecord.repository.PatientVitalRepository;
import com.altes.alphacure.medicalrecord.security.ClinicContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medical/vitals")
@RequiredArgsConstructor
public class VitalController {

    private final PatientVitalRepository patientVitalRepository;
    private final ClinicContextHolder clinicContextHolder;

    private UUID parseUUID(Object val) {
        if (val == null) return null;
        String str = val.toString().trim();
        if (str.isEmpty() || "null".equalsIgnoreCase(str) || "undefined".equalsIgnoreCase(str)) return null;
        try {
            return UUID.fromString(str);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * POST /api/v1/medical/vitals
     * Body: {prestationId, patientId, consultationId (optional), constantes: [{constantCode, constantName, value, unit}], takenBy}
     * Saves one or more vitals for a patient's prestation.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('INFIRMIER','MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<List<PatientVital>> saveVitals(@RequestBody Map<String, Object> body) {
        UUID clinicId = clinicContextHolder.getClinicId();

        UUID prestationId = parseUUID(body.get("prestationId"));
        UUID patientId = parseUUID(body.get("patientId"));
        UUID consultationId = parseUUID(body.get("consultationId"));
        String takenBy = (String) body.getOrDefault("takenBy", "");

        if (patientId == null) {
            return ResponseEntity.badRequest().build();
        }

        @SuppressWarnings("unchecked")
        List<Map<String, String>> constantes = (List<Map<String, String>>) body.get("constantes");

        List<PatientVital> saved = new ArrayList<>();
        if (constantes != null) {
            for (Map<String, String> c : constantes) {
                PatientVital vital = PatientVital.builder()
                        .clinicId(clinicId)
                        .patientId(patientId)
                        .consultationId(consultationId)
                        .prestationId(prestationId)
                        .constantCode(c.get("constantCode"))
                        .constantName(c.get("constantName"))
                        .value(c.get("value"))
                        .unit(c.get("unit"))
                        .takenBy(takenBy)
                        .build();
                saved.add(patientVitalRepository.save(vital));
            }
        }
        return ResponseEntity.ok(saved);
    }

    /**
     * GET /api/v1/medical/vitals/prestation/{prestationId}
     * Returns all vitals for a given prestation, ordered by takenAt asc.
     */
    @GetMapping("/prestation/{prestationId}")
    @PreAuthorize("hasAnyRole('INFIRMIER','MEDECIN','ADMIN')")
    public ResponseEntity<List<PatientVital>> getByPrestation(@PathVariable UUID prestationId) {
        return ResponseEntity.ok(patientVitalRepository.findByPrestationIdOrderByTakenAtAsc(prestationId));
    }

    /**
     * GET /api/v1/medical/vitals/consultation/{consultationId}
     * Returns all vitals for a given consultation, ordered by takenAt asc.
     */
    @GetMapping("/consultation/{consultationId}")
    @PreAuthorize("hasAnyRole('INFIRMIER','MEDECIN','ADMIN')")
    public ResponseEntity<List<PatientVital>> getByConsultation(@PathVariable UUID consultationId) {
        return ResponseEntity.ok(patientVitalRepository.findByConsultationIdOrderByTakenAtAsc(consultationId));
    }

    /**
     * GET /api/v1/medical/vitals/patient/{patientId}
     * Returns all vitals for a patient, most recent first.
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('INFIRMIER','MEDECIN','ADMIN')")
    public ResponseEntity<List<PatientVital>> getByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(patientVitalRepository.findByPatientIdOrderByTakenAtDesc(patientId));
    }
}
