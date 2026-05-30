package com.altes.alphacure.patient.entity;

import com.altes.alphacure.patient.entity.enums.ValidationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "discount_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DiscountRequest {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "invoice_id", nullable = false)
    private UUID invoiceId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(name = "original_patient_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal originalPatientAmount;

    @Column(name = "proposed_patient_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal proposedPatientAmount;

    @Column(name = "discount_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal discountAmount;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ValidationStatus status = ValidationStatus.PENDING;

    @Column(name = "requested_by", length = 150)
    private String requestedBy;

    @CreationTimestamp
    @Column(name = "requested_at", updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "resolved_by", length = 150)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
