package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.StaffRemunerationItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StaffRemunerationItemRepository extends JpaRepository<StaffRemunerationItem, UUID> {
    List<StaffRemunerationItem> findByBatchId(UUID batchId);
    void deleteByBatchId(UUID batchId);
    java.util.Optional<StaffRemunerationItem> findByClinicIdAndStaffIdAndMonth(UUID clinicId, UUID staffId, String month);
    List<StaffRemunerationItem> findByClinicIdAndMonth(UUID clinicId, String month);
}
