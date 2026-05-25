package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.ConventionInsurance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConventionInsuranceRepository extends JpaRepository<ConventionInsurance, UUID> {

    List<ConventionInsurance> findByClinicIdAndInsuranceId(UUID clinicId, UUID insuranceId);

    Optional<ConventionInsurance> findByClinicIdAndInsuranceIdAndActeId(UUID clinicId, UUID insuranceId, UUID acteId);
}
