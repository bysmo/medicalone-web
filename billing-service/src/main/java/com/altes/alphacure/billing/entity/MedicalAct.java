package com.altes.alphacure.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_acts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MedicalAct {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "label", length = 255)
    private String label;

    /**
     * Référence dans nomenclature-service (format: Type-Nature-Clé)
     * Ex: ACTE-CONSULTATION-C001
     */
    @Column(name = "acte_config_path", length = 100)
    private String acteConfigPath;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
