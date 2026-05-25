package com.altes.alphacure.medicalrecord.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "consultations")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Consultation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID clinicId;

    @Column(name = "medical_record_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID medicalRecordId;

    @Column(name = "practitioner_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID practitionerId;

    @Column(name = "medical_constantes", columnDefinition = "TEXT")
    private String medicalConstantes;

    @Column(name = "medical_exams", columnDefinition = "TEXT")
    private String medicalExams;

    @Column(name = "medical_ordonance", columnDefinition = "TEXT")
    private String medicalOrdonance;

    @Column(name = "diagnosis", columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "access_level")
    @Builder.Default
    private Integer accessLevel = 0;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "medical_status", length = 20)
    @Builder.Default
    private MedicalStatus medicalStatus = MedicalStatus.EN_ATTENTE;

    @Column(name = "prestation_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID prestationId;

    @Column(name = "patient_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID patientId;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "nature", length = 30)
    private String nature;

    @Column(name = "act_name", length = 200)
    private String actName;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
