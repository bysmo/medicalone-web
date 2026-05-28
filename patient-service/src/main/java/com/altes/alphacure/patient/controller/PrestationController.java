package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.entity.Assignment;
import com.altes.alphacure.patient.entity.CancellationRequest;
import com.altes.alphacure.patient.entity.InvoiceLine;
import com.altes.alphacure.patient.entity.enums.InvoiceLineStatus;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import com.altes.alphacure.patient.service.PrestationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/prestations")
@RequiredArgsConstructor
@Tag(name = "Prestations", description = "Gestion des prestations médicales (lignes de factures)")
public class PrestationController {

    private final PrestationService prestationService;
    private final com.altes.alphacure.patient.service.PractitionerEligibilityService practitionerEligibilityService;
    private final ClinicContextHolder clinicContextHolder;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Lister toutes les prestations de la clinique")
    public ResponseEntity<List<InvoiceLine>> getAllPrestations(
            @RequestParam(required = false) String status) {
        UUID clinicId = clinicContextHolder.getClinicId();
        if (status != null && !status.isEmpty()) {
            InvoiceLineStatus lineStatus = InvoiceLineStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(prestationService.getPrestationsByStatus(clinicId, lineStatus));
        }
        return ResponseEntity.ok(prestationService.getAllPrestations(clinicId));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE')")
    @Operation(summary = "Lister toutes les prestations d'un patient")
    public ResponseEntity<List<InvoiceLine>> getPatientPrestations(
            @PathVariable UUID patientId,
            @RequestParam(required = false) String status) {
        if (status != null && !status.isEmpty()) {
            InvoiceLineStatus lineStatus = InvoiceLineStatus.valueOf(status.toUpperCase());
            return ResponseEntity.ok(prestationService.getPatientPrestationsByStatus(patientId, lineStatus));
        }
        return ResponseEntity.ok(prestationService.getPatientPrestations(patientId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE')")
    @Operation(summary = "Obtenir une prestation par son ID")
    public ResponseEntity<InvoiceLine> getPrestationById(@PathVariable UUID id) {
        return ResponseEntity.ok(prestationService.getPrestationById(id));
    }

    @GetMapping("/today")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE')")
    @Operation(summary = "Lister les prestations du jour")
    public ResponseEntity<List<InvoiceLine>> getTodayPrestations() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(prestationService.getTodayPrestations(clinicId));
    }

    @GetMapping("/eligible-practitioners")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE')")
    @Operation(summary = "Lister les praticiens éligibles pour un acte (même spécialité)")
    public ResponseEntity<List<com.altes.alphacure.patient.entity.Practitioner>> getEligiblePractitioners(
            @RequestParam UUID actId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(practitionerEligibilityService.findEligibleForAct(clinicId, actId));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE')")
    @Operation(summary = "Affecter une prestation à un praticien")
    public ResponseEntity<Assignment> assignPractitioner(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        UUID practitionerId = UUID.fromString(body.get("practitionerId"));
        String assignedBy = body.getOrDefault("assignedBy", "system");
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(prestationService.assignPractitioner(id, practitionerId, assignedBy, clinicId));
    }

    @PostMapping("/{id}/abandon")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE')")
    @Operation(summary = "Abandonner une prestation non réglée")
    public ResponseEntity<CancellationRequest> abandonPrestation(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        String requestedBy = body.getOrDefault("requestedBy", "system");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(prestationService.abandonPrestation(id, reason, requestedBy));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE')")
    @Operation(summary = "Annuler une prestation réglée (demande de remboursement)")
    public ResponseEntity<CancellationRequest> cancelPrestation(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        String requestedBy = body.getOrDefault("requestedBy", "system");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(prestationService.cancelPrestation(id, reason, requestedBy));
    }

    @GetMapping("/{practitionerId}/waiting-count")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEDECIN', 'INFIRMIER', 'RECEPTIONNISTE')")
    @Operation(summary = "Nombre de prestations en attente chez un praticien")
    public ResponseEntity<Map<String, Long>> getWaitingCount(@PathVariable UUID practitionerId) {
        long count = prestationService.getWaitingCount(practitionerId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    // --- Cancellation Validation ---
 
    @GetMapping("/cancellations/pending")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER_CLINIQUE', 'CAISSIER')")
    @Operation(summary = "Lister les demandes d'annulation en attente de validation")
    public ResponseEntity<List<Map<String, Object>>> getPendingCancellations() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(prestationService.getPendingCancellationsWithDetails(clinicId));
    }
 
    @PostMapping("/cancellations/{id}/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER_CLINIQUE', 'CAISSIER')")
    @Operation(summary = "Valider un remboursement")
    public ResponseEntity<CancellationRequest> approveRefund(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String validatedBy = clinicContextHolder.getUsername();
        if (validatedBy == null || validatedBy.isBlank()) {
            validatedBy = body.getOrDefault("validatedBy", "admin");
        }
        return ResponseEntity.ok(prestationService.approveRefund(id, validatedBy));
    }
 
    @PostMapping("/cancellations/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER_CLINIQUE', 'CAISSIER')")
    @Operation(summary = "Rejeter un remboursement")
    public ResponseEntity<CancellationRequest> rejectRefund(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        String validatedBy = clinicContextHolder.getUsername();
        if (validatedBy == null || validatedBy.isBlank()) {
            validatedBy = body.getOrDefault("validatedBy", "admin");
        }
        return ResponseEntity.ok(prestationService.rejectRefund(id, validatedBy));
    }
}
