package com.altes.alphacure.billing.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "pricing_rules")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PricingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID clinicId;

    @Column(name = "medical_act_id", columnDefinition = "CHAR(36)")
    private UUID medicalActId;

    @Column(name = "standard_price", precision = 10, scale = 2)
    private BigDecimal standardPrice;

    /**
     * Type de tarification : standard, assure_national, assure_international,
     * retraite, jumeaux, femme_enceinte, personnel, etc.
     */
    @Column(name = "price_type", length = 50)
    private String priceType;

    @Column(name = "acte_price", precision = 10, scale = 2)
    private BigDecimal actePrice;
}
