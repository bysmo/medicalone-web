package com.altes.alphacure.medicalrecord.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "prescription_lines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionLine {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "prescription_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID prescriptionId;

    @Column(name = "order_num")
    private Integer orderNum;

    @Column(name = "medication", length = 200)
    private String medication;

    @Column(name = "dosage", length = 100)
    private String dosage;

    @Column(name = "frequency", length = 100)
    private String frequency;

    @Column(name = "duration", length = 100)
    private String duration;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
