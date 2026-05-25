package com.altes.alphacure.clinic.service;

import com.altes.alphacure.clinic.client.KeycloakAdminClient;
import com.altes.alphacure.clinic.dto.*;
import com.altes.alphacure.clinic.entity.*;
import com.altes.alphacure.clinic.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicService {

    private final ClinicRepository clinicRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final ClinicSettingRepository clinicSettingRepository;
    private final KeycloakAdminClient keycloakAdminClient;
    private final ClinicProvisioningService clinicProvisioningService;
    private final ClinicProfileService clinicProfileService;
    private final ClinicNumberingService clinicNumberingService;

    @Transactional
    public ClinicResponse registerClinic(ClinicRegisterRequest request) {
        log.info("Demande d'enregistrement de clinique reçue : {}", request.getName());

        if (clinicRepository.existsByCode(request.getCode())) {
            throw new RuntimeException("Une clinique avec le code '" + request.getCode() + "' existe déjà.");
        }
        if (clinicRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Une clinique avec l'email '" + request.getEmail() + "' existe déjà.");
        }

        // 1. Créer et enregistrer la clinique en attente
        Clinic clinic = Clinic.builder()
                .name(request.getName())
                .code(request.getCode())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .country(request.getCountry())
                .city(request.getCity())
                .status(ClinicStatus.PENDING)
                .build();
        clinic = clinicRepository.save(clinic);

        // 2. Créer une souscription inactive
        Subscription subscription = Subscription.builder()
                .clinicId(clinic.getId())
                .planName(request.getPlanName())
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusYears(1))
                .status(SubscriptionStatus.CANCELLED) // Inactif avant validation
                .build();
        subscription = subscriptionRepository.save(subscription);

        // 3. Sauvegarder le nom d'utilisateur admin dans les paramètres de la clinique
        ClinicSetting setting = ClinicSetting.builder()
                .clinicId(clinic.getId())
                .settingKey("admin_username")
                .settingValue(request.getAdminUsername())
                .build();
        clinicSettingRepository.save(setting);

        // 4. Créer l'utilisateur dans Keycloak en état DÉSACTIVÉ
        try {
            keycloakAdminClient.createClinicAdminUser(
                    request.getAdminUsername(),
                    request.getAdminEmail(),
                    request.getAdminPassword(),
                    request.getAdminFirstName(),
                    request.getAdminLastName(),
                    clinic.getId()
            );
        } catch (Exception e) {
            log.error("Erreur lors de la création Keycloak, annulation de la transaction.", e);
            throw new RuntimeException("Création de compte administrateur Keycloak échouée : " + e.getMessage());
        }

        return mapToClinicResponse(clinic, subscription);
    }

    @Transactional
    public ClinicResponse validateSubscription(UUID clinicId, SubscriptionValidationRequest request) {
        log.info("Validation de la souscription pour la clinique ID : {}", clinicId);

        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinique introuvable avec l'ID : " + clinicId));

        Subscription subscription = subscriptionRepository.findByClinicId(clinicId)
                .orElseThrow(() -> new RuntimeException("Souscription introuvable pour la clinique ID : " + clinicId));

        List<ClinicSetting> settings = clinicSettingRepository.findByClinicId(clinicId);
        String adminUsername = settings.stream()
                .filter(s -> "admin_username".equals(s.getSettingKey()))
                .map(ClinicSetting::getSettingValue)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Nom d'utilisateur admin introuvable dans les paramètres."));

        // 1. Initialiser les règles de numérotation par défaut avant le provisionnement
        clinicNumberingService.ensureDefaultNumbering(clinicId);

        // 2. Provisionner actes + nomenclatures tant que la clinique est encore PENDING (échec = pas d'activation)
        clinicProvisioningService.provisionClinicData(clinicId, false);

        // 2. Activer la clinique et la souscription
        clinic.setStatus(ClinicStatus.ACTIVE);
        subscription.setStatus(SubscriptionStatus.ACTIVE);

        if (request.getPlanName() != null) {
            subscription.setPlanName(request.getPlanName());
        }
        if (request.getStartDate() != null) {
            subscription.setStartDate(request.getStartDate());
        } else {
            subscription.setStartDate(LocalDate.now());
        }
        if (request.getEndDate() != null) {
            subscription.setEndDate(request.getEndDate());
        } else {
            subscription.setEndDate(LocalDate.now().plusYears(1));
        }

        clinicRepository.save(clinic);
        subscriptionRepository.save(subscription);

        // 3. Activer l'admin Keycloak
        keycloakAdminClient.enableClinicAdminUser(adminUsername);

        clinicProfileService.ensureProfileExists(clinicId);

        log.info("Clinique et administrateur '{}' activés avec succès !", adminUsername);
        return mapToClinicResponse(clinic, subscription);
    }

    @Transactional
    public ClinicResponse reprovisionClinicData(UUID clinicId, boolean force) {
        Clinic clinic = clinicRepository.findById(clinicId)
                .orElseThrow(() -> new RuntimeException("Clinique introuvable avec l'ID : " + clinicId));

        if (clinic.getStatus() != ClinicStatus.ACTIVE) {
            throw new RuntimeException(
                    "Seules les cliniques actives peuvent être re-provisionnées. Statut actuel : " + clinic.getStatus());
        }

        clinicProvisioningService.provisionClinicData(clinicId, force);

        Subscription subscription = subscriptionRepository.findByClinicId(clinicId).orElse(null);
        log.info("Re-provisionnement réussi pour la clinique {}", clinicId);
        return mapToClinicResponse(clinic, subscription);
    }

    public List<ClinicResponse> getAllClinics() {
        return clinicRepository.findAll().stream()
                .map(c -> {
                    Subscription s = subscriptionRepository.findByClinicId(c.getId()).orElse(null);
                    return mapToClinicResponse(c, s);
                })
                .collect(Collectors.toList());
    }

    public ClinicResponse getClinicById(UUID id) {
        Clinic clinic = clinicRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Clinique introuvable"));
        Subscription s = subscriptionRepository.findByClinicId(clinic.getId()).orElse(null);
        return mapToClinicResponse(clinic, s);
    }

    public void createClinicUser(ClinicUserCreateRequest request, UUID clinicId) {
        log.info("Création d'un utilisateur Keycloak staff '{}' pour la clinique ID: {}", request.getUsername(), clinicId);
        
        String keycloakRole = request.getRoleName().toUpperCase();
        if ("PRATICIEN".equals(keycloakRole)) {
            keycloakRole = "MEDECIN";
        }
        
        keycloakAdminClient.createClinicUser(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getFirstName(),
                request.getLastName(),
                clinicId,
                keycloakRole
        );
    }

    public Map<String, Object> getUserDetails(String emailOrUsername, UUID clinicId) {
        return keycloakAdminClient.getUserDetails(emailOrUsername, clinicId);
    }

    public void updateUserEnabledStatus(String username, boolean enabled, UUID clinicId) {
        keycloakAdminClient.updateUserEnabledStatus(username, enabled, clinicId);
    }

    public void unlockUser(String username, UUID clinicId) {
        keycloakAdminClient.unlockUser(username, clinicId);
    }

    public void repairUserClinicContext(String usernameOrEmail, UUID clinicId) {
        keycloakAdminClient.repairUserClinicContext(usernameOrEmail, clinicId);
    }

    private ClinicResponse mapToClinicResponse(Clinic clinic, Subscription subscription) {
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
}
