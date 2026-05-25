package com.altes.alphacure.session.repository;

import com.altes.alphacure.session.entity.SessionPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionPackageRepository extends JpaRepository<SessionPackage, UUID> {
    Optional<SessionPackage> findByIdAndClinicId(UUID id, UUID clinicId);
    List<SessionPackage> findByClinicIdAndPatientId(UUID clinicId, UUID patientId);
    List<SessionPackage> findByClinicIdAndPatientIdAndRemainingSessionsGreaterThan(UUID clinicId, UUID patientId, int minRemaining);
}
