package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.entity.ImagingTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ImagingTemplateRepository extends JpaRepository<ImagingTemplate, UUID> {
    List<ImagingTemplate> findByClinicId(UUID clinicId);
    List<ImagingTemplate> findByClinicIdAndCategory(UUID clinicId, String category);
}
