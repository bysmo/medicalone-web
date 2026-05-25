package com.altes.alphacure.clinic.dto;

import com.altes.alphacure.clinic.entity.ClinicStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicResponse {
    private UUID id;
    private String name;
    private String code;
    private String phone;
    private String email;
    private String address;
    private String country;
    private String city;
    private ClinicStatus status;
    private LocalDateTime createdAt;
    private SubscriptionResponse subscription;
    /** true si actes + nomenclatures de base ont été provisionnés pour cette clinique */
    private Boolean dataProvisioned;
}
