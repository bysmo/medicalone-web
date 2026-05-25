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
@Table(name = "cash_sessions")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashSession {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "session_ref", nullable = false, unique = true, length = 50)
    private String sessionRef;

    @Column(name = "cashier_username", nullable = false, length = 100)
    private String cashierUsername;

    @Column(name = "caisse_code", nullable = false, length = 50)
    private String caisseCode;

    @Column(name = "opening_balance", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal openingBalance = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "OPEN"; // OPEN, CLOSED

    @CreationTimestamp
    @Column(name = "opening_date", updatable = false)
    private LocalDateTime openingDate;

    @Column(name = "closing_date")
    private LocalDateTime closingDate;

    @Column(name = "expected_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal expectedAmount = BigDecimal.ZERO;

    @Column(name = "actual_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal actualAmount = BigDecimal.ZERO;

    @Column(name = "discrepancy", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discrepancy = BigDecimal.ZERO;

    @Column(name = "justification", length = 500)
    private String justification;

    @Column(name = "transferred")
    @Builder.Default
    private Boolean transferred = false;
}
