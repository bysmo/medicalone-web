package com.altes.alphacure.payment.entity;

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
@Table(name = "payments", indexes = {
    @Index(name = "idx_payment_clinic", columnList = "clinic_id")
})
@FilterDef(name = "clinicFilter", parameters = @ParamDef(name = "clinicId", type = UUID.class))
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID clinicId;

    @Column(name = "invoice_id", columnDefinition = "CHAR(36)")
    private UUID invoiceId;

    @Column(name = "amount", precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod; // cash, card, mobile_money, transfer

    @Column(name = "status", length = 50)
    @Enumerated(EnumType.STRING)
    private PaymentStatus status;

    @Column(name = "cash_register_id", columnDefinition = "CHAR(36)")
    private UUID cashRegisterId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
