package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.Practitioner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PractitionerRepository extends JpaRepository<Practitioner, UUID> {

    /** Cloisonnement : récupère un praticien en vérifiant qu'il appartient à la clinique. */
    Optional<Practitioner> findByIdAndClinicId(UUID id, UUID clinicId);

    List<Practitioner> findByClinicIdAndIsActiveTrue(UUID clinicId);

    List<Practitioner> findByClinicIdAndSpecialtyContainingIgnoreCaseAndIsActiveTrue(UUID clinicId, String specialty);
}
