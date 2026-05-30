package com.altes.alphacure.medicalrecord.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Données médicales de base d'un patient.
 * Un seul enregistrement par patient (contrainte unique sur patient_id + clinic_id).
 */
@Entity
@Table(name = "patient_medical_backgrounds",
        uniqueConstraints = @UniqueConstraint(columnNames = {"patient_id", "clinic_id"}))
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PatientMedicalBackground {

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

    // Groupe sanguin : A, B, AB, O
    @Column(name = "blood_group", length = 5)
    private String bloodGroup;

    // Facteur Rhésus : POSITIF, NEGATIF
    @Column(name = "rhesus_factor", length = 10)
    private String rhesusFacteur;

    // Electrophorèse / Etat drépanocytaire : AA, AS, SS, AC, SC, CC, autres
    @Column(name = "electrophorese", length = 20)
    private String electrophorese;

    // Allergies (JSON array stringifié) : ["Pénicilline", "Arachides", ...]
    @Column(name = "allergies", columnDefinition = "TEXT")
    private String allergies;

    // Vaccins (JSON array stringifié) : [{"name":"BCG","date":"2020-01-15"}, ...]
    @Column(name = "vaccins", columnDefinition = "TEXT")
    private String vaccins;

    // États pathologiques
    @Column(name = "is_diabetic")
    private Boolean isDiabetic;

    @Column(name = "is_asthmatic")
    private Boolean isAsthmatic;

    @Column(name = "is_hypertensive")
    private Boolean isHypertensive;

    // Sérologie VIH : POSITIVE, NEGATIVE, NON_TESTEE
    @Column(name = "hiv_serology", length = 15)
    private String hivSerology;

    // Autres sérologies (texte libre)
    @Column(name = "other_serologies", columnDefinition = "TEXT")
    private String otherSerologies;

    // Notes médicales générales
    @Column(name = "medical_notes", columnDefinition = "TEXT")
    private String medicalNotes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
