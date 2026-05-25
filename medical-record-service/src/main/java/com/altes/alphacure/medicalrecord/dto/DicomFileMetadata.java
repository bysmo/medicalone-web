package com.altes.alphacure.medicalrecord.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DicomFileMetadata {
    private UUID id;
    private UUID clinicId;
    private UUID patientId;
    private UUID consultationId;
    private UUID prestationId;
    private String fileName;
    private Long fileSize;
    private LocalDateTime uploadedAt;
}
