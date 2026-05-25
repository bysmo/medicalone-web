package com.altes.alphacure.patient.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "practitioner_acts", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"practitioner_id", "act_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PractitionerAct {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "practitioner_id", nullable = false)
    private UUID practitionerId;

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "act_id", nullable = false)
    private UUID actId;
}
