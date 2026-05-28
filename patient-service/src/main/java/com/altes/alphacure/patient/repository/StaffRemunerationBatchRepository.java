package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.StaffRemunerationBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffRemunerationBatchRepository extends JpaRepository<StaffRemunerationBatch, UUID> {
    List<StaffRemunerationBatch> findByClinicIdOrderByMonthDesc(UUID clinicId);
    Optional<StaffRemunerationBatch> findByClinicIdAndMonth(UUID clinicId, String month);
    Optional<StaffRemunerationBatch> findByIdAndClinicId(UUID id, UUID clinicId);
}
