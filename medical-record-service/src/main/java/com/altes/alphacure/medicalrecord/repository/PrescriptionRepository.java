package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {

    List<Prescription> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<Prescription> findByPrestationId(UUID prestationId);

    Optional<Prescription> findByConsultationId(UUID consultationId);
}
