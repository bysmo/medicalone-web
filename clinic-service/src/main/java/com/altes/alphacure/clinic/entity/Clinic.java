package com.altes.alphacure.clinic.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clinics")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Clinic {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID id;

    @Column(name = "name", length = 150, nullable = false)
    private String name;

    @Column(name = "code", length = 50, unique = true)
    private String code;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "country", length = 100)
    private String country;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "status", length = 50)
    @Enumerated(EnumType.STRING)
    private ClinicStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
