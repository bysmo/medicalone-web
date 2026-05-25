package com.altes.alphacure.session.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "session_usages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SessionUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "session_package_id", columnDefinition = "CHAR(36)")
    private UUID sessionPackageId;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
