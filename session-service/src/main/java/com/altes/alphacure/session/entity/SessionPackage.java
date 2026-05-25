package com.altes.alphacure.session.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "session_packages")
@FilterDef(name = "clinicFilter", parameters = @ParamDef(name = "clinicId", type = UUID.class))
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SessionPackage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID clinicId;

    @Column(name = "patient_id", columnDefinition = "CHAR(36)")
    private UUID patientId;

    @Column(name = "total_sessions")
    private Integer totalSessions;

    @Column(name = "remaining_sessions")
    private Integer remainingSessions;

    @Column(name = "medical_act_id", columnDefinition = "CHAR(36)")
    private UUID medicalActId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
