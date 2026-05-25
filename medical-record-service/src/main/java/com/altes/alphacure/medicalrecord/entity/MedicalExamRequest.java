package com.altes.alphacure.medicalrecord.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "medical_exam_requests")
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalExamRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID clinicId;

    @Column(name = "patient_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID patientId;

    @Column(name = "consultation_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID consultationId;

    @Column(name = "prestation_id", columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID prestationId;

    @Column(name = "order_num")
    private Integer orderNum;

    @Column(name = "exam_name", length = 200)
    private String examName;

    @Column(name = "clinical_info", columnDefinition = "TEXT")
    private String clinicalInfo;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "result", columnDefinition = "TEXT")
    private String result;

    @Column(name = "result_date")
    private LocalDateTime resultDate;

    @Column(name = "status", length = 20)
    @Builder.Default
    private String status = "REQUESTED";

    @Column(name = "requested_by", length = 100)
    private String requestedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
