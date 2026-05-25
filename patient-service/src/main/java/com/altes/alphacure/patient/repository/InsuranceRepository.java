package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.Insurance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface InsuranceRepository extends JpaRepository<Insurance, UUID> {
    boolean existsByName(String name);
    boolean existsByNameAndClinicId(String name, UUID clinicId);
    
    java.util.List<Insurance> findByClinicId(UUID clinicId);
    
    @org.springframework.data.jpa.repository.Query("SELECT i FROM Insurance i WHERE i.clinicId = :clinicId OR i.clinicId IS NULL")
    java.util.List<Insurance> findByClinicIdOrGlobal(@org.springframework.data.repository.query.Param("clinicId") UUID clinicId);

    long countByClinicId(UUID clinicId);

    void deleteByClinicId(UUID clinicId);
}
