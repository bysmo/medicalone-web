package com.altes.alphacure.payment.event;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Événement Kafka publié lors du succès d'un paiement.
 * Consommé par : billing-service, session-service
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PaymentCompletedEvent {
    private UUID paymentId;
    private UUID invoiceId;
    private UUID clinicId;
    private BigDecimal amount;
    private String paymentMethod;
    private LocalDateTime completedAt;
}
