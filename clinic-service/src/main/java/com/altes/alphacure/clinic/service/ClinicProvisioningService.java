package com.altes.alphacure.clinic.service;

import com.altes.alphacure.clinic.client.NomenclatureClient;
import com.altes.alphacure.clinic.client.PatientClient;
import com.altes.alphacure.clinic.dto.SeedResultDto;
import com.altes.alphacure.clinic.entity.ClinicSetting;
import com.altes.alphacure.clinic.exception.ClinicProvisioningException;
import com.altes.alphacure.clinic.repository.ClinicSettingRepository;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClinicProvisioningService {

    public static final String SETTING_SEED_COMPLETED = "seed_completed";

    private static final int MIN_NOMENCLATURES = 50;
    private static final int MIN_MEDICAL_ACTS = 10;
    private static final int MIN_INSURANCES = 10;

    private final PatientClient patientClient;
    private final NomenclatureClient nomenclatureClient;
    private final ClinicSettingRepository clinicSettingRepository;

    @Transactional
    public void provisionClinicData(UUID clinicId, boolean force) {
        log.info("Provisioning clinique {} (force={})", clinicId, force);

        SeedResultDto actsResult = callPatientSeed(clinicId, force);
        callStaffSeed(clinicId, force);
        SeedResultDto nomenclatureResult = callNomenclatureSeed(clinicId, force);

        validateProvisioning(actsResult, nomenclatureResult);

        markSeedCompleted(clinicId, true);
        log.info("Provisioning terminé pour la clinique {}", clinicId);
    }

    public boolean isDataProvisioned(UUID clinicId) {
        return clinicSettingRepository.findByClinicIdAndSettingKey(clinicId, SETTING_SEED_COMPLETED)
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElse(false);
    }

    @Transactional
    public void markSeedCompleted(UUID clinicId, boolean completed) {
        ClinicSetting setting = clinicSettingRepository
                .findByClinicIdAndSettingKey(clinicId, SETTING_SEED_COMPLETED)
                .orElse(ClinicSetting.builder()
                        .clinicId(clinicId)
                        .settingKey(SETTING_SEED_COMPLETED)
                        .build());
        setting.setSettingValue(completed ? "true" : "false");
        clinicSettingRepository.save(setting);
    }

    private SeedResultDto callPatientSeed(UUID clinicId, boolean force) {
        try {
            return patientClient.seedClinicActs(clinicId, force);
        } catch (FeignException e) {
            throw new ClinicProvisioningException(
                    "Échec du provisionnement des actes médicaux (patient-service) : " + e.getMessage(), e);
        }
    }

    private void callStaffSeed(UUID clinicId, boolean force) {
        try {
            patientClient.seedClinicStaff(clinicId, force);
        } catch (FeignException e) {
            throw new ClinicProvisioningException(
                    "Échec du provisionnement du personnel (patient-service) : " + e.getMessage(), e);
        }
    }

    private SeedResultDto callNomenclatureSeed(UUID clinicId, boolean force) {
        try {
            return nomenclatureClient.seedClinicNomenclature(clinicId, force);
        } catch (FeignException e) {
            throw new ClinicProvisioningException(
                    "Échec du provisionnement des nomenclatures (nomenclature-service) : " + e.getMessage(), e);
        }
    }

    private void validateProvisioning(SeedResultDto actsResult, SeedResultDto nomenclatureResult) {
        if (nomenclatureResult.getTotal() < MIN_NOMENCLATURES) {
            throw new ClinicProvisioningException(String.format(
                    "Nomenclatures insuffisantes pour la clinique (%d/%d attendues).",
                    nomenclatureResult.getTotal(), MIN_NOMENCLATURES));
        }
        if (actsResult.getTotalActs() < MIN_MEDICAL_ACTS) {
            throw new ClinicProvisioningException(String.format(
                    "Actes médicaux insuffisants pour la clinique (%d/%d attendus).",
                    actsResult.getTotalActs(), MIN_MEDICAL_ACTS));
        }
        if (actsResult.getTotalInsurances() < MIN_INSURANCES) {
            throw new ClinicProvisioningException(String.format(
                    "Assurances insuffisantes pour la clinique (%d/%d attendues).",
                    actsResult.getTotalInsurances(), MIN_INSURANCES));
        }
    }
}
