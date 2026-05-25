package com.altes.alphacure.billing.service;

import com.altes.alphacure.billing.dto.InvoiceCreateRequest;
import com.altes.alphacure.billing.dto.InvoiceLineRequest;
import com.altes.alphacure.billing.entity.*;
import com.altes.alphacure.billing.event.InvoiceCreatedEvent;
import com.altes.alphacure.billing.exception.BillingException;
import com.altes.alphacure.billing.repository.InvoiceRepository;
import com.altes.alphacure.billing.repository.MedicalActRepository;
import com.altes.alphacure.billing.repository.PricingRuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BillingService {

    private static final String TOPIC_INVOICE_CREATED = "invoice.created";

    private final InvoiceRepository invoiceRepository;
    private final MedicalActRepository medicalActRepository;
    private final PricingRuleRepository pricingRuleRepository;
    private final KafkaTemplate<String, InvoiceCreatedEvent> kafkaTemplate;

    /**
     * Crée une facture en vérifiant les contraintes métier :
     * - Aucune double facturation (pas de facture DRAFT/CONFIRMED active)
     * - Application automatique du tarif selon type
     * - Calcul séparé patient / assurance
     */
    public Invoice createInvoice(UUID clinicId, InvoiceCreateRequest request) {
        UUID patientId = request.getPatientId();

        // Contrainte : pas de double facturation
        List<InvoiceStatus> activeStatuses = List.of(InvoiceStatus.DRAFT, InvoiceStatus.CONFIRMED);
        if (invoiceRepository.existsByPatientIdAndClinicIdAndStatusIn(patientId, clinicId, activeStatuses)) {
            throw new BillingException("Une facture active existe déjà pour ce patient. Soldez-la avant d'en créer une nouvelle.");
        }

        Invoice invoice = Invoice.builder()
                .clinicId(clinicId)
                .patientId(patientId)
                .status(InvoiceStatus.DRAFT)
                .totalPatientAmount(BigDecimal.ZERO)
                .totalAssuranceAmount(BigDecimal.ZERO)
                .build();

        List<InvoiceLine> lines = new ArrayList<>();
        BigDecimal totalPatient = BigDecimal.ZERO;
        BigDecimal totalAssurance = BigDecimal.ZERO;

        for (InvoiceLineRequest lineReq : request.getLines()) {
            MedicalAct act = medicalActRepository.findById(lineReq.getMedicalActId())
                    .orElseThrow(() -> new BillingException("Acte médical non trouvé: " + lineReq.getMedicalActId()));

            // Recherche du tarif applicable
            String priceType = lineReq.getPriceType() != null ? lineReq.getPriceType() : "standard";
            BigDecimal unitPrice = pricingRuleRepository
                    .findByClinicIdAndMedicalActIdAndPriceType(clinicId, act.getId(), priceType)
                    .map(PricingRule::getActePrice)
                    .orElseGet(() -> pricingRuleRepository
                            .findByClinicIdAndMedicalActIdAndPriceType(clinicId, act.getId(), "standard")
                            .map(PricingRule::getActePrice)
                            .orElse(BigDecimal.ZERO));

            int quantity = lineReq.getQuantity() != null ? lineReq.getQuantity() : 1;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));

            // TODO: intégrer la logique assurance via patient-service (OpenFeign)
            BigDecimal patientAmount = lineTotal; // par défaut 100% patient
            BigDecimal assuranceAmount = BigDecimal.ZERO;

            InvoiceLine line = InvoiceLine.builder()
                    .clinicId(clinicId)
                    .invoice(invoice)
                    .medicalActId(act.getId())
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .totalPatientAmount(patientAmount)
                    .totalAssuranceAmount(assuranceAmount)
                    .build();
            lines.add(line);

            totalPatient = totalPatient.add(patientAmount);
            totalAssurance = totalAssurance.add(assuranceAmount);
        }

        invoice.setLines(lines);
        invoice.setTotalPatientAmount(totalPatient);
        invoice.setTotalAssuranceAmount(totalAssurance);

        Invoice saved = invoiceRepository.save(invoice);
        log.info("Facture créée: {} pour patient: {} clinique: {}", saved.getId(), patientId, clinicId);

        // Publication événement Kafka
        InvoiceCreatedEvent event = InvoiceCreatedEvent.builder()
                .invoiceId(saved.getId())
                .patientId(patientId)
                .clinicId(clinicId)
                .totalPatientAmount(totalPatient)
                .totalAssuranceAmount(totalAssurance)
                .createdAt(LocalDateTime.now())
                .build();
        kafkaTemplate.send(TOPIC_INVOICE_CREATED, saved.getId().toString(), event);

        return saved;
    }

    @Transactional(readOnly = true)
    public Page<Invoice> getInvoices(UUID clinicId, Pageable pageable) {
        return invoiceRepository.findAllByClinicId(clinicId, pageable);
    }

    @Transactional(readOnly = true)
    public Invoice getInvoiceById(UUID clinicId, UUID id) {
        return invoiceRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new BillingException("Facture non trouvée: " + id));
    }

    public Invoice cancelInvoice(UUID clinicId, UUID id) {
        Invoice invoice = getInvoiceById(clinicId, id);
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw new BillingException("Impossible d'annuler une facture déjà payée");
        }
        invoice.setStatus(InvoiceStatus.CANCELLED);
        return invoiceRepository.save(invoice);
    }
}
