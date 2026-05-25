package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, UUID> {
    Optional<MedicalRecord> findByPatientIdAndClinicId(UUID patientId, UUID clinicId);
    boolean existsByPatientIdAndClinicId(UUID patientId, UUID clinicId);
    Optional<MedicalRecord> findByIdAndClinicId(UUID id, UUID clinicId);
}
