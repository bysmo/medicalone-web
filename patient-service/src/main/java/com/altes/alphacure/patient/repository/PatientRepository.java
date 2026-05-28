package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {

    @Query("SELECT p FROM Patient p WHERE p.clinicId = :clinicId AND (" +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "p.phone1 LIKE CONCAT('%', :query, '%') OR " +
           "p.phone2 LIKE CONCAT('%', :query, '%') OR " +
           "p.phone3 LIKE CONCAT('%', :query, '%') OR " +
           "p.patientCode LIKE CONCAT('%', :query, '%') OR " +
           "p.ssn LIKE CONCAT('%', :query, '%') OR " +
           "p.dossierNumber LIKE CONCAT('%', :query, '%'))")
    Page<Patient> searchByClinicId(@Param("clinicId") UUID clinicId, @Param("query") String query, Pageable pageable);

    List<Patient> findByClinicIdAndBirthDate(UUID clinicId, LocalDate birthDate);

    Page<Patient> findAllByClinicId(UUID clinicId, Pageable pageable);

    Optional<Patient> findByIdAndClinicId(UUID id, UUID clinicId);

    long countByClinicId(UUID clinicId);

    boolean existsByPatientCodeAndClinicId(String patientCode, UUID clinicId);

    List<Patient> findByClinicId(UUID clinicId);

    long countByClinicIdAndCreatedByAndCreatedAtBetween(
            UUID clinicId, String createdBy, java.time.LocalDateTime start, java.time.LocalDateTime end);
}
