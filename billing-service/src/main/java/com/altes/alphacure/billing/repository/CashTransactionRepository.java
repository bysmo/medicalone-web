package com.altes.alphacure.billing.repository;

import com.altes.alphacure.billing.entity.CashTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CashTransactionRepository extends JpaRepository<CashTransaction, UUID> {

    List<CashTransaction> findBySessionId(UUID sessionId);

    List<CashTransaction> findBySessionIdOrderByCreatedAtDesc(UUID sessionId);

    List<CashTransaction> findByClinicId(UUID clinicId);
}
