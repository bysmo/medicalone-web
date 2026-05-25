package com.altes.alphacure.patient.repository;

import com.altes.alphacure.patient.entity.PractitionerAct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PractitionerActRepository extends JpaRepository<PractitionerAct, UUID> {

    List<PractitionerAct> findByPractitionerId(UUID practitionerId);

    List<PractitionerAct> findByActId(UUID actId);

    java.util.Optional<PractitionerAct> findByPractitionerIdAndActId(UUID practitionerId, UUID actId);

    void deleteByPractitionerId(UUID practitionerId);
}
