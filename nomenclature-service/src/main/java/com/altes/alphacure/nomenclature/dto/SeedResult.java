package com.altes.alphacure.nomenclature.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeedResult {
    private int created;
    private int total;
    private boolean skipped;
    private boolean forced;
}
