package com.altes.alphacure.medicalrecord.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "patient_vitals")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientVital {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID clinicId;

    @Column(name = "patient_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID patientId;

    @Column(name = "consultation_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID consultationId;

    @Column(name = "prestation_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID prestationId;

    @Column(name = "constant_code", length = 50)
    private String constantCode;

    @Column(name = "constant_name", length = 100)
    private String constantName;

    @Column(name = "value", length = 50)
    private String value;

    @Column(name = "unit", length = 20)
    private String unit;

    @Column(name = "taken_by", length = 100)
    private String takenBy;

    @CreationTimestamp
    @Column(name = "taken_at")
    private LocalDateTime takenAt;
}
