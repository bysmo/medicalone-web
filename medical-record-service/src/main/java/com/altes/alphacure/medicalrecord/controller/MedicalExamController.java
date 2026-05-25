package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.MedicalExamRequest;
import com.altes.alphacure.medicalrecord.repository.MedicalExamRequestRepository;
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
@RequestMapping("/api/v1/medical/exam-requests")
@RequiredArgsConstructor
public class MedicalExamController {

    private final MedicalExamRequestRepository examRequestRepository;
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
     * POST /api/v1/medical/exam-requests
     * Body: {prestationId, patientId, consultationId, requestedBy,
     *        exams: [{orderNum, examName, clinicalInfo, comment}]}
     * Saves a batch of exam requests for a prestation.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<List<MedicalExamRequest>> saveExamRequests(@RequestBody Map<String, Object> body) {
        UUID clinicId = clinicContextHolder.getClinicId();

        UUID prestationId = parseUUID(body.get("prestationId"));
        UUID patientId = parseUUID(body.get("patientId"));
        UUID consultationId = parseUUID(body.get("consultationId"));
        String requestedBy = (String) body.getOrDefault("requestedBy", "");

        if (patientId == null) {
            return ResponseEntity.badRequest().build();
        }

        // Remove existing requests for this realization/prestation if re-saving
        if (consultationId != null) {
            List<MedicalExamRequest> existing = examRequestRepository
                    .findByConsultationIdOrderByOrderNumAsc(consultationId);
            examRequestRepository.deleteAll(existing);
        } else if (prestationId != null) {
            List<MedicalExamRequest> existing = examRequestRepository
                    .findByPrestationIdOrderByOrderNumAsc(prestationId);
            examRequestRepository.deleteAll(existing);
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> exams = (List<Map<String, Object>>) body.get("exams");
        List<MedicalExamRequest> saved = new ArrayList<>();
        if (exams != null) {
            for (Map<String, Object> e : exams) {
                MedicalExamRequest req = MedicalExamRequest.builder()
                        .clinicId(clinicId)
                        .patientId(patientId)
                        .consultationId(consultationId)
                        .prestationId(prestationId)
                        .requestedBy(requestedBy)
                        .orderNum(e.get("orderNum") != null ? ((Number) e.get("orderNum")).intValue() : null)
                        .examName((String) e.get("examName"))
                        .clinicalInfo((String) e.get("clinicalInfo"))
                        .comment((String) e.get("comment"))
                        .status("REQUESTED")
                        .build();
                saved.add(examRequestRepository.save(req));
            }
        }
        return ResponseEntity.ok(saved);
    }

    /**
     * GET /api/v1/medical/exam-requests/prestation/{prestationId}
     * Returns all exam requests for a given prestation, ordered by orderNum.
     */
    @GetMapping("/prestation/{prestationId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','LABORANTIN','ADMIN')")
    public ResponseEntity<List<MedicalExamRequest>> getByPrestation(@PathVariable UUID prestationId) {
        return ResponseEntity.ok(examRequestRepository.findByPrestationIdOrderByOrderNumAsc(prestationId));
    }

    /**
     * GET /api/v1/medical/exam-requests/consultation/{consultationId}
     * Returns all exam requests for a given consultation, ordered by orderNum.
     */
    @GetMapping("/consultation/{consultationId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','LABORANTIN','ADMIN')")
    public ResponseEntity<List<MedicalExamRequest>> getByConsultation(@PathVariable UUID consultationId) {
        return ResponseEntity.ok(examRequestRepository.findByConsultationIdOrderByOrderNumAsc(consultationId));
    }

    /**
     * GET /api/v1/medical/exam-requests/patient/{patientId}
     * Returns all exam requests for a patient, most recent first.
     */
    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','LABORANTIN','ADMIN')")
    public ResponseEntity<List<MedicalExamRequest>> getByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(examRequestRepository.findByPatientIdOrderByCreatedAtDesc(patientId));
    }
}
