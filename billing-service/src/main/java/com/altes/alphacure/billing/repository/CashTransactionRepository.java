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

    @org.springframework.data.jpa.repository.Query("SELECT SUM(t.amount) FROM CashTransaction t WHERE t.sessionId IN :sessionIds " +
           "AND t.type = :type AND t.status = 'VALIDATED'")
    java.math.BigDecimal sumTransactionAmountBySessionsAndType(
            @org.springframework.data.repository.query.Param("sessionIds") List<UUID> sessionIds,
            @org.springframework.data.repository.query.Param("type") String type);
}
