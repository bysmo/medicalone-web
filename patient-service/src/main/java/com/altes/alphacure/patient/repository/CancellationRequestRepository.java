package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.CancellationRequest;
import com.altes.alphacure.patient.entity.enums.ValidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CancellationRequestRepository extends JpaRepository<CancellationRequest, UUID> {

    Optional<CancellationRequest> findByInvoiceLineId(UUID invoiceLineId);

    List<CancellationRequest> findByValidationStatusOrderByRequestedAtDesc(ValidationStatus status);
}
