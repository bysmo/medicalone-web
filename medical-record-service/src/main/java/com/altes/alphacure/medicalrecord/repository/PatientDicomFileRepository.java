package com.altes.alphacure.medicalrecord.repository;

import com.altes.alphacure.medicalrecord.dto.DicomFileMetadata;
import com.altes.alphacure.medicalrecord.entity.PatientDicomFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PatientDicomFileRepository extends JpaRepository<PatientDicomFile, UUID> {

    @Query("SELECT new com.altes.alphacure.medicalrecord.dto.DicomFileMetadata(d.id, d.clinicId, d.patientId, d.consultationId, d.prestationId, d.fileName, d.fileSize, d.uploadedAt) " +
           "FROM PatientDicomFile d WHERE d.consultationId = :consultationId ORDER BY d.uploadedAt ASC")
    List<DicomFileMetadata> findMetadataByConsultationId(@Param("consultationId") UUID consultationId);

    @Query("SELECT new com.altes.alphacure.medicalrecord.dto.DicomFileMetadata(d.id, d.clinicId, d.patientId, d.consultationId, d.prestationId, d.fileName, d.fileSize, d.uploadedAt) " +
           "FROM PatientDicomFile d WHERE d.patientId = :patientId ORDER BY d.uploadedAt DESC")
    List<DicomFileMetadata> findMetadataByPatientId(@Param("patientId") UUID patientId);
}
