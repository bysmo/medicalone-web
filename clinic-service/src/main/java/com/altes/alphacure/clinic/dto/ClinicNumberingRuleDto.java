package com.altes.alphacure.clinic.dto;

import com.altes.alphacure.clinic.entity.NumberingDocumentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicNumberingRuleDto {
    private UUID id;
    private NumberingDocumentType documentType;
    private String documentLabel;
    @Builder.Default
    private List<NumberingSegmentDto> segments = new ArrayList<>();
    private Long nextSequence;
    private Boolean active;
    /** Aperçu du prochain numéro sans consommer le compteur */
    private String preview;
}
