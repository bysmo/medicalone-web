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

    @org.springframework.data.jpa.repository.Query("SELECT s FROM CashSession s WHERE s.cashierUsername = :cashierUsername " +
           "AND s.openingDate >= :start AND s.openingDate < :end")
    List<CashSession> findSessionsForStats(
            @org.springframework.data.repository.query.Param("cashierUsername") String cashierUsername,
            @org.springframework.data.repository.query.Param("start") java.time.LocalDateTime start,
            @org.springframework.data.repository.query.Param("end") java.time.LocalDateTime end);
}
