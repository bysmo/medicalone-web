package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.Consultation;
import com.altes.alphacure.medicalrecord.entity.MedicalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {

    List<Consultation> findByPatientIdOrderByCreatedAtDesc(UUID patientId);

    List<Consultation> findByClinicIdAndMedicalStatusAndCreatedAtAfter(
            UUID clinicId, MedicalStatus status, LocalDateTime after);

    List<Consultation> findByClinicIdAndPractitionerIdAndMedicalStatusOrderByCreatedAtAsc(
            UUID clinicId, UUID practitionerId, MedicalStatus status);

    List<Consultation> findByPrestationId(UUID prestationId);

    List<Consultation> findByClinicIdAndCreatedAtAfter(UUID clinicId, LocalDateTime after);

    List<Consultation> findByPatientIdAndClinicIdOrderByCreatedAtDesc(UUID patientId, UUID clinicId);

    List<Consultation> findByClinicIdAndPractitionerIdAndCreatedAtAfterOrderByCreatedAtDesc(
            UUID clinicId, UUID practitionerId, LocalDateTime after);

    List<Consultation> findByClinicIdAndPractitionerIdAndCreatedAtAfterOrderByCreatedAtAsc(
            UUID clinicId, UUID practitionerId, LocalDateTime after);

    List<Consultation> findByClinicIdAndNature(UUID clinicId, String nature);

    List<Consultation> findByClinicId(UUID clinicId);
}
