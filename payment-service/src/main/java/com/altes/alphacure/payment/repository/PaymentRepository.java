package com.altes.alphacure.payment.repository;

import com.altes.alphacure.payment.entity.Payment;
import com.altes.alphacure.payment.entity.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Page<Payment> findAllByClinicId(UUID clinicId, Pageable pageable);
    Optional<Payment> findByIdAndClinicId(UUID id, UUID clinicId);
    List<Payment> findByInvoiceIdAndClinicId(UUID invoiceId, UUID clinicId);
}
