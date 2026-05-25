package com.altes.alphacure.clinic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Mise à jour du profil clinique + champs de base de la clinique.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicProfileUpdateRequest {

    // Champs Clinic (table clinics)
    private String name;
    private String phone;
    private String email;
    private String address;
    private String country;
    private String city;

    // Profil étendu
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

    private SocialLinksDto socialLinks;
}
