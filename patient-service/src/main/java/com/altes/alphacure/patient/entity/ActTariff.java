package com.altes.alphacure.patient.entity;

import com.altes.alphacure.patient.entity.enums.TariffType;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "act_tariffs", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"act_id", "tariff_type"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ActTariff {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "act_id", nullable = false)
    private UUID actId;

    @Enumerated(EnumType.STRING)
    @Column(name = "tariff_type", nullable = false, length = 30)
    private TariffType tariffType;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;
}
