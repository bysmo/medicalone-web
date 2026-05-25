package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AssignmentRepository extends JpaRepository<Assignment, UUID> {

    Optional<Assignment> findByInvoiceLineId(UUID invoiceLineId);
}
