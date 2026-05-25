package com.altes.alphacure.nomenclature.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Table paramétrique dynamique — cœur du système de configuration.
 * Permet de stocker n'importe quel type de paramètre métier de manière flexible.
 * Format d'accès : type + nature + code
 */
@Entity
@Table(name = "nomenclatures",
    indexes = {
        @Index(name = "idx_nomen_type_nature", columnList = "type,nature,code"),
        @Index(name = "idx_nomen_clinic", columnList = "clinic_id")
    })
@FilterDef(name = "clinicFilter", parameters = @ParamDef(name = "clinicId", type = UUID.class))
@Filter(name = "clinicFilter", condition = "(clinic_id = :clinicId OR clinic_id IS NULL)")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Nomenclature {

    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column()
    private UUID id;

    /**
     * NULL = paramètre global (partagé entre toutes les cliniques)
     */
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "clinic_id")
    private UUID clinicId;

    @Column(name = "type", length = 100)
    private String type;

    @Column(name = "nature", length = 100)
    private String nature;

    @Column(name = "code", length = 100)
    private String code;

    // ---- Champs dynamiques string ----
    @Column(name = "string_1") private String string1;
    @Column(name = "string_2") private String string2;
    @Column(name = "string_3") private String string3;
    @Column(name = "string_4") private String string4;
    @Column(name = "string_5") private String string5;

    // ---- Champs dynamiques entier ----
    @Column(name = "int_1") private Integer int1;
    @Column(name = "int_2") private Integer int2;
    @Column(name = "int_3") private Integer int3;
    @Column(name = "int_4") private Integer int4;
    @Column(name = "int_5") private Integer int5;

    // ---- Champs dynamiques date ----
    @Column(name = "date_1") private LocalDate date1;
    @Column(name = "date_2") private LocalDate date2;
    @Column(name = "date_3") private LocalDate date3;
    @Column(name = "date_4") private LocalDate date4;
    @Column(name = "date_5") private LocalDate date5;

    // ---- Champs dynamiques taux ----
    @Column(name = "rate_1", precision = 10, scale = 2) private BigDecimal rate1;
    @Column(name = "rate_2", precision = 10, scale = 2) private BigDecimal rate2;
    @Column(name = "rate_3", precision = 10, scale = 2) private BigDecimal rate3;
    @Column(name = "rate_4", precision = 10, scale = 2) private BigDecimal rate4;
    @Column(name = "rate_5", precision = 10, scale = 2) private BigDecimal rate5;

    /**
     * Relation parent pour hierarchie de paramètres
     */
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(name = "parent_id")
    private UUID parentId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
