package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.dto.DicomFileMetadata;
import com.altes.alphacure.medicalrecord.entity.PatientDicomFile;
import com.altes.alphacure.medicalrecord.repository.PatientDicomFileRepository;
import com.altes.alphacure.medicalrecord.security.ClinicContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medical/dicom")
@RequiredArgsConstructor
public class PatientDicomFileController {

    private final PatientDicomFileRepository repository;
    private final ClinicContextHolder clinicContextHolder;

    private UUID parseUUID(String str) {
        if (str == null) return null;
        str = str.trim();
        if (str.isEmpty() || "null".equalsIgnoreCase(str) || "undefined".equalsIgnoreCase(str)) return null;
        try {
            return UUID.fromString(str);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<DicomFileMetadata> uploadDicomFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("patientId") String patientIdStr,
            @RequestParam(value = "consultationId", required = false) String consultationIdStr,
            @RequestParam(value = "prestationId", required = false) String prestationIdStr) throws IOException {

        UUID clinicId = clinicContextHolder.getClinicId();
        UUID patientId = parseUUID(patientIdStr);
        UUID consultationId = parseUUID(consultationIdStr);
        UUID prestationId = parseUUID(prestationIdStr);

        if (patientId == null) {
            return ResponseEntity.badRequest().build();
        }

        PatientDicomFile dicom = PatientDicomFile.builder()
                .clinicId(clinicId)
                .patientId(patientId)
                .consultationId(consultationId)
                .prestationId(prestationId)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .dicomData(file.getBytes())
                .build();

        PatientDicomFile saved = repository.save(dicom);

        DicomFileMetadata meta = new DicomFileMetadata(
                saved.getId(), saved.getClinicId(), saved.getPatientId(),
                saved.getConsultationId(), saved.getPrestationId(),
                saved.getFileName(), saved.getFileSize(), saved.getUploadedAt());

        return ResponseEntity.status(HttpStatus.CREATED).body(meta);
    }

    @GetMapping("/consultation/{consultationId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<List<DicomFileMetadata>> getByConsultation(@PathVariable UUID consultationId) {
        return ResponseEntity.ok(repository.findMetadataByConsultationId(consultationId));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<List<DicomFileMetadata>> getByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(repository.findMetadataByPatientId(patientId));
    }

    @GetMapping("/{id}/raw")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<byte[]> getRawDicom(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        PatientDicomFile file = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fichier DICOM introuvable"));

        if (!clinicId.equals(file.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException("Accès non autorisé.");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFileName() + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file.getDicomData());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<Void> deleteDicom(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        PatientDicomFile file = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fichier DICOM introuvable"));

        if (!clinicId.equals(file.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException("Accès non autorisé.");
        }

        repository.delete(file);
        return ResponseEntity.noContent().build();
    }
}
