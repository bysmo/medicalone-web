package com.altes.alphacure.billing.repository;

import com.altes.alphacure.billing.entity.Invoice;
import com.altes.alphacure.billing.entity.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    Page<Invoice> findAllByClinicId(UUID clinicId, Pageable pageable);
    Optional<Invoice> findByIdAndClinicId(UUID id, UUID clinicId);
    List<Invoice> findByPatientIdAndClinicIdAndStatus(UUID patientId, UUID clinicId, InvoiceStatus status);

    /**
     * Vérifie l'existence d'une facture non annulée pour ce patient et acte.
     * Utilisé pour la contrainte de non-double facturation.
     */
    boolean existsByPatientIdAndClinicIdAndStatusIn(UUID patientId, UUID clinicId, List<InvoiceStatus> statuses);
}
