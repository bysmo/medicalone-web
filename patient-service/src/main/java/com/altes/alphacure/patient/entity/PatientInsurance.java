package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "patient_insurances")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientInsurance {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "insurance_id", nullable = false)
    private UUID insuranceId;

    @Column(name = "policy_number", length = 100)
    private String policyNumber;

    /**
     * Taux de couverture : 50, 80, 90, 100 (en pourcentage)
     */
    @Column(name = "percentage_coverage", precision = 5, scale = 2)
    private BigDecimal percentageCoverage;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "document_url", columnDefinition = "TEXT")
    private String documentUrl;

    @Column(name = "access_level")
    @Builder.Default
    private Integer accessLevel = 0;
}
