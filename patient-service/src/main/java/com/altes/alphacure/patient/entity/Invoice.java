package com.altes.alphacure.patient.entity;

import com.altes.alphacure.patient.entity.enums.InvoiceStatus;
import com.altes.alphacure.patient.entity.enums.TariffType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "invoices")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "invoice_ref", nullable = false, unique = true, length = 30)
    private String invoiceRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "tariff_type", nullable = false, length = 30)
    private TariffType tariffType;

    @Column(name = "total_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "insurance_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal insuranceAmount = BigDecimal.ZERO;

    @Column(name = "patient_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal patientAmount = BigDecimal.ZERO;

    @Column(name = "bordereau_code", length = 50)
    private String bordereauCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.PENDING;

    @Column(name = "coverage_rate")
    @Builder.Default
    private Integer coverageRate = 0;

    @Column(name = "access_level")
    @Builder.Default
    private Integer accessLevel = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
