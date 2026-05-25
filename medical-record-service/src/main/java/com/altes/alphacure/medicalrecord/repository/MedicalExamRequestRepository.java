package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.MedicalExamRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface MedicalExamRequestRepository extends JpaRepository<MedicalExamRequest, UUID> {

    List<MedicalExamRequest> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<MedicalExamRequest> findByPrestationIdOrderByOrderNumAsc(UUID prestationId);

    List<MedicalExamRequest> findByConsultationIdOrderByOrderNumAsc(UUID consultationId);
}
