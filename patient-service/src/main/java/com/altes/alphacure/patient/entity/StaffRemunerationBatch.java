package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_remuneration_batches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffRemunerationBatch {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "month", nullable = false, length = 7)
    private String month;

    @Column(name = "status", nullable = false, length = 20)
    private String status; // DRAFT, TO_VALIDATE, VALIDATED

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "bank_account_id", length = 100)
    private String bankAccountId;

    @Column(name = "caisse_code", length = 50)
    private String caisseCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;
}
