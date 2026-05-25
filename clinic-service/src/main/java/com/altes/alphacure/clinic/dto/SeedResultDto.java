package com.altes.alphacure.clinic.dto;

import lombok.Data;

@Data
public class SeedResultDto {
    private int created;
    private int total;
    private int actsCreated;
    private int insurancesCreated;
    private int totalActs;
    private int totalInsurances;
    private boolean skipped;
    private boolean forced;
}
