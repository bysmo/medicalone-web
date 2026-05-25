package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.MedicalNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface MedicalNoteRepository extends JpaRepository<MedicalNote, UUID> {

    java.util.List<MedicalNote> findByPrestationId(UUID prestationId);

    Optional<MedicalNote> findByConsultationId(UUID consultationId);
}
