package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "staff_remuneration_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffRemunerationItem {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "batch_id")
    private UUID batchId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id")
    private UUID clinicId;

    @Column(name = "month", length = 7)
    private String month;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "staff_id", nullable = false)
    private UUID staffId;

    @Column(name = "staff_name", nullable = false, length = 150)
    private String staffName;

    @Column(name = "staff_type", nullable = false, length = 50)
    private String staffType;

    @Column(name = "contract_type", nullable = false, length = 50)
    private String contractType;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "payment_details", length = 250)
    private String paymentDetails;

    @Column(name = "calculated_amount", precision = 12, scale = 2)
    private BigDecimal calculatedAmount;

    @Column(name = "adjusted_amount", precision = 12, scale = 2)
    private BigDecimal adjustedAmount;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "stats_json", columnDefinition = "TEXT")
    private String statsJson;
}
