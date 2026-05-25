package com.altes.alphacure.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "cash_transactions")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashTransaction {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "type", nullable = false, length = 20)
    private String type; // ENCAISSEMENT, DECAISSEMENT

    @Column(name = "payment_method", length = 50)
    @Builder.Default
    private String paymentMethod = "ESPECES"; // ESPECES, CARTE, CHEQUE, MOBILE_MONEY, etc.

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "label", nullable = false, length = 250)
    private String label;

    @Column(name = "reference_id", length = 100)
    private String referenceId; // e.g. invoiceId

    @Column(name = "receipt_number", length = 50)
    private String receiptNumber;

    @Column(name = "bank_account_code", length = 50)
    private String bankAccountCode;

    @Column(name = "expense_category", length = 50)
    private String expenseCategory;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "PENDING";

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
