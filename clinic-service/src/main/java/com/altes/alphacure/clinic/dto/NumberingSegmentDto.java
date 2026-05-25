package com.altes.alphacure.clinic.dto;

import com.altes.alphacure.clinic.entity.NumberingSegmentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NumberingSegmentDto {
    private NumberingSegmentType type;
    /** Texte libre ou séparateur (-, /, _) */
    private String value;
    /** Largeur du compteur (ex. 5 → 00001) */
    private Integer padLength;
}
