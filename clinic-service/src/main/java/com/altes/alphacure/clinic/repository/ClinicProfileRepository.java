package com.altes.alphacure.clinic.repository;

import com.altes.alphacure.clinic.entity.ClinicProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClinicProfileRepository extends JpaRepository<ClinicProfile, UUID> {

    Optional<ClinicProfile> findByClinicId(UUID clinicId);

    boolean existsByClinicId(UUID clinicId);
}
