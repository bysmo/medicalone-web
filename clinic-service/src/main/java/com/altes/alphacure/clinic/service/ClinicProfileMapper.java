package com.altes.alphacure.clinic.service;

import com.altes.alphacure.clinic.dto.*;
import com.altes.alphacure.clinic.entity.ClinicProfile;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ClinicProfileMapper {

    private final ObjectMapper objectMapper;

    public ClinicProfileDto toDto(ClinicProfile entity) {
        if (entity == null) {
            return emptyDto(null);
        }
        return ClinicProfileDto.builder()
                .id(entity.getId())
                .clinicId(entity.getClinicId())
                .legalName(entity.getLegalName())
                .slogan(entity.getSlogan())
                .logoDataUrl(entity.getLogoDataUrl())
                .currencyCode(entity.getCurrencyCode())
                .currencySymbol(entity.getCurrencySymbol())
                .postalCode(entity.getPostalCode())
                .region(entity.getRegion())
                .contactEmail(entity.getContactEmail())
                .contactPhone(entity.getContactPhone())
                .whatsappNumber(entity.getWhatsappNumber())
                .websiteUrl(entity.getWebsiteUrl())
                .legalRegime(entity.getLegalRegime())
                .taxIdentificationNumber(entity.getTaxIdentificationNumber())
                .vatNumber(entity.getVatNumber())
                .tradeRegisterNumber(entity.getTradeRegisterNumber())
                .fiscalYearEnd(entity.getFiscalYearEnd())
                .fiscalNotes(entity.getFiscalNotes())
                .bankAccounts(readBankAccounts(entity.getBankAccountsJson()))
                .printHeaderA4(entity.getPrintHeaderA4())
                .printFooterA4(entity.getPrintFooterA4())
                .printHeaderA5(entity.getPrintHeaderA5())
                .printFooterA5(entity.getPrintFooterA5())
                .socialLinks(readSocialLinks(entity.getSocialLinksJson()))
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public ClinicProfileDto emptyDto(java.util.UUID clinicId) {
        return ClinicProfileDto.builder()
                .clinicId(clinicId)
                .currencyCode("XOF")
                .currencySymbol("FCFA")
                .bankAccounts(new ArrayList<>())
                .socialLinks(new SocialLinksDto())
                .build();
    }

    public void applyFromRequest(ClinicProfile entity, ClinicProfileUpdateRequest req) {
        entity.setLegalName(trim(req.getLegalName()));
        entity.setSlogan(trim(req.getSlogan()));
        entity.setLogoDataUrl(req.getLogoDataUrl());
        entity.setCurrencyCode(defaultIfBlank(req.getCurrencyCode(), "XOF"));
        entity.setCurrencySymbol(defaultIfBlank(req.getCurrencySymbol(), "FCFA"));
        entity.setPostalCode(trim(req.getPostalCode()));
        entity.setRegion(trim(req.getRegion()));
        entity.setContactEmail(trim(req.getContactEmail()));
        entity.setContactPhone(trim(req.getContactPhone()));
        entity.setWhatsappNumber(trim(req.getWhatsappNumber()));
        entity.setWebsiteUrl(trim(req.getWebsiteUrl()));
        entity.setLegalRegime(trim(req.getLegalRegime()));
        entity.setTaxIdentificationNumber(trim(req.getTaxIdentificationNumber()));
        entity.setVatNumber(trim(req.getVatNumber()));
        entity.setTradeRegisterNumber(trim(req.getTradeRegisterNumber()));
        entity.setFiscalYearEnd(trim(req.getFiscalYearEnd()));
        entity.setFiscalNotes(req.getFiscalNotes());
        entity.setBankAccountsJson(writeBankAccounts(req.getBankAccounts()));
        entity.setPrintHeaderA4(req.getPrintHeaderA4());
        entity.setPrintFooterA4(req.getPrintFooterA4());
        entity.setPrintHeaderA5(req.getPrintHeaderA5());
        entity.setPrintFooterA5(req.getPrintFooterA5());
        entity.setSocialLinksJson(writeSocialLinks(req.getSocialLinks()));
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public String writeBankAccounts(List<BankAccountDto> accounts) {
        try {
            return objectMapper.writeValueAsString(accounts != null ? accounts : Collections.emptyList());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Comptes bancaires invalides", e);
        }
    }

    public List<BankAccountDto> readBankAccounts(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return new ArrayList<>();
        }
    }

    public String writeSocialLinks(SocialLinksDto links) {
        try {
            return objectMapper.writeValueAsString(links != null ? links : new SocialLinksDto());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Liens réseaux sociaux invalides", e);
        }
    }

    public SocialLinksDto readSocialLinks(String json) {
        if (json == null || json.isBlank()) {
            return new SocialLinksDto();
        }
        try {
            return objectMapper.readValue(json, SocialLinksDto.class);
        } catch (JsonProcessingException e) {
            return new SocialLinksDto();
        }
    }

    private static String trim(String s) {
        return s == null ? null : s.trim();
    }
}
