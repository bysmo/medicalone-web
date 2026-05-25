package com.altes.alphacure.patient.entity;

import com.altes.alphacure.patient.entity.enums.ActNature;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "medical_acts")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalAct {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "code", nullable = false, length = 100)
    private String code;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "nature", length = 50)
    private String nature;

    @Column(name = "is_lab_exam")
    @Builder.Default
    private Boolean isLabExam = false;

    @Column(name = "lab_section", length = 100)
    private String labSection;

    @Column(name = "specialty", length = 100)
    private String specialty;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "access_level")
    @Builder.Default
    private Integer accessLevel = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
