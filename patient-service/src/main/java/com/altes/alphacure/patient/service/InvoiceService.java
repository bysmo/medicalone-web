package com.altes.alphacure.patient.service;

import com.altes.alphacure.patient.client.ClinicClient;
import com.altes.alphacure.patient.client.NumberingDocumentType;
import com.altes.alphacure.patient.entity.enums.TariffType;
import com.altes.alphacure.patient.entity.Invoice;
import com.altes.alphacure.patient.entity.InvoiceLine;
import com.altes.alphacure.patient.entity.enums.InvoiceStatus;
import com.altes.alphacure.patient.exception.PatientNotFoundException;
import com.altes.alphacure.patient.repository.InvoiceLineRepository;
import com.altes.alphacure.patient.repository.InvoiceRepository;
import com.altes.alphacure.patient.repository.DiscountRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceLineRepository invoiceLineRepository;
    private final DiscountRequestRepository discountRequestRepository;
    private final com.altes.alphacure.patient.repository.PatientRepository patientRepository;
    private final ClinicClient clinicClient;
    private final com.altes.alphacure.patient.security.ClinicContextHolder clinicContextHolder;

    public Invoice createInvoice(Invoice invoice, List<InvoiceLine> lines) {
        // Generate reference
        NumberingDocumentType docType = NumberingDocumentType.PATIENT_INVOICE;
        if (invoice.getTariffType() == TariffType.ASSURE_NATIONAL
                || invoice.getTariffType() == TariffType.ASSURE_INTERNATIONAL
                || (invoice.getCoverageRate() != null && invoice.getCoverageRate() > 0)) {
            docType = NumberingDocumentType.INSURANCE_INVOICE;
        }

        String ref = null;
        try {
            ref = clinicClient.getNextNumber(docType, null);
        } catch (Exception e) {
            log.error("[Invoice] Échec génération référence automatique: {}", e.getMessage());
            long count = invoiceRepository.countByClinicId(invoice.getClinicId());
            ref = String.format("FAC-%d-%04d", LocalDate.now().getYear(), count + 1);
        }
        invoice.setInvoiceRef(ref);

        // Calculate totals
        BigDecimal totalAmount = BigDecimal.ZERO;
        for (InvoiceLine line : lines) {
            BigDecimal lineTotal = line.getUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity()));
            line.setTotalPrice(lineTotal);

            BigDecimal insuranceShare = BigDecimal.ZERO;
            if (invoice.getCoverageRate() != null && invoice.getCoverageRate() > 0) {
                insuranceShare = lineTotal.multiply(BigDecimal.valueOf(invoice.getCoverageRate()))
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
            }
            line.setInsuranceShare(insuranceShare);
            line.setPatientShare(lineTotal.subtract(insuranceShare));

            totalAmount = totalAmount.add(lineTotal);
        }

        BigDecimal insuranceAmount = BigDecimal.ZERO;
        if (invoice.getCoverageRate() != null && invoice.getCoverageRate() > 0) {
            insuranceAmount = totalAmount.multiply(BigDecimal.valueOf(invoice.getCoverageRate()))
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        }

        invoice.setTotalAmount(totalAmount);
        invoice.setInsuranceAmount(insuranceAmount);
        invoice.setPatientAmount(totalAmount.subtract(insuranceAmount));
        if (invoice.getStatus() == null) {
            invoice.setStatus(InvoiceStatus.PENDING);
        }

        Invoice saved = invoiceRepository.save(invoice);

        String username = clinicContextHolder.getUsername();
        String creator = username != null ? username : "system";

        // Save lines with invoice ID
        for (InvoiceLine line : lines) {
            line.setInvoiceId(saved.getId());
            line.setCreatedBy(creator);
            if (saved.getStatus() == InvoiceStatus.PAID) {
                line.setStatus(com.altes.alphacure.patient.entity.enums.InvoiceLineStatus.REGLEE);
            }
        }
        invoiceLineRepository.saveAll(lines);

        // Recalculate patient financial fields
        try {
            recalculatePatientFinancials(saved.getPatientId());
        } catch (Exception e) {
            log.error("Error recalculating patient financials during invoice creation", e);
        }

        log.info("Facture créée: {} — total: {} FCFA", ref, totalAmount);
        return saved;
    }

    public Invoice payInvoice(UUID id) {
        if (discountRequestRepository.existsByInvoiceIdAndStatus(id, com.altes.alphacure.patient.entity.enums.ValidationStatus.PENDING)) {
            throw new IllegalStateException("Paiement impossible : une demande de réduction est en cours pour cette facture.");
        }
        Invoice invoice = getInvoiceById(id);
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new IllegalStateException("Cette facture est déjà payée.");
        }
        invoice.setStatus(InvoiceStatus.PAID);
        Invoice saved = invoiceRepository.save(invoice);

        // Update all associated lines to REGLEE status
        List<InvoiceLine> lines = invoiceLineRepository.findByInvoiceIdOrderByCreatedAtAsc(saved.getId());
        for (InvoiceLine line : lines) {
            if (line.getStatus() == com.altes.alphacure.patient.entity.enums.InvoiceLineStatus.EN_ATTENTE) {
                line.setStatus(com.altes.alphacure.patient.entity.enums.InvoiceLineStatus.REGLEE);
            }
        }
        invoiceLineRepository.saveAll(lines);

        // Recalculate financials
        recalculatePatientFinancials(saved.getPatientId());

        return saved;
    }

    public void recalculatePatientFinancials(UUID patientId) {
        com.altes.alphacure.patient.entity.Patient patient = patientRepository.findById(patientId).orElse(null);
        if (patient == null) return;

        List<Invoice> invoices = invoiceRepository.findByPatientIdOrderByCreatedAtDesc(patientId);

        BigDecimal ca = BigDecimal.ZERO;
        int nombrePrestations = 0;
        BigDecimal totalRegle = BigDecimal.ZERO;
        BigDecimal totalImpaye = BigDecimal.ZERO;
        BigDecimal totalARembourser = BigDecimal.ZERO;

        for (Invoice inv : invoices) {
            BigDecimal patientAmt = inv.getPatientAmount() != null ? inv.getPatientAmount() : BigDecimal.ZERO;
            ca = ca.add(patientAmt);

            if (inv.getStatus() == InvoiceStatus.PAID) {
                totalRegle = totalRegle.add(patientAmt);
                // Count lines
                List<InvoiceLine> lines = invoiceLineRepository.findByInvoiceIdOrderByCreatedAtAsc(inv.getId());
                nombrePrestations += lines.stream().mapToInt(InvoiceLine::getQuantity).sum();
            } else if (inv.getStatus() == InvoiceStatus.PENDING) {
                totalImpaye = totalImpaye.add(patientAmt);
            }
        }

        patient.setMontantChiffreAffaire(ca);
        patient.setNombrePrestations(nombrePrestations);
        patient.setMontantTotalRegle(totalRegle);
        patient.setMontantTotalImpaye(totalImpaye);
        patient.setMontantTotalARembourser(totalARembourser);

        patientRepository.save(patient);
        log.info("Suivi financier du patient {} mis à jour: CA={}, Regle={}, Impaye={}", 
            patient.getFullName(), ca, totalRegle, totalImpaye);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceById(UUID id) {
        return invoiceRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException("Facture non trouvée: " + id));
    }

    @Transactional(readOnly = true)
    public List<Invoice> getInvoicesByPatient(UUID patientId) {
        return invoiceRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional(readOnly = true)
    public List<Invoice> getInvoicesByClinic(UUID clinicId) {
        return invoiceRepository.findByClinicIdOrderByCreatedAtDesc(clinicId);
    }

    @Transactional(readOnly = true)
    public List<InvoiceLine> getInvoiceLines(UUID invoiceId) {
        return invoiceLineRepository.findByInvoiceIdOrderByCreatedAtAsc(invoiceId);
    }
}
