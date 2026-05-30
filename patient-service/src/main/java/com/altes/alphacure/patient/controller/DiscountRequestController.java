package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.entity.DiscountRequest;
import com.altes.alphacure.patient.entity.Invoice;
import com.altes.alphacure.patient.entity.InvoiceLine;
import com.altes.alphacure.patient.entity.Patient;
import com.altes.alphacure.patient.entity.enums.ValidationStatus;
import com.altes.alphacure.patient.entity.enums.InvoiceStatus;
import com.altes.alphacure.patient.repository.DiscountRequestRepository;
import com.altes.alphacure.patient.repository.InvoiceLineRepository;
import com.altes.alphacure.patient.repository.InvoiceRepository;
import com.altes.alphacure.patient.repository.PatientRepository;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import com.altes.alphacure.patient.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/invoices/discount-requests")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Demandes de Réduction", description = "Gestion des demandes de réduction sur factures")
public class DiscountRequestController {

    private final DiscountRequestRepository discountRequestRepository;
    private final InvoiceRepository invoiceRepository;
    private final InvoiceLineRepository invoiceLineRepository;
    private final PatientRepository patientRepository;
    private final InvoiceService invoiceService;
    private final ClinicContextHolder clinicContextHolder;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE')")
    @Operation(summary = "Créer une demande de réduction")
    public ResponseEntity<?> createRequest(@RequestBody Map<String, Object> body) {
        UUID clinicId = clinicContextHolder.getClinicId();
        String username = clinicContextHolder.getUsername();

        UUID invoiceId = UUID.fromString((String) body.get("invoiceId"));
        UUID patientId = UUID.fromString((String) body.get("patientId"));
        BigDecimal proposedAmount = new BigDecimal(body.get("proposedAmount").toString());

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Facture non trouvée"));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cette facture est déjà payée."));
        }

        // Check if there is already a pending discount request for this invoice
        if (discountRequestRepository.existsByInvoiceIdAndStatus(invoiceId, ValidationStatus.PENDING)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Une demande de réduction est déjà en cours pour cette facture."));
        }

        BigDecimal originalPatientAmount = invoice.getPatientAmount();
        if (proposedAmount.compareTo(originalPatientAmount) >= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le montant proposé doit être inférieur au montant actuel du patient."));
        }

        BigDecimal discountAmount = originalPatientAmount.subtract(proposedAmount);
        BigDecimal discountPercent = BigDecimal.ZERO;
        if (originalPatientAmount.compareTo(BigDecimal.ZERO) > 0) {
            discountPercent = discountAmount.multiply(BigDecimal.valueOf(100))
                    .divide(originalPatientAmount, 2, RoundingMode.HALF_UP);
        }

        DiscountRequest request = DiscountRequest.builder()
                .clinicId(clinicId)
                .invoiceId(invoiceId)
                .patientId(patientId)
                .originalPatientAmount(originalPatientAmount)
                .proposedPatientAmount(proposedAmount)
                .discountAmount(discountAmount)
                .discountPercent(discountPercent)
                .status(ValidationStatus.PENDING)
                .requestedBy(username != null ? username : "anonymous")
                .build();

        DiscountRequest saved = discountRequestRepository.save(request);
        log.info("Demande de réduction créée pour la facture {} : réduction de {} FCFA ({}%)", 
                invoice.getInvoiceRef(), discountAmount, discountPercent);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('ADMIN','COMPTABLE','MANAGER_CLINIQUE')")
    @Operation(summary = "Lister les demandes de réduction en attente")
    public ResponseEntity<List<Map<String, Object>>> getPendingRequests() {
        UUID clinicId = clinicContextHolder.getClinicId();
        List<DiscountRequest> pending = discountRequestRepository.findByClinicIdAndStatusOrderByRequestedAtDesc(clinicId, ValidationStatus.PENDING);
        
        List<Map<String, Object>> response = new ArrayList<>();
        for (DiscountRequest req : pending) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", req.getId().toString());
            map.put("invoiceId", req.getInvoiceId().toString());
            map.put("patientId", req.getPatientId().toString());
            map.put("originalPatientAmount", req.getOriginalPatientAmount());
            map.put("proposedPatientAmount", req.getProposedPatientAmount());
            map.put("discountAmount", req.getDiscountAmount());
            map.put("discountPercent", req.getDiscountPercent());
            map.put("status", req.getStatus());
            map.put("requestedBy", req.getRequestedBy());
            map.put("requestedAt", req.getRequestedAt());

            // Enrich with patient details
            Patient p = patientRepository.findById(req.getPatientId()).orElse(null);
            if (p != null) {
                map.put("patientName", p.getFullName());
                map.put("patientCode", p.getPatientCode());
                map.put("patientTotalPrestations", p.getNombrePrestations());
                map.put("patientTotalAmount", p.getMontantChiffreAffaire());
            }

            // Enrich with invoice details
            Invoice inv = invoiceRepository.findById(req.getInvoiceId()).orElse(null);
            if (inv != null) {
                map.put("invoiceRef", inv.getInvoiceRef());
            }

            response.add(map);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/validate")
    @PreAuthorize("hasAnyRole('ADMIN','COMPTABLE','MANAGER_CLINIQUE')")
    @Operation(summary = "Valider (Accepter/Rejeter) une demande de réduction")
    public ResponseEntity<?> validateRequest(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        String username = clinicContextHolder.getUsername();
        String statusStr = (String) body.get("status");
        ValidationStatus validationStatus = ValidationStatus.valueOf(statusStr.toUpperCase());

        DiscountRequest request = discountRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Demande de réduction non trouvée"));

        if (request.getStatus() != ValidationStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cette demande a déjà été traitée."));
        }

        request.setStatus(validationStatus);
        request.setResolvedBy(username != null ? username : "anonymous");
        request.setResolvedAt(LocalDateTime.now());

        if (validationStatus == ValidationStatus.APPROVED) {
            Invoice invoice = invoiceRepository.findById(request.getInvoiceId())
                    .orElseThrow(() -> new IllegalArgumentException("Facture non trouvée"));

            if (invoice.getStatus() == InvoiceStatus.PAID) {
                return ResponseEntity.badRequest().body(Map.of("message", "Cette facture est déjà payée."));
            }

            BigDecimal originalPatientAmount = request.getOriginalPatientAmount();
            BigDecimal proposedPatientAmount = request.getProposedPatientAmount();

            if (originalPatientAmount.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal factor = proposedPatientAmount.divide(originalPatientAmount, 10, RoundingMode.HALF_UP);
                
                List<InvoiceLine> lines = invoiceLineRepository.findByInvoiceIdOrderByCreatedAtAsc(invoice.getId());
                BigDecimal calculatedPatientSum = BigDecimal.ZERO;

                for (InvoiceLine line : lines) {
                    BigDecimal oldPatientShare = line.getPatientShare() != null ? line.getPatientShare() : BigDecimal.ZERO;
                    BigDecimal newPatientShare = oldPatientShare.multiply(factor).setScale(2, RoundingMode.HALF_UP);
                    line.setPatientShare(newPatientShare);

                    BigDecimal oldUnitPrice = line.getUnitPrice() != null ? line.getUnitPrice() : BigDecimal.ZERO;
                    BigDecimal newUnitPrice = oldUnitPrice.multiply(factor).setScale(2, RoundingMode.HALF_UP);
                    line.setUnitPrice(newUnitPrice);

                    BigDecimal oldTotalPrice = line.getTotalPrice() != null ? line.getTotalPrice() : BigDecimal.ZERO;
                    BigDecimal newTotalPrice = oldTotalPrice.multiply(factor).setScale(2, RoundingMode.HALF_UP);
                    line.setTotalPrice(newTotalPrice);

                    BigDecimal oldInsuranceShare = line.getInsuranceShare() != null ? line.getInsuranceShare() : BigDecimal.ZERO;
                    BigDecimal newInsuranceShare = oldInsuranceShare.multiply(factor).setScale(2, RoundingMode.HALF_UP);
                    line.setInsuranceShare(newInsuranceShare);

                    calculatedPatientSum = calculatedPatientSum.add(newPatientShare);
                }

                // Adjust cent rounding on the last line's patient share
                if (!lines.isEmpty() && calculatedPatientSum.compareTo(proposedPatientAmount) != 0) {
                    BigDecimal diff = proposedPatientAmount.subtract(calculatedPatientSum);
                    InvoiceLine lastLine = lines.get(lines.size() - 1);
                    BigDecimal adjustedPatientShare = lastLine.getPatientShare().add(diff);
                    lastLine.setPatientShare(adjustedPatientShare);
                    
                    // Keep total price consistent on the adjusted line
                    lastLine.setTotalPrice(lastLine.getInsuranceShare().add(adjustedPatientShare));
                }

                invoiceLineRepository.saveAll(lines);

                // Recompute invoice totals
                BigDecimal totalAmount = BigDecimal.ZERO;
                BigDecimal insuranceAmount = BigDecimal.ZERO;
                BigDecimal patientAmount = BigDecimal.ZERO;
                for (InvoiceLine line : lines) {
                    totalAmount = totalAmount.add(line.getTotalPrice());
                    insuranceAmount = insuranceAmount.add(line.getInsuranceShare());
                    patientAmount = patientAmount.add(line.getPatientShare());
                }

                invoice.setTotalAmount(totalAmount);
                invoice.setInsuranceAmount(insuranceAmount);
                invoice.setPatientAmount(patientAmount); // equal to proposedPatientAmount
            }

            invoiceRepository.save(invoice);
            
            // Recalculate patient financials
            invoiceService.recalculatePatientFinancials(invoice.getPatientId());
            log.info("Demande de réduction approuvée pour la facture {} : nouveau montant patient = {}", 
                    invoice.getInvoiceRef(), invoice.getPatientAmount());
        } else {
            log.info("Demande de réduction rejetée pour la facture {}", request.getInvoiceId());
        }

        DiscountRequest saved = discountRequestRepository.save(request);
        return ResponseEntity.ok(saved);
    }
}
