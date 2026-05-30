package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "patients", uniqueConstraints = {
    @UniqueConstraint(name = "UK_clinic_patient_code", columnNames = {"clinic_id", "patient_code"})
})
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Patient {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(nullable = false)
    private UUID clinicId;

    @Column(nullable = false)
    private String patientCode;

    private String dossierNumber;
    private String ssn; // Numéro de Sécurité Sociale (Nouveau)

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String gender;
    private LocalDate birthDate;
    private String birthPlace;

    @Column(nullable = false)
    private String phone1;
    private String phone2;
    private String phone3;

    private String email;
    private String address;

    // --- Informations Professionnelles ---
    private String profession;
    private String fonction;

    // --- Informations Assurance ---
    private String insurer;
    private String subscriber;
    private String mainInsured;
    private String policyNumber;
    private Integer coverageRate;
    
    private LocalDate insuranceStartDate;
    private LocalDate insuranceEndDate;

    @Builder.Default
    private Boolean isActive = true;

    private Integer accessLevel;

    // --- Suivi financier du Patient (Fidélité) ---
    @Column(name = "montant_chiffre_affaire", precision = 12, scale = 2)
    @Builder.Default
    private java.math.BigDecimal montantChiffreAffaire = java.math.BigDecimal.ZERO;

    @Column(name = "nombre_prestations")
    @Builder.Default
    private Integer nombrePrestations = 0;

    @Column(name = "montant_total_regle", precision = 12, scale = 2)
    @Builder.Default
    private java.math.BigDecimal montantTotalRegle = java.math.BigDecimal.ZERO;

    @Column(name = "montant_total_impaye", precision = 12, scale = 2)
    @Builder.Default
    private java.math.BigDecimal montantTotalImpaye = java.math.BigDecimal.ZERO;

    @Column(name = "montant_total_a_rembourser", precision = 12, scale = 2)
    @Builder.Default
    private java.math.BigDecimal montantTotalARembourser = java.math.BigDecimal.ZERO;
    
    @Column(name = "created_by", length = 100)
    private String createdBy;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
        if (montantChiffreAffaire == null) montantChiffreAffaire = java.math.BigDecimal.ZERO;
        if (nombrePrestations == null) nombrePrestations = 0;
        if (montantTotalRegle == null) montantTotalRegle = java.math.BigDecimal.ZERO;
        if (montantTotalImpaye == null) montantTotalImpaye = java.math.BigDecimal.ZERO;
        if (montantTotalARembourser == null) montantTotalARembourser = java.math.BigDecimal.ZERO;
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public String getFullName() {
        return firstName + " " + lastName;
    }
}
