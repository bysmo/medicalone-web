package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.InvoiceLine;
import com.altes.alphacure.patient.entity.enums.InvoiceLineStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface InvoiceLineRepository extends JpaRepository<InvoiceLine, UUID> {

    List<InvoiceLine> findByInvoiceIdOrderByCreatedAtAsc(UUID invoiceId);

    @Query("SELECT il FROM InvoiceLine il JOIN Invoice i ON il.invoiceId = i.id " +
           "WHERE i.clinicId = :clinicId ORDER BY il.createdAt DESC")
    List<InvoiceLine> findAllByClinicId(UUID clinicId);

    @Query("SELECT il FROM InvoiceLine il JOIN Invoice i ON il.invoiceId = i.id " +
           "WHERE i.clinicId = :clinicId AND il.status = :status ORDER BY il.createdAt DESC")
    List<InvoiceLine> findByClinicIdAndStatus(UUID clinicId, InvoiceLineStatus status);

    @Query("SELECT il FROM InvoiceLine il JOIN Invoice i ON il.invoiceId = i.id " +
           "WHERE i.clinicId = :clinicId AND il.createdAt >= :since ORDER BY il.createdAt ASC")
    List<InvoiceLine> findByClinicIdAndCreatedAtAfter(UUID clinicId, LocalDateTime since);

    @Query("SELECT COUNT(il) FROM InvoiceLine il WHERE il.practitionerId = :practitionerId AND il.status = :status")
    long countByPractitionerIdAndStatus(UUID practitionerId, InvoiceLineStatus status);

    List<InvoiceLine> findByPatientIdOrderByCreatedAtDesc(UUID patientId);
    List<InvoiceLine> findByPatientIdAndStatusOrderByCreatedAtDesc(UUID patientId, InvoiceLineStatus status);
}
