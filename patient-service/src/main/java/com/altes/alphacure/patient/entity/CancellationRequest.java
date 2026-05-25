package com.altes.alphacure.patient.entity;

import com.altes.alphacure.patient.entity.enums.CancellationType;
import com.altes.alphacure.patient.entity.enums.ValidationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cancellation_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CancellationRequest {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "invoice_line_id", nullable = false)
    private UUID invoiceLineId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private CancellationType type;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "requested_by", length = 150)
    private String requestedBy;

    @CreationTimestamp
    @Column(name = "requested_at", updatable = false)
    private LocalDateTime requestedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 20)
    @Builder.Default
    private ValidationStatus validationStatus = ValidationStatus.PENDING;

    @Column(name = "validated_by", length = 150)
    private String validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "refund_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;
}
