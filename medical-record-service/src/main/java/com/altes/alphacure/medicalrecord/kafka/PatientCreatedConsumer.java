package com.altes.alphacure.medicalrecord.kafka;

import com.altes.alphacure.medicalrecord.entity.MedicalRecord;
import com.altes.alphacure.medicalrecord.repository.MedicalRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Consomme l'événement patient.created pour créer automatiquement
 * le dossier médical unique du patient (contrainte : 1 patient = 1 dossier).
 *
 * SÉCURITÉ : clinicId est OBLIGATOIRE dans le payload.
 * Si absent, l'événement est rejeté pour éviter de créer
 * des dossiers médicaux non cloisonnés.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PatientCreatedConsumer {

    private final MedicalRecordRepository medicalRecordRepository;

    @KafkaListener(topics = "patient.created", groupId = "medical-record-service-group")
    public void onPatientCreated(Map<String, Object> event) {
        try {
            String patientIdStr = (String) event.get("patientId");
            String clinicIdStr  = (String) event.get("clinicId");

            // Validation stricte : clinicId est OBLIGATOIRE pour le cloisonnement
            if (patientIdStr == null || patientIdStr.isBlank()) {
                log.error("[Kafka] patient.created rejeté : patientId absent — event={}", event);
                return;
            }
            if (clinicIdStr == null || clinicIdStr.isBlank()) {
                log.error("[Kafka] patient.created rejeté : clinicId ABSENT — violation du cloisonnement — event={}", event);
                return;
            }

            UUID patientId = UUID.fromString(patientIdStr);
            UUID clinicId  = UUID.fromString(clinicIdStr);

            // Idempotence : 1 patient = 1 dossier médical (unicité enforced)
            if (medicalRecordRepository.existsByPatientIdAndClinicId(patientId, clinicId)) {
                log.warn("[Kafka] Dossier médical déjà existant pour patientId={} clinicId={}", patientId, clinicId);
                return;
            }

            MedicalRecord record = MedicalRecord.builder()
                    .patientId(patientId)
                    .clinicId(clinicId)
                    .build();

            medicalRecordRepository.save(record);
            log.info("[Kafka] Dossier médical créé — patientId={} clinicId={}", patientId, clinicId);

        } catch (IllegalArgumentException e) {
            log.error("[Kafka] patient.created — UUID invalide dans l'événement : {} — {}", event, e.getMessage());
        } catch (Exception e) {
            log.error("[Kafka] patient.created — Erreur inattendue : {}", e.getMessage(), e);
        }
    }
}
