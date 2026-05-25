package com.altes.alphacure.platformadmin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "platform_admins")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlatformAdmin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "username", length = 100, unique = true)
    private String username;

    @Column(name = "password", length = 255)
    private String password;

    @Column(name = "email", length = 150)
    private String email;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
