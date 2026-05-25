package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    List<Invoice> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<Invoice> findByClinicIdOrderByCreatedAtDesc(UUID clinicId);

    Optional<Invoice> findByInvoiceRef(String invoiceRef);

    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.clinicId = :clinicId")
    long countByClinicId(UUID clinicId);
}
