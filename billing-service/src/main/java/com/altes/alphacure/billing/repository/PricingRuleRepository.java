package com.altes.alphacure.billing.repository;

import com.altes.alphacure.billing.entity.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {
    List<PricingRule> findByClinicIdAndMedicalActId(UUID clinicId, UUID medicalActId);
    Optional<PricingRule> findByClinicIdAndMedicalActIdAndPriceType(UUID clinicId, UUID medicalActId, String priceType);
    List<PricingRule> findByClinicId(UUID clinicId);
}
