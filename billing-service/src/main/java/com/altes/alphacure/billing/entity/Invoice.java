package com.altes.alphacure.billing.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "invoices", indexes = {
    @Index(name = "idx_invoice_clinic", columnList = "clinic_id")
})
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID clinicId;

    @Column(name = "patient_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID patientId;

    @Column(name = "total_patient_amount", precision = 10, scale = 2)
    private BigDecimal totalPatientAmount;

    @Column(name = "total_assurance_amount", precision = 10, scale = 2)
    private BigDecimal totalAssuranceAmount;

    @Column(name = "status", length = 50)
    @Enumerated(EnumType.STRING)
    private InvoiceStatus status;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<InvoiceLine> lines = new ArrayList<>();
}
