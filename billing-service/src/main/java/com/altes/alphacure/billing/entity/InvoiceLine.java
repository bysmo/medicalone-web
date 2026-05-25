package com.altes.alphacure.billing.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "invoice_lines")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID clinicId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @Column(name = "medical_act_id", columnDefinition = "CHAR(36)")
    private UUID medicalActId;

    @Column(name = "quantity")
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "unit_price", precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "total_patient_amount", precision = 10, scale = 2)
    private BigDecimal totalPatientAmount;

    @Column(name = "total_assurance_amount", precision = 10, scale = 2)
    private BigDecimal totalAssuranceAmount;
}
