package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.PrescriptionLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrescriptionLineRepository extends JpaRepository<PrescriptionLine, UUID> {

    List<PrescriptionLine> findByPrescriptionIdOrderByOrderNumAsc(UUID prescriptionId);
}
