package com.altes.alphacure.clinic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicNumberingUpdateRequest {
    @Builder.Default
    private List<ClinicNumberingRuleDto> rules = new ArrayList<>();
}
