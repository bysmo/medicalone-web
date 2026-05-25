package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.Prescription;
import com.altes.alphacure.medicalrecord.entity.PrescriptionLine;
import com.altes.alphacure.medicalrecord.repository.PrescriptionLineRepository;
import com.altes.alphacure.medicalrecord.repository.PrescriptionRepository;
import com.altes.alphacure.medicalrecord.security.ClinicContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/medical/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionLineRepository prescriptionLineRepository;
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
     * POST /api/v1/medical/prescriptions
     * Body: {prestationId, patientId, consultationId, prescribedBy,
     *        lines: [{orderNum, medication, dosage, frequency, duration, comment}]}
     * Creates a prescription with its lines (replaces existing for this prestation).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> savePrescription(@RequestBody Map<String, Object> body) {
        UUID clinicId = clinicContextHolder.getClinicId();

        UUID prestationId = parseUUID(body.get("prestationId"));
        UUID patientId = parseUUID(body.get("patientId"));
        UUID consultationId = parseUUID(body.get("consultationId"));
        String prescribedBy = (String) body.getOrDefault("prescribedBy", "");

        if (patientId == null) {
            return ResponseEntity.badRequest().build();
        }

        // Upsert prescription header
        Prescription prescription = null;
        if (consultationId != null) {
            prescription = prescriptionRepository.findByConsultationId(consultationId).orElse(null);
        }
        if (prescription == null && prestationId != null) {
            List<Prescription> existing = prescriptionRepository.findByPrestationId(prestationId);
            if (!existing.isEmpty()) {
                prescription = existing.get(0);
            }
        }
        if (prescription == null) {
            prescription = Prescription.builder()
                    .clinicId(clinicId)
                    .patientId(patientId)
                    .prestationId(prestationId)
                    .consultationId(consultationId)
                    .build();
        }
        prescription.setPrescribedBy(prescribedBy);
        prescription = prescriptionRepository.save(prescription);

        // Delete existing lines and re-save
        final UUID prescriptionId = prescription.getId();
        List<PrescriptionLine> existingLines = prescriptionLineRepository
                .findByPrescriptionIdOrderByOrderNumAsc(prescriptionId);
        prescriptionLineRepository.deleteAll(existingLines);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> linesData = (List<Map<String, Object>>) body.get("lines");
        List<PrescriptionLine> savedLines = new ArrayList<>();
        if (linesData != null) {
            for (Map<String, Object> l : linesData) {
                PrescriptionLine line = PrescriptionLine.builder()
                        .prescriptionId(prescriptionId)
                        .orderNum(l.get("orderNum") != null ? ((Number) l.get("orderNum")).intValue() : null)
                        .medication((String) l.get("medication"))
                        .dosage((String) l.get("dosage"))
                        .frequency((String) l.get("frequency"))
                        .duration((String) l.get("duration"))
                        .comment((String) l.get("comment"))
                        .build();
                savedLines.add(prescriptionLineRepository.save(line));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("prescription", prescription);
        result.put("lines", savedLines);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/medical/prescriptions/prestation/{prestationId}
     * Returns prescription + lines for a given prestation.
     */
    @GetMapping("/prestation/{prestationId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<Map<String, Object>> getByPrestation(@PathVariable UUID prestationId) {
        List<Prescription> prescriptions = prescriptionRepository.findByPrestationId(prestationId);
        if (prescriptions.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        Prescription prescription = prescriptions.get(0);
        List<PrescriptionLine> lines = prescriptionLineRepository
                .findByPrescriptionIdOrderByOrderNumAsc(prescription.getId());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("prescription", prescription);
        result.put("lines", lines);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/medical/prescriptions/consultation/{consultationId}
     * Returns prescription + lines for a given consultation.
     */
    @GetMapping("/consultation/{consultationId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<Map<String, Object>> getByConsultation(@PathVariable UUID consultationId) {
        Optional<Prescription> prescriptionOpt = prescriptionRepository.findByConsultationId(consultationId);
        if (prescriptionOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        Prescription prescription = prescriptionOpt.get();
        List<PrescriptionLine> lines = prescriptionLineRepository
                .findByPrescriptionIdOrderByOrderNumAsc(prescription.getId());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("prescription", prescription);
        result.put("lines", lines);
        return ResponseEntity.ok(result);
    }

    /**
     * GET /api/v1/medical/prescriptions/patient/{patientId}
     * Returns all prescriptions for a patient (headers only), most recent first.
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<List<Prescription>> getByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(patientId));
    }
}
