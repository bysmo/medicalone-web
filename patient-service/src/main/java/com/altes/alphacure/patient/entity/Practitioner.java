package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "practitioners")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Practitioner {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id", nullable = false)
    private UUID clinicId;

    @Column(name = "matricule", length = 50)
    private String matricule;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "specialty", length = 500)
    private String specialty;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

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
