package com.altes.alphacure.billing.repository;

import com.altes.alphacure.billing.entity.CashSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CashSessionRepository extends JpaRepository<CashSession, UUID> {

    Optional<CashSession> findByCashierUsernameAndStatus(String cashierUsername, String status);

    List<CashSession> findByClinicIdOrderByOpeningDateDesc(UUID clinicId);

    Optional<CashSession> findFirstByCaisseCodeAndStatus(String caisseCode, String status);
}
