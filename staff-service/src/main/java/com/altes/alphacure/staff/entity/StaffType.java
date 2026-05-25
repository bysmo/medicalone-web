package com.altes.alphacure.staff.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "staff_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StaffType {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "label", length = 100)
    private String label;

    /**
     * Référence vers nomenclature-service (pas de FK inter-service)
     */
    @Column(name = "nomenclature_id", columnDefinition = "CHAR(36)")
    private UUID nomenclatureId;
}
