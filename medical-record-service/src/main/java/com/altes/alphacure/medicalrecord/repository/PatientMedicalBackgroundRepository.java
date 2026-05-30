package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.PatientMedicalBackground;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientMedicalBackgroundRepository extends JpaRepository<PatientMedicalBackground, UUID> {

    Optional<PatientMedicalBackground> findByPatientIdAndClinicId(UUID patientId, UUID clinicId);
}
