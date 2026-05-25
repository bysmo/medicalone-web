package com.altes.alphacure.medicalrecord.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Dossier médical unique par patient.
 * Règle métier : UN patient = UN seul dossier médical (contrainte enforced au service level)
 */
import org.hibernate.annotations.Filter;

@Entity
@Table(name = "medical_records",
    uniqueConstraints = @UniqueConstraint(columnNames = {"patient_id", "clinic_id"}))
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "patient_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID patientId;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID clinicId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
