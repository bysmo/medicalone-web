package com.altes.alphacure.clinic.repository;

import com.altes.alphacure.clinic.entity.Clinic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClinicRepository extends JpaRepository<Clinic, UUID> {
    Optional<Clinic> findByCode(String code);
    Optional<Clinic> findByEmail(String email);
    boolean existsByCode(String code);
    boolean existsByEmail(String email);
}
