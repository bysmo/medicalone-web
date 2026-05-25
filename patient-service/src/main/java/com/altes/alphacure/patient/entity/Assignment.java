package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "assignments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Assignment {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "invoice_line_id", nullable = false)
    private UUID invoiceLineId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "practitioner_id", nullable = false)
    private UUID practitionerId;

    @Column(name = "assigned_by", length = 150)
    private String assignedBy;

    @CreationTimestamp
    @Column(name = "assigned_at", updatable = false)
    private LocalDateTime assignedAt;
}
