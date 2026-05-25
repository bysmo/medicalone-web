package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.ActTariff;
import com.altes.alphacure.patient.entity.enums.TariffType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ActTariffRepository extends JpaRepository<ActTariff, UUID> {

    List<ActTariff> findByActId(UUID actId);

    /** Récupère les tarifs de plusieurs actes — utilisé pour filtrer par clinique. */
    List<ActTariff> findByActIdIn(Collection<UUID> actIds);

    Optional<ActTariff> findByActIdAndTariffType(UUID actId, TariffType tariffType);

    void deleteByActId(UUID actId);
}
