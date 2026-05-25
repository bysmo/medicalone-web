package com.altes.alphacure.clinic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialLinksDto {
    private String facebook;
    private String instagram;
    private String linkedin;
    private String twitter;
    private String youtube;
    private String tiktok;
}
