package com.altes.alphacure.clinic.repository;

import com.altes.alphacure.clinic.entity.ClinicNumberingRule;
import com.altes.alphacure.clinic.entity.NumberingDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClinicNumberingRuleRepository extends JpaRepository<ClinicNumberingRule, UUID> {

    List<ClinicNumberingRule> findByClinicIdOrderByDocumentTypeAsc(UUID clinicId);

    Optional<ClinicNumberingRule> findByClinicIdAndDocumentType(UUID clinicId, NumberingDocumentType documentType);

    boolean existsByClinicId(UUID clinicId);
}
