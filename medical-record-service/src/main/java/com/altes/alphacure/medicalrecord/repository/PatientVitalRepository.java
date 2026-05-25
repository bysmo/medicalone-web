package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.PatientVital;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PatientVitalRepository extends JpaRepository<PatientVital, UUID> {

    List<PatientVital> findByPatientIdOrderByTakenAtDesc(UUID patientId);

    List<PatientVital> findByConsultationIdOrderByTakenAtAsc(UUID consultationId);

    List<PatientVital> findByPrestationIdOrderByTakenAtAsc(UUID prestationId);

    boolean existsByPrestationIdAndConstantCode(UUID prestationId, String constantCode);
}
