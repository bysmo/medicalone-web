package com.altes.alphacure.payment.repository;

import com.altes.alphacure.payment.entity.CashRegister;
import com.altes.alphacure.payment.entity.CashRegisterStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CashRegisterRepository extends JpaRepository<CashRegister, UUID> {
    Optional<CashRegister> findByIdAndClinicId(UUID id, UUID clinicId);
    List<CashRegister> findByClinicId(UUID clinicId);
    List<CashRegister> findByClinicIdAndStatus(UUID clinicId, CashRegisterStatus status);
    boolean existsByClinicIdAndUserIdAndStatus(UUID clinicId, UUID userId, CashRegisterStatus status);
}
