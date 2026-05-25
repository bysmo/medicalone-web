package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "conventions_insurances")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ConventionInsurance {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "acte_id", nullable = false)
    private UUID acteId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "insurance_id", nullable = false)
    private UUID insuranceId;

    /**
     * Indique si l'acte est couvert par l'assurance pour cette clinique
     */
    @Column(name = "is_covered")
    @Builder.Default
    private Boolean isCovered = false;

    @Column(name = "max_amount_covered", precision = 10, scale = 2)
    private BigDecimal maxAmountCovered;

    @Column(name = "access_level")
    @Builder.Default
    private Integer accessLevel = 0;
}
