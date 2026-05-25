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
@Table(name = "cash_registers")
@FilterDef(name = "clinicFilter", parameters = @ParamDef(name = "clinicId", type = UUID.class))
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CashRegister {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID clinicId;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "user_id", columnDefinition = "CHAR(36)")
    private UUID userId;

    @Column(name = "status", length = 50)
    @Enumerated(EnumType.STRING)
    private CashRegisterStatus status;

    @Column(name = "opened_at")
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;
}
