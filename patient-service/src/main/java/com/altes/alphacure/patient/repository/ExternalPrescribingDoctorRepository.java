package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.ExternalPrescribingDoctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExternalPrescribingDoctorRepository extends JpaRepository<ExternalPrescribingDoctor, UUID> {
    List<ExternalPrescribingDoctor> findByClinicIdOrderByFullNameAsc(UUID clinicId);
}
