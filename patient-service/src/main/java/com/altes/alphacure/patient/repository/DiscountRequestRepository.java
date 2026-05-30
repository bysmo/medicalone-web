package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.DiscountRequest;
import com.altes.alphacure.patient.entity.enums.ValidationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DiscountRequestRepository extends JpaRepository<DiscountRequest, UUID> {

    List<DiscountRequest> findByClinicIdAndStatusOrderByRequestedAtDesc(UUID clinicId, ValidationStatus status);

    Optional<DiscountRequest> findByInvoiceIdAndStatus(UUID invoiceId, ValidationStatus status);

    boolean existsByInvoiceIdAndStatus(UUID invoiceId, ValidationStatus status);
}
