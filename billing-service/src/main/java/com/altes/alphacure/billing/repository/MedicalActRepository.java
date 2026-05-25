package com.altes.alphacure.billing.repository;

import com.altes.alphacure.billing.entity.MedicalAct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalActRepository extends JpaRepository<MedicalAct, UUID> {
    Optional<MedicalAct> findByCode(String code);
    boolean existsByCode(String code);
}
