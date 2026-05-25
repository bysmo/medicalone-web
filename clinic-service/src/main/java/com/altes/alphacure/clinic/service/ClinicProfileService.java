package com.altes.alphacure.clinic.service;

import com.altes.alphacure.clinic.dto.*;
import com.altes.alphacure.clinic.entity.Clinic;
import com.altes.alphacure.clinic.entity.ClinicProfile;
import com.altes.alphacure.clinic.repository.ClinicProfileRepository;
import com.altes.alphacure.clinic.repository.ClinicRepository;
import com.altes.alphacure.clinic.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClinicProfileService {

    private static final int MAX_LOGO_LENGTH = 600_000;

    private final ClinicRepository clinicRepository;
    private final ClinicProfileRepository profileRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ClinicProfileMapper profileMapper;
    private final ClinicProvisioningService clinicProvisioningService;

    @Transactional(readOnly = true)
    public ClinicBrandingResponse getBranding(UUID clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinique introuvable"));
        String logo = profileRepository.findByClinicId(clinicId)
                .map(ClinicProfile::getLogoDataUrl)
                .orElse(null);
        return ClinicBrandingResponse.builder()
                .clinicId(clinic.getId())
                .name(clinic.getName())
                .code(clinic.getCode())
                .logoDataUrl(logo)
                .build();
    }

    @Transactional(readOnly = true)
    public ClinicFullResponse getMyClinic(UUID clinicId) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinique introuvable"));
        ClinicProfile profile = profileRepository.findByClinicId(clinicId)
                .orElse(null);
        return buildFullResponse(clinic, profile);
    }

    @Transactional
    public ClinicFullResponse updateMyClinic(UUID clinicId, ClinicProfileUpdateRequest request) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinique introuvable"));

        if (request.getName() != null && !request.getName().isBlank()) {
            clinic.setName(request.getName().trim());
        }
        if (request.getPhone() != null) clinic.setPhone(request.getPhone().trim());
        if (request.getEmail() != null) clinic.setEmail(request.getEmail().trim());
        if (request.getAddress() != null) clinic.setAddress(request.getAddress());
        if (request.getCountry() != null) clinic.setCountry(request.getCountry().trim());
        if (request.getCity() != null) clinic.setCity(request.getCity().trim());
        clinicRepository.save(clinic);

        validateImageDataUrl(request.getLogoDataUrl(), "logo");
        validateImageDataUrl(request.getPrintHeaderA4(), "en-tête A4");
        validateImageDataUrl(request.getPrintFooterA4(), "pied de page A4");
        validateImageDataUrl(request.getPrintHeaderA5(), "en-tête A5");
        validateImageDataUrl(request.getPrintFooterA5(), "pied de page A5");

        ClinicProfile profile = profileRepository.findByClinicId(clinicId)
                .orElseGet(() -> ClinicProfile.builder()
                        .clinicId(clinicId)
                        .currencyCode("XOF")
                        .currencySymbol("FCFA")
                        .build());
        profileMapper.applyFromRequest(profile, request);
        profile = profileRepository.save(profile);

        return buildFullResponse(clinic, profile);
    }

    @Transactional
    public void ensureProfileExists(UUID clinicId) {
        if (!profileRepository.existsByClinicId(clinicId)) {
            profileRepository.save(ClinicProfile.builder()
                    .clinicId(clinicId)
                    .currencyCode("XOF")
                    .currencySymbol("FCFA")
                    .build());
        }
    }

    private ClinicFullResponse buildFullResponse(Clinic clinic, ClinicProfile profile) {
        var subscription = subscriptionRepository.findByClinicId(clinic.getId()).orElse(null);
        ClinicResponse clinicResponse = mapClinic(clinic, subscription);
        ClinicProfileDto profileDto = profile != null
                ? profileMapper.toDto(profile)
                : profileMapper.emptyDto(clinic.getId());
        return ClinicFullResponse.builder()
                .clinic(clinicResponse)
                .profile(profileDto)
                .build();
    }

    private ClinicResponse mapClinic(Clinic clinic, com.altes.alphacure.clinic.entity.Subscription subscription) {
        SubscriptionResponse subResp = null;
        if (subscription != null) {
            subResp = SubscriptionResponse.builder()
                    .id(subscription.getId())
                    .clinicId(subscription.getClinicId())
                    .planName(subscription.getPlanName())
                    .startDate(subscription.getStartDate())
                    .endDate(subscription.getEndDate())
                    .status(subscription.getStatus())
                    .build();
        }
        return ClinicResponse.builder()
                .id(clinic.getId())
                .name(clinic.getName())
                .code(clinic.getCode())
                .phone(clinic.getPhone())
                .email(clinic.getEmail())
                .address(clinic.getAddress())
                .country(clinic.getCountry())
                .city(clinic.getCity())
                .status(clinic.getStatus())
                .createdAt(clinic.getCreatedAt())
                .subscription(subResp)
                .dataProvisioned(clinicProvisioningService.isDataProvisioned(clinic.getId()))
                .build();
    }

    private void validateImageDataUrl(String dataUrl, String fieldLabel) {
        if (dataUrl == null || dataUrl.isBlank()) {
            return;
        }
        if (dataUrl.length() > MAX_LOGO_LENGTH) {
            throw new IllegalArgumentException(
                    "L'image « " + fieldLabel + " » est trop volumineuse (max ~400 Ko). Utilisez une image plus petite.");
        }
        if (!dataUrl.startsWith("data:image/")) {
            throw new IllegalArgumentException(
                    "« " + fieldLabel + " » doit être une image (PNG, JPG, etc.).");
        }
    }
}
