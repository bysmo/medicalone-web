package com.altes.alphacure.session.event;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Événement Kafka publié lors de la consommation d'une séance.
 * Consommé par : medical-record-service, billing-service
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SessionUsedEvent {
    private UUID sessionPackageId;
    private UUID patientId;
    private UUID clinicId;
    private UUID medicalActId;
    private int remainingSessions;
    private LocalDateTime usedAt;
}
