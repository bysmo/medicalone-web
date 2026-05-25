package com.altes.alphacure.medicalrecord.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "medical_events")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID clinicId;

    @Column(name = "medical_record_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID medicalRecordId;

    @Column(name = "event_type", length = 50)
    private String eventType; // consultation, acte, séance

    @Column(name = "reference_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID referenceId;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "event_date")
    private LocalDateTime eventDate;
}
