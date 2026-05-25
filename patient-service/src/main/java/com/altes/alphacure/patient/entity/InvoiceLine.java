package com.altes.alphacure.patient.entity;

import com.altes.alphacure.patient.entity.enums.ActNature;
import com.altes.alphacure.patient.entity.enums.InvoiceLineStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "invoice_lines")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceLine {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "invoice_id", nullable = false)
    private UUID invoiceId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "patient_id")
    private UUID patientId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "act_id", nullable = false)
    private UUID actId;

    @Column(name = "act_name", nullable = false, length = 200)
    private String actName;

    @Enumerated(EnumType.STRING)
    @Column(name = "nature", nullable = false, length = 20)
    private ActNature nature;

    @Column(name = "quantity")
    @Builder.Default
    private Integer quantity = 1;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "total_price", precision = 12, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "insurance_share", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal insuranceShare = BigDecimal.ZERO;

    @Column(name = "patient_share", precision = 12, scale = 2)
    private BigDecimal patientShare;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private InvoiceLineStatus status = InvoiceLineStatus.EN_ATTENTE;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "practitioner_id")
    private UUID practitionerId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
