package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.Consultation;
import com.altes.alphacure.medicalrecord.entity.MedicalStatus;
import com.altes.alphacure.medicalrecord.repository.ConsultationRepository;
import com.altes.alphacure.medicalrecord.repository.PatientVitalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class MedicalConsultationService {

    private final ConsultationRepository consultationRepository;
    private final PatientVitalRepository patientVitalRepository;

    /**
     * Returns the queue of EN_ATTENTE consultations for a given practitioner today.
     */
    @Transactional(readOnly = true)
    public List<Consultation> getQueue(UUID clinicId, UUID practitionerId) {
        return consultationRepository
                .findByClinicIdAndPractitionerIdAndMedicalStatusOrderByCreatedAtAsc(
                        clinicId, practitionerId, MedicalStatus.EN_ATTENTE);
    }

    /**
     * File d'attente du jour pour un praticien : toutes consultations du jour liées à ce médecin.
     */
    @Transactional(readOnly = true)
    public List<Consultation> getPractitionerDayQueue(UUID clinicId, UUID practitionerId) {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        return consultationRepository
                .findByClinicIdAndPractitionerIdAndCreatedAtAfterOrderByCreatedAtAsc(
                        clinicId, practitionerId, startOfDay);
    }

    /**
     * Historique des consultations d'un praticien (N derniers jours).
     */
    @Transactional(readOnly = true)
    public List<Consultation> getPractitionerConsultations(UUID clinicId, UUID practitionerId, int days,
                                                          MedicalStatus statusFilter) {
        LocalDateTime since = LocalDateTime.now().minusDays(Math.max(1, days)).toLocalDate().atStartOfDay();
        List<Consultation> list = consultationRepository
                .findByClinicIdAndPractitionerIdAndCreatedAtAfterOrderByCreatedAtDesc(
                        clinicId, practitionerId, since);
        if (statusFilter == null) {
            return list;
        }
        return list.stream()
                .filter(c -> statusFilter.equals(c.getMedicalStatus()))
                .collect(Collectors.toList());
    }

    /**
     * Returns today's consultations that are EN_ATTENTE and have no vitals recorded yet.
     */
    @Transactional(readOnly = true)
    public List<Consultation> getPatientsForVitals(UUID clinicId) {
        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        List<Consultation> todayConsultations = consultationRepository
                .findByClinicIdAndMedicalStatusAndCreatedAtAfter(clinicId, MedicalStatus.EN_ATTENTE, startOfDay);

        return todayConsultations.stream()
                .filter(c -> patientVitalRepository.findByConsultationIdOrderByTakenAtAsc(c.getId()).isEmpty())
                .collect(Collectors.toList());
    }

    /**
     * Transitions a consultation to DEMARREE and records the start time.
     */
    public Consultation startConsultation(UUID consultationId, UUID clinicId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable: " + consultationId));

        if (!clinicId.equals(consultation.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Accès non autorisé à cette consultation.");
        }

        consultation.setMedicalStatus(MedicalStatus.DEMARREE);
        consultation.setStartTime(LocalDateTime.now());
        return consultationRepository.save(consultation);
    }

    /**
     * Transitions a consultation to TERMINEE and records the end time.
     */
    public Consultation endConsultation(UUID consultationId, UUID clinicId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable: " + consultationId));

        if (!clinicId.equals(consultation.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Accès non autorisé à cette consultation.");
        }

        consultation.setMedicalStatus(MedicalStatus.TERMINEE);
        consultation.setEndTime(LocalDateTime.now());
        return consultationRepository.save(consultation);
    }

    /**
     * Save a new consultation
     */
    public Consultation createConsultation(Consultation consultation) {
        return consultationRepository.save(consultation);
    }

    /**
     * Finds a consultation by prestationId or creates one if it doesn't exist.
     */
    public Consultation getOrCreateConsultation(UUID prestationId, UUID patientId,
                                                 UUID practitionerId, UUID clinicId, String nature, String actName) {
        List<Consultation> existing = consultationRepository.findByPrestationId(prestationId);
        if (!existing.isEmpty()) {
            return existing.get(0);
        }
        Consultation newConsultation = Consultation.builder()
                .clinicId(clinicId)
                .patientId(patientId)
                .practitionerId(practitionerId)
                .prestationId(prestationId)
                .nature(nature)
                .actName(actName)
                .medicalStatus(MedicalStatus.EN_ATTENTE)
                .build();
        return consultationRepository.save(newConsultation);
    }

    /**
     * Returns full consultation history for a patient, most recent first.
     */
    @Transactional(readOnly = true)
    public List<Consultation> getPatientHistory(UUID patientId, UUID clinicId) {
        return consultationRepository.findByPatientIdAndClinicIdOrderByCreatedAtDesc(patientId, clinicId);
    }

    /**
     * Returns a single consultation by id, validating clinic ownership.
     */
    @Transactional(readOnly = true)
    public Consultation getConsultation(UUID consultationId, UUID clinicId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable: " + consultationId));

        if (!clinicId.equals(consultation.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Accès non autorisé à cette consultation.");
        }
        return consultation;
    }

    @Transactional(readOnly = true)
    public List<Consultation> getSeancesConsultations(UUID clinicId) {
        return consultationRepository.findByClinicIdAndNature(clinicId, "SEANCES");
    }

    @Transactional(readOnly = true)
    public List<Consultation> getAllConsultations(UUID clinicId) {
        return consultationRepository.findByClinicId(clinicId);
    }

    public Consultation assignPractitioner(UUID consultationId, UUID practitionerId, UUID clinicId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable: " + consultationId));
        if (!clinicId.equals(consultation.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Accès non autorisé à cette consultation.");
        }
        consultation.setPractitionerId(practitionerId);
        return consultationRepository.save(consultation);
    }

    public Consultation validateSeance(UUID prestationId, UUID patientId, UUID practitionerId, UUID clinicId, String actName) {
        Consultation consultation = null;
        if (prestationId != null) {
            java.util.Optional<Consultation> byId = consultationRepository.findById(prestationId);
            if (byId.isPresent()) {
                consultation = byId.get();
            } else {
                List<Consultation> byPrestationId = consultationRepository.findByPrestationId(prestationId);
                if (!byPrestationId.isEmpty()) {
                    consultation = byPrestationId.stream()
                            .filter(c -> c.getMedicalStatus() != MedicalStatus.TERMINEE)
                            .findFirst()
                            .orElse(byPrestationId.get(0));
                }
            }
        }

        if (consultation != null) {
            consultation.setPractitionerId(practitionerId);
            consultation.setMedicalStatus(MedicalStatus.TERMINEE);
            if (consultation.getStartTime() == null) {
                consultation.setStartTime(LocalDateTime.now());
            }
            consultation.setEndTime(LocalDateTime.now());
            return consultationRepository.save(consultation);
        }

        Consultation newConsultation = Consultation.builder()
                .clinicId(clinicId)
                .patientId(patientId)
                .practitionerId(practitionerId)
                .prestationId(prestationId)
                .nature("SEANCES")
                .actName(actName)
                .medicalStatus(MedicalStatus.TERMINEE)
                .startTime(LocalDateTime.now())
                .endTime(LocalDateTime.now())
                .build();
        return consultationRepository.save(newConsultation);
    }

    public void deleteConsultation(UUID consultationId, UUID clinicId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new RuntimeException("Consultation introuvable: " + consultationId));
        if (!clinicId.equals(consultation.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Accès non autorisé à cette consultation.");
        }
        consultationRepository.delete(consultation);
    }
}
