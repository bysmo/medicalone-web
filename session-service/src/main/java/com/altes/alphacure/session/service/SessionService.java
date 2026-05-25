package com.altes.alphacure.session.service;

import com.altes.alphacure.session.entity.SessionPackage;
import com.altes.alphacure.session.entity.SessionUsage;
import com.altes.alphacure.session.event.SessionUsedEvent;
import com.altes.alphacure.session.exception.SessionException;
import com.altes.alphacure.session.repository.SessionPackageRepository;
import com.altes.alphacure.session.repository.SessionUsageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SessionService {

    private static final String TOPIC_SESSION_USED = "session.used";

    private final SessionPackageRepository sessionPackageRepository;
    private final SessionUsageRepository sessionUsageRepository;
    private final KafkaTemplate<String, SessionUsedEvent> kafkaTemplate;

    public SessionPackage createPackage(UUID clinicId, UUID patientId, UUID medicalActId, int totalSessions) {
        SessionPackage pkg = SessionPackage.builder()
                .clinicId(clinicId)
                .patientId(patientId)
                .medicalActId(medicalActId)
                .totalSessions(totalSessions)
                .remainingSessions(totalSessions)
                .build();
        SessionPackage saved = sessionPackageRepository.save(pkg);
        log.info("Pack de séances créé: {} ({} séances) pour patient: {}", saved.getId(), totalSessions, patientId);
        return saved;
    }

    /**
     * Consomme une séance du pack.
     * Contrainte : impossible si remainingSessions = 0
     */
    public SessionUsage useSession(UUID clinicId, UUID packageId, String notes) {
        SessionPackage pkg = sessionPackageRepository.findByIdAndClinicId(packageId, clinicId)
                .orElseThrow(() -> new SessionException("Pack de séances non trouvé: " + packageId));

        if (pkg.getRemainingSessions() <= 0) {
            throw new SessionException("Aucune séance restante dans ce pack. Créez un nouveau pack.");
        }

        // Décrémentation atomique
        pkg.setRemainingSessions(pkg.getRemainingSessions() - 1);
        sessionPackageRepository.save(pkg);

        SessionUsage usage = SessionUsage.builder()
                .sessionPackageId(packageId)
                .usedAt(LocalDateTime.now())
                .notes(notes)
                .build();
        SessionUsage savedUsage = sessionUsageRepository.save(usage);

        log.info("Séance consommée: pack {} — restantes: {}", packageId, pkg.getRemainingSessions());

        // Publication événement Kafka
        SessionUsedEvent event = SessionUsedEvent.builder()
                .sessionPackageId(packageId)
                .patientId(pkg.getPatientId())
                .clinicId(clinicId)
                .medicalActId(pkg.getMedicalActId())
                .remainingSessions(pkg.getRemainingSessions())
                .usedAt(LocalDateTime.now())
                .build();
        kafkaTemplate.send(TOPIC_SESSION_USED, packageId.toString(), event);

        return savedUsage;
    }

    @Transactional(readOnly = true)
    public List<SessionPackage> getPackagesByPatient(UUID clinicId, UUID patientId) {
        return sessionPackageRepository.findByClinicIdAndPatientId(clinicId, patientId);
    }

    @Transactional(readOnly = true)
    public SessionPackage getPackage(UUID clinicId, UUID packageId) {
        return sessionPackageRepository.findByIdAndClinicId(packageId, clinicId)
                .orElseThrow(() -> new SessionException("Pack de séances non trouvé: " + packageId));
    }
}
