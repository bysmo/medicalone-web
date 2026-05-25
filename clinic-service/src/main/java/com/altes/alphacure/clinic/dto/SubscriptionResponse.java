package com.altes.alphacure.clinic.dto;

import com.altes.alphacure.clinic.entity.SubscriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionResponse {
    private UUID id;
    private UUID clinicId;
    private String planName;
    private LocalDate startDate;
    private LocalDate endDate;
    private SubscriptionStatus status;
}
