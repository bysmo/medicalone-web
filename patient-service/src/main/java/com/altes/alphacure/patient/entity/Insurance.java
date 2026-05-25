package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;

@Entity
@Table(name = "insurances")
@Filter(name = "clinicFilter", condition = "(clinic_id = :clinicId OR clinic_id IS NULL)")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Insurance {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "name", length = 150)
    private String name;

    @Column(name = "type", length = 50)
    private String type; // national / international

    @Column(name = "access_level")
    @Builder.Default
    private Integer accessLevel = 0;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id")
    private UUID clinicId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
