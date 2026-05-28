package com.altes.alphacure.patient.service;

import com.altes.alphacure.patient.entity.*;
import com.altes.alphacure.patient.entity.enums.*;
import com.altes.alphacure.patient.exception.PatientNotFoundException;
import com.altes.alphacure.patient.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PrestationService {

    private final InvoiceLineRepository invoiceLineRepository;
    private final InvoiceRepository invoiceRepository;
    private final AssignmentRepository assignmentRepository;
    private final CancellationRequestRepository cancellationRequestRepository;
    private final PractitionerRepository practitionerRepository;
    private final PractitionerEligibilityService practitionerEligibilityService;
    private final com.altes.alphacure.patient.client.BillingClient billingClient;
    private final jakarta.servlet.http.HttpServletRequest request;
    private final InvoiceService invoiceService;
    private final PatientRepository patientRepository;

    // --- Prestations (InvoiceLines) ---

    @Transactional(readOnly = true)
    public List<InvoiceLine> getAllPrestations(UUID clinicId) {
        return invoiceLineRepository.findAllByClinicId(clinicId);
    }

    @Transactional(readOnly = true)
    public List<InvoiceLine> getPrestationsByStatus(UUID clinicId, InvoiceLineStatus status) {
        return invoiceLineRepository.findByClinicIdAndStatus(clinicId, status);
    }

    @Transactional(readOnly = true)
    public List<InvoiceLine> getTodayPrestations(UUID clinicId) {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        return invoiceLineRepository.findByClinicIdAndCreatedAtAfter(clinicId, todayStart);
    }

    // --- Assignment ---

    public Assignment assignPractitioner(UUID invoiceLineId, UUID practitionerId, String assignedBy, UUID clinicId) {
        InvoiceLine line = invoiceLineRepository.findById(invoiceLineId)
                .orElseThrow(() -> new PatientNotFoundException("Prestation non trouvée: " + invoiceLineId));

        if (line.getActId() == null) {
            throw new IllegalArgumentException("Cette prestation n'est pas liée à un acte médical.");
        }
        practitionerEligibilityService.assertEligibleAssignment(clinicId, line.getActId(), practitionerId);

        Practitioner practitioner = practitionerRepository.findById(practitionerId)
                .orElseThrow(() -> new PatientNotFoundException("Praticien non trouvé: " + practitionerId));

        // Update the invoice line
        line.setPractitionerId(practitionerId);
        invoiceLineRepository.save(line);

        // Create assignment record
        Assignment assignment = Assignment.builder()
                .invoiceLineId(invoiceLineId)
                .practitionerId(practitionerId)
                .assignedBy(assignedBy)
                .build();

        Assignment saved = assignmentRepository.save(assignment);
        log.info("Prestation {} affectée au praticien {} par {}", invoiceLineId, practitioner.getFullName(), assignedBy);
        return saved;
    }

    @Transactional(readOnly = true)
    public long getWaitingCount(UUID practitionerId) {
        return invoiceLineRepository.countByPractitionerIdAndStatus(practitionerId, InvoiceLineStatus.EN_ATTENTE);
    }

    // --- Abandon (unpaid act) ---

    public CancellationRequest abandonPrestation(UUID invoiceLineId, String reason, String requestedBy) {
        InvoiceLine line = invoiceLineRepository.findById(invoiceLineId)
                .orElseThrow(() -> new PatientNotFoundException("Prestation non trouvée: " + invoiceLineId));

        if (line.getStatus() != InvoiceLineStatus.EN_ATTENTE) {
            throw new IllegalStateException("Seules les prestations en attente peuvent être abandonnées.");
        }

        line.setStatus(InvoiceLineStatus.ABANDONNEE);
        invoiceLineRepository.save(line);

        CancellationRequest request = CancellationRequest.builder()
                .invoiceLineId(invoiceLineId)
                .type(CancellationType.ABANDON)
                .reason(reason)
                .requestedBy(requestedBy)
                .validationStatus(ValidationStatus.APPROVED) // Auto-approved for abandons
                .validatedAt(LocalDateTime.now())
                .build();

        CancellationRequest saved = cancellationRequestRepository.save(request);
        log.info("Prestation {} abandonnée: {}", invoiceLineId, reason);
        return saved;
    }

    // --- Cancel (paid act → refund workflow) ---

    public CancellationRequest cancelPrestation(UUID invoiceLineId, String reason, String requestedBy) {
        InvoiceLine line = invoiceLineRepository.findById(invoiceLineId)
                .orElseThrow(() -> new PatientNotFoundException("Prestation non trouvée: " + invoiceLineId));

        if (line.getStatus() != InvoiceLineStatus.REGLEE) {
            throw new IllegalStateException("Seules les prestations réglées peuvent être annulées.");
        }

        line.setStatus(InvoiceLineStatus.ANNULEE);
        invoiceLineRepository.save(line);

        CancellationRequest.CancellationRequestBuilder requestBuilder = CancellationRequest.builder()
                .invoiceLineId(invoiceLineId)
                .type(CancellationType.ANNULATION)
                .reason(reason)
                .requestedBy(requestedBy);

        if (line.getNature() == ActNature.SEANCES) {
            requestBuilder.validationStatus(ValidationStatus.APPROVED)
                    .refundAmount(BigDecimal.ZERO)
                    .validatedAt(LocalDateTime.now())
                    .validatedBy(requestedBy);
            log.info("Séance {} annulée — remise en attente de programmation (sans remboursement)", invoiceLineId);
        } else {
            requestBuilder.validationStatus(ValidationStatus.PENDING) // Requires approval
                    .refundAmount(line.getPatientShare() != null ? line.getPatientShare() : BigDecimal.ZERO);
            log.info("Prestation {} annulée — remboursement en attente de validation: {}", invoiceLineId, reason);
        }

        CancellationRequest saved = cancellationRequestRepository.save(requestBuilder.build());
        return saved;
    }

    // --- Refund Validation ---

    public CancellationRequest approveRefund(UUID requestId, String validatedBy) {
        CancellationRequest requestObj = cancellationRequestRepository.findById(requestId)
                .orElseThrow(() -> new PatientNotFoundException("Demande d'annulation non trouvée: " + requestId));

        if (requestObj.getValidationStatus() != ValidationStatus.PENDING) {
            throw new IllegalStateException("Cette demande a déjà été traitée.");
        }

        // 1. Verify active session and log disbursement in billing service first!
        
        
        
        InvoiceLine line = invoiceLineRepository.findById(requestObj.getInvoiceLineId()).orElse(null);

        try {
            billingClient.addTransaction(java.util.Map.of(
                "type", "DECAISSEMENT",
                "amount", requestObj.getRefundAmount(),
                "label", "Remboursement Prestation: " + (line != null ? line.getActName() : "Inconnue"),
                "paymentMethod", "ESPECES",
                "referenceId", requestObj.getId().toString()
            ));
        } catch (Exception e) {
            log.error("Failed to log refund transaction to billing-service", e);
            throw new IllegalStateException("Impossible de valider le remboursement : Le solde de caisse de la session active est insuffisant (l'écart doit être couvert) ou aucune session n'est ouverte.");
        }

        requestObj.setValidationStatus(ValidationStatus.APPROVED);
        requestObj.setValidatedBy(validatedBy);
        requestObj.setValidatedAt(LocalDateTime.now());

        // Mark line as refunded
        if (line != null) {
            line.setStatus(InvoiceLineStatus.REMBOURSEE);
            invoiceLineRepository.save(line);

            // Recalculate patient financial fields
            try {
                Invoice inv = invoiceRepository.findById(line.getInvoiceId()).orElse(null);
                if (inv != null) {
                    invoiceService.recalculatePatientFinancials(inv.getPatientId());
                }
            } catch (Exception ex) {
                log.error("Failed to recalculate patient financials after refund approval", ex);
            }
        }

        CancellationRequest saved = cancellationRequestRepository.save(requestObj);
        log.info("Remboursement approuvé pour la demande {} par {}", requestId, validatedBy);
        return saved;
    }

    public CancellationRequest rejectRefund(UUID requestId, String validatedBy) {
        CancellationRequest request = cancellationRequestRepository.findById(requestId)
                .orElseThrow(() -> new PatientNotFoundException("Demande d'annulation non trouvée: " + requestId));

        if (request.getValidationStatus() != ValidationStatus.PENDING) {
            throw new IllegalStateException("Cette demande a déjà été traitée.");
        }

        request.setValidationStatus(ValidationStatus.REJECTED);
        request.setValidatedBy(validatedBy);
        request.setValidatedAt(LocalDateTime.now());

        // Restore line to REGLEE
        InvoiceLine line = invoiceLineRepository.findById(request.getInvoiceLineId()).orElse(null);
        if (line != null) {
            line.setStatus(InvoiceLineStatus.REGLEE);
            invoiceLineRepository.save(line);
        }

        CancellationRequest saved = cancellationRequestRepository.save(request);
        log.info("Remboursement rejeté pour la demande {} par {}", requestId, validatedBy);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<CancellationRequest> getPendingCancellations() {
        return cancellationRequestRepository.findByValidationStatusOrderByRequestedAtDesc(ValidationStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public List<java.util.Map<String, Object>> getPendingCancellationsWithDetails(UUID clinicId) {
        List<CancellationRequest> requests = cancellationRequestRepository.findByValidationStatusOrderByRequestedAtDesc(ValidationStatus.PENDING);
        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (CancellationRequest req : requests) {
            InvoiceLine line = invoiceLineRepository.findById(req.getInvoiceLineId()).orElse(null);
            if (line == null) continue;
            
            Invoice invoice = invoiceRepository.findById(line.getInvoiceId()).orElse(null);
            if (invoice == null) continue;
            
            if (clinicId != null && !clinicId.equals(invoice.getClinicId())) {
                continue;
            }
            
            Patient patient = patientRepository.findById(invoice.getPatientId()).orElse(null);
            
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", req.getId());
            map.put("invoiceLineId", req.getInvoiceLineId());
            map.put("type", req.getType());
            map.put("reason", req.getReason());
            map.put("requestedBy", req.getRequestedBy());
            map.put("requestedAt", req.getRequestedAt());
            map.put("refundAmount", req.getRefundAmount());
            map.put("validationStatus", req.getValidationStatus());
            
            map.put("actName", line.getActName());
            map.put("patientName", patient != null ? (patient.getFirstName() + " " + patient.getLastName()) : "Patient inconnu");
            map.put("invoiceRef", invoice.getInvoiceRef());
            
            result.add(map);
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<InvoiceLine> getPatientPrestations(UUID patientId) {
        return invoiceLineRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional(readOnly = true)
    public List<InvoiceLine> getPatientPrestationsByStatus(UUID patientId, InvoiceLineStatus status) {
        return invoiceLineRepository.findByPatientIdAndStatusOrderByCreatedAtDesc(patientId, status);
    }

    @Transactional(readOnly = true)
    public InvoiceLine getPrestationById(UUID id) {
        return invoiceLineRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException("Prestation non trouvée: " + id));
    }
}
