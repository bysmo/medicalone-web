package com.altes.alphacure.patient.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientResponse {
    private UUID id;
    private String patientCode;
    private String dossierNumber;
    private String ssn; // Nouveau
    private String firstName;
    private String lastName;
    private String fullName;
    private String gender;
    private LocalDate birthDate;
    private String birthPlace;
    private String phone1;
    private String phone2;
    private String phone3;
    private String email;
    private String address;
    private String profession;
    private String fonction;
    
    private String insurer;
    private String subscriber;
    private String mainInsured;
    private String policyNumber;
    private Integer coverageRate;
    private LocalDate insuranceStartDate;
    private LocalDate insuranceEndDate;
    
    private Boolean isActive;
    private LocalDateTime createdAt;
}
