package com.altes.alphacure.patient.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeedResult {
    private int actsCreated;
    private int insurancesCreated;
    private int totalActs;
    private int totalInsurances;
    private boolean skipped;
    private boolean forced;
}
