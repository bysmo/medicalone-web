package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.Consultation;
import com.altes.alphacure.medicalrecord.security.ClinicContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medical")
@RequiredArgsConstructor
public class MedicalConsultationController {

    private final MedicalConsultationService consultationService;
    private final ClinicContextHolder clinicContextHolder;

    /**
     * GET /api/v1/medical/queue?practitionerId=...
     * Returns the doctor's EN_ATTENTE queue for today.
     */
    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    public ResponseEntity<List<Consultation>> getQueue(
            @RequestParam UUID practitionerId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.getQueue(clinicId, practitionerId));
    }

    /**
     * GET /api/v1/medical/practitioner/{practitionerId}/day-queue
     * Consultations du jour pour la file d'attente (tous statuts médicaux).
     */
    @GetMapping("/practitioner/{practitionerId}/day-queue")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    public ResponseEntity<List<Consultation>> getPractitionerDayQueue(@PathVariable UUID practitionerId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.getPractitionerDayQueue(clinicId, practitionerId));
    }

    /**
     * GET /api/v1/medical/practitioner/{practitionerId}/consultations?days=90&status=TERMINEE
     */
    @GetMapping("/practitioner/{practitionerId}/consultations")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    public ResponseEntity<List<Consultation>> getPractitionerConsultations(
            @PathVariable UUID practitionerId,
            @RequestParam(defaultValue = "90") int days,
            @RequestParam(required = false) String status) {
        UUID clinicId = clinicContextHolder.getClinicId();
        com.altes.alphacure.medicalrecord.entity.MedicalStatus filter = null;
        if (status != null && !status.isBlank()) {
            filter = com.altes.alphacure.medicalrecord.entity.MedicalStatus.valueOf(status.toUpperCase());
        }
        return ResponseEntity.ok(
                consultationService.getPractitionerConsultations(clinicId, practitionerId, days, filter));
    }

    /**
     * GET /api/v1/medical/vitals-queue
     * Returns patients needing vitals today (no vitals recorded yet, status EN_ATTENTE).
     */
    @GetMapping("/vitals-queue")
    @PreAuthorize("hasAnyRole('INFIRMIER','MEDECIN','ADMIN')")
    public ResponseEntity<List<Consultation>> getVitalsQueue() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.getPatientsForVitals(clinicId));
    }

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
     * POST /api/v1/medical/consultations
     * Body: {prestationId, patientId, practitionerId, nature, actName, forceNew}
     * Creates or fetches an existing consultation linked to the prestation.
     */
    @PostMapping("/consultations")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','RECEPTIONNISTE','ADMIN')")
    public ResponseEntity<Consultation> getOrCreateConsultation(@RequestBody Map<String, String> body) {
        UUID clinicId = clinicContextHolder.getClinicId();
        UUID prestationId = parseUUID(body.get("prestationId"));
        UUID patientId = parseUUID(body.get("patientId"));
        UUID practitionerId = parseUUID(body.get("practitionerId"));
        String nature = body.get("nature");
        String actName = body.get("actName");
        boolean forceNew = Boolean.parseBoolean(body.get("forceNew"));

        if (patientId == null) {
            return ResponseEntity.badRequest().build();
        }

        if (forceNew) {
            Consultation newConsultation = Consultation.builder()
                    .clinicId(clinicId)
                    .patientId(patientId)
                    .practitionerId(practitionerId)
                    .prestationId(prestationId)
                    .nature(nature)
                    .actName(actName)
                    .medicalStatus(com.altes.alphacure.medicalrecord.entity.MedicalStatus.EN_ATTENTE)
                    .build();
            return ResponseEntity.ok(consultationService.createConsultation(newConsultation));
        }

        return ResponseEntity.ok(
                consultationService.getOrCreateConsultation(prestationId, patientId, practitionerId, clinicId, nature, actName));
    }

    /**
     * PUT /api/v1/medical/consultations/{id}/start
     * Transitions consultation to DEMARREE.
     */
    @PutMapping("/consultations/{id}/start")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    public ResponseEntity<Consultation> startConsultation(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.startConsultation(id, clinicId));
    }

    /**
     * PUT /api/v1/medical/consultations/{id}/end
     * Transitions consultation to TERMINEE.
     */
    @PutMapping("/consultations/{id}/end")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    public ResponseEntity<Consultation> endConsultation(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.endConsultation(id, clinicId));
    }

    /**
     * GET /api/v1/medical/patients/{patientId}/history
     * Returns all consultations for a patient ordered by date desc.
     */
    @GetMapping("/patients/{patientId}/history")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<List<Consultation>> getPatientHistory(@PathVariable UUID patientId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.getPatientHistory(patientId, clinicId));
    }

    /**
     * GET /api/v1/medical/consultations/{id}
     * Returns a single consultation detail.
     */
    @GetMapping("/consultations/{id}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<Consultation> getConsultation(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.getConsultation(id, clinicId));
    }

    @GetMapping("/consultations/seances")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE')")
    public ResponseEntity<List<Consultation>> getSeancesConsultations() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.getSeancesConsultations(clinicId));
    }

    @PutMapping("/consultations/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE')")
    public ResponseEntity<Consultation> assignPractitioner(
            @PathVariable UUID id,
            @RequestParam UUID practitionerId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(consultationService.assignPractitioner(id, practitionerId, clinicId));
    }

    @DeleteMapping("/consultations/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE')")
    public ResponseEntity<Void> deleteConsultation(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        consultationService.deleteConsultation(id, clinicId);
        return ResponseEntity.noContent().build();
    }
}
