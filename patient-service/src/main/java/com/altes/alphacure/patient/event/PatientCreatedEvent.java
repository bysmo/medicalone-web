package com.altes.alphacure.patient.event;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientCreatedEvent {
    private UUID patientId;
    private UUID clinicId;
    private String patientCode;
    private String firstName;
    private String lastName;
    private LocalDateTime createdAt;
}
