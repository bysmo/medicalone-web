package com.altes.alphacure.patient.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientRequest {
    private String firstName;
    private String lastName;
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
    private String dossierNumber;
    private String ssn; // Nouveau
    
    private String insurer;
    private String subscriber;
    private String mainInsured;
    private String policyNumber;
    private Integer coverageRate;
    private LocalDate insuranceStartDate;
    private LocalDate insuranceEndDate;
    
    private Boolean isActive;
}
