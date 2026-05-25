package com.altes.alphacure.patient.service;

import com.altes.alphacure.patient.entity.MedicalAct;
import com.altes.alphacure.patient.entity.Practitioner;
import com.altes.alphacure.patient.exception.PatientNotFoundException;
import com.altes.alphacure.patient.repository.MedicalActRepository;
import com.altes.alphacure.patient.repository.PractitionerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Règles d'éligibilité : seuls les praticiens (rôle PRATICIEN/MEDECIN) dont la spécialité
 * correspond exactement à celle de l'acte médical peuvent recevoir une affectation.
 */
@Service
@RequiredArgsConstructor
public class PractitionerEligibilityService {

    private static final Map<String, String> ACT_CODE_TO_CANONICAL = Map.ofEntries(
            Map.entry("MEDECINE_GENERALE", "medecine generale"),
            Map.entry("PEDIATRIE", "pediatrie"),
            Map.entry("CARDIOLOGIE", "cardiologie"),
            Map.entry("GYNECOLOGIE", "gynecologie"),
            Map.entry("OPHTALMOLOGIE", "ophtalmologie"),
            Map.entry("DERMATOLOGIE", "dermatologie"),
            Map.entry("NEUROLOGIE", "neurologie"),
            Map.entry("RHUMATOLOGIE", "rhumatologie"),
            Map.entry("ORL", "orl"),
            Map.entry("GASTROENTEROLOGIE", "gastroenterologie")
    );

    private final PractitionerRepository practitionerRepository;
    private final MedicalActRepository medicalActRepository;

    public String resolveActSpecialty(MedicalAct act) {
        if (act == null) {
            return "";
        }
        if (act.getSpecialty() != null && !act.getSpecialty().isBlank()) {
            return normalizeSpecialty(act.getSpecialty());
        }
        String name = act.getName() != null ? act.getName() : "";
        var matcher = java.util.regex.Pattern.compile("(?i)consultation\\s+(.+)").matcher(name);
        if (matcher.find()) {
            return normalizeSpecialty(matcher.group(1));
        }
        return normalizeSpecialty(name);
    }

    public String resolvePractitionerSpecialty(Practitioner practitioner) {
        if (practitioner == null || practitioner.getSpecialty() == null) {
            return "";
        }
        String[] parts = practitioner.getSpecialty().split("\\|");
        if (parts.length < 2) {
            return "";
        }
        return normalizeSpecialty(parts[1]);
    }

    public String resolvePractitionerRole(Practitioner practitioner) {
        if (practitioner == null || practitioner.getSpecialty() == null) {
            return "";
        }
        return practitioner.getSpecialty().split("\\|")[0].trim().toUpperCase(Locale.ROOT);
    }

    public boolean isMedicalDoctor(Practitioner practitioner) {
        String role = resolvePractitionerRole(practitioner);
        return "PRATICIEN".equals(role) || "MEDECIN".equals(role);
    }

    public boolean specialtiesMatch(String actCanonical, Practitioner practitioner) {
        if (actCanonical == null || actCanonical.isBlank()) {
            return false;
        }
        String prCanonical = resolvePractitionerSpecialty(practitioner);
        return !prCanonical.isBlank() && actCanonical.equals(prCanonical);
    }

    public List<Practitioner> findEligibleForAct(UUID clinicId, UUID actId) {
        MedicalAct act = medicalActRepository.findByIdAndClinicId(actId, clinicId)
                .orElseThrow(() -> new PatientNotFoundException("Acte médical introuvable: " + actId));
        String actSpec = resolveActSpecialty(act);
        if (actSpec.isBlank()) {
            return List.of();
        }
        return practitionerRepository.findByClinicIdAndIsActiveTrue(clinicId).stream()
                .filter(this::isMedicalDoctor)
                .filter(p -> specialtiesMatch(actSpec, p))
                .collect(Collectors.toList());
    }

    public void assertEligibleAssignment(UUID clinicId, UUID actId, UUID practitionerId) {
        MedicalAct act = medicalActRepository.findByIdAndClinicId(actId, clinicId)
                .orElseThrow(() -> new PatientNotFoundException("Acte médical introuvable: " + actId));
        Practitioner practitioner = practitionerRepository.findByIdAndClinicId(practitionerId, clinicId)
                .orElseThrow(() -> new PatientNotFoundException("Praticien introuvable: " + practitionerId));

        if (!isMedicalDoctor(practitioner)) {
            throw new IllegalArgumentException(
                    "Seuls les médecins (praticiens) peuvent être affectés à une consultation.");
        }
        String actSpec = resolveActSpecialty(act);
        if (actSpec.isBlank() || !specialtiesMatch(actSpec, practitioner)) {
            throw new IllegalArgumentException(
                    "Ce praticien n'est pas éligible pour la spécialité de cet acte ("
                            + act.getName() + ").");
        }
    }

    private static String normalizeSpecialty(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String key = raw.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "_");
        if (ACT_CODE_TO_CANONICAL.containsKey(key)) {
            return ACT_CODE_TO_CANONICAL.get(key);
        }
        String normalized = Normalizer.normalize(raw, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
        return normalized;
    }
}
