package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.MedicalAct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MedicalActRepository extends JpaRepository<MedicalAct, UUID> {

    // ── Cloisonnement par clinique ────────────────────────────────────────────

    /** Récupère un acte en vérifiant qu'il appartient bien à la clinique (cloisonnement). */
    Optional<MedicalAct> findByIdAndClinicId(UUID id, UUID clinicId);

    List<MedicalAct> findByClinicId(UUID clinicId);

    List<MedicalAct> findByClinicIdAndIsActiveTrue(UUID clinicId);

    List<MedicalAct> findByClinicIdAndNatureAndIsActiveTrue(UUID clinicId, String nature);

    List<MedicalAct> findByClinicIdAndSpecialtyAndIsActiveTrue(UUID clinicId, String specialty);

    List<MedicalAct> findByClinicIdAndNatureAndSpecialtyAndIsActiveTrue(UUID clinicId, String nature, String specialty);

    @Query("SELECT a FROM MedicalAct a WHERE a.clinicId = :clinicId AND a.isActive = true " +
           "AND (:nature IS NULL OR a.nature = :nature) " +
           "AND (:specialty IS NULL OR a.specialty = :specialty) " +
           "AND (LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "     OR LOWER(a.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<MedicalAct> searchByClinicId(UUID clinicId, String search, String nature, String specialty);

    boolean existsByClinicIdAndCode(UUID clinicId, String code);

    Optional<MedicalAct> findByClinicIdAndCode(UUID clinicId, String code);

    long countByClinicIdAndIsActiveTrue(UUID clinicId);

    void deleteByClinicId(UUID clinicId);
}
