package com.altes.alphacure.billing.event;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Événement Kafka publié lors de la création d'une facture.
 * Consommé par : payment-service, medical-record-service
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class InvoiceCreatedEvent {
    private UUID invoiceId;
    private UUID patientId;
    private UUID clinicId;
    private BigDecimal totalPatientAmount;
    private BigDecimal totalAssuranceAmount;
    private LocalDateTime createdAt;
}
