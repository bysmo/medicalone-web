package com.altes.alphacure.clinic.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clinic_numbering_rules", uniqueConstraints = {
        @UniqueConstraint(name = "uk_clinic_numbering_clinic_doc", columnNames = {"clinic_id", "document_type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicNumberingRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID clinicId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 50)
    private NumberingDocumentType documentType;

    /** Segments JSON : type, value, padLength */
    @Column(name = "segments_json", nullable = false, columnDefinition = "TEXT")
    private String segmentsJson;

    @Column(name = "next_sequence", nullable = false)
    @Builder.Default
    private Long nextSequence = 1L;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
