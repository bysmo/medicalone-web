package com.altes.alphacure.clinic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicProfileDto {
    private UUID id;
    private UUID clinicId;

    private String legalName;
    private String slogan;
    private String logoDataUrl;
    private String currencyCode;
    private String currencySymbol;

    private String postalCode;
    private String region;
    private String contactEmail;
    private String contactPhone;
    private String whatsappNumber;
    private String websiteUrl;

    private String legalRegime;
    private String taxIdentificationNumber;
    private String vatNumber;
    private String tradeRegisterNumber;
    private String fiscalYearEnd;
    private String fiscalNotes;

    @Builder.Default
    private List<BankAccountDto> bankAccounts = new ArrayList<>();

    private String printHeaderA4;
    private String printFooterA4;
    private String printHeaderA5;
    private String printFooterA5;

    @Builder.Default
    private SocialLinksDto socialLinks = new SocialLinksDto();

    private LocalDateTime updatedAt;
}
