package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.dto.SeedResult;
import com.altes.alphacure.patient.entity.ActTariff;
import com.altes.alphacure.patient.entity.Insurance;
import com.altes.alphacure.patient.entity.MedicalAct;
import com.altes.alphacure.patient.entity.enums.ActNature;
import com.altes.alphacure.patient.entity.enums.TariffType;
import com.altes.alphacure.patient.repository.ActTariffRepository;
import com.altes.alphacure.patient.repository.InsuranceRepository;
import com.altes.alphacure.patient.repository.MedicalActRepository;
import java.math.BigDecimal;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Catalogue des actes médicaux — cloisonné par clinique.
 * Rôles Keycloak : ADMIN, MEDECIN, INFIRMIER, RECEPTIONNISTE, LABORANTIN, CAISSIER...
 */
@RestController
@RequestMapping("/api/v1/medical-acts")
@RequiredArgsConstructor
@Tag(name = "Actes Médicaux", description = "Gestion du catalogue d'actes médicaux")
public class MedicalActController {

    private static final int MIN_MEDICAL_ACTS = 10;
    private static final int MIN_INSURANCES = 10;

    private final MedicalActRepository medicalActRepository;
    private final ActTariffRepository actTariffRepository;
    private final InsuranceRepository insuranceRepository;
    private final ClinicContextHolder clinicContextHolder;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','LABORANTIN','PHARMACIEN','MANAGER_CLINIQUE')")
    @Operation(summary = "Lister tous les actes médicaux actifs de la clinique")
    public ResponseEntity<List<MedicalAct>> getAll(
            @RequestParam(required = false) String nature,
            @RequestParam(required = false) String specialty,
            @RequestParam(required = false) String search) {
        UUID clinicId = clinicContextHolder.getClinicId();

        if (search != null && !search.isEmpty()) {
            return ResponseEntity.ok(medicalActRepository.searchByClinicId(clinicId, search, nature, specialty));
        }
        if (nature != null && !nature.isEmpty() && specialty != null && !specialty.isEmpty()) {
            return ResponseEntity.ok(medicalActRepository.findByClinicIdAndNatureAndSpecialtyAndIsActiveTrue(clinicId, nature, specialty));
        } else if (nature != null && !nature.isEmpty()) {
            return ResponseEntity.ok(medicalActRepository.findByClinicIdAndNatureAndIsActiveTrue(clinicId, nature));
        } else if (specialty != null && !specialty.isEmpty()) {
            return ResponseEntity.ok(medicalActRepository.findByClinicIdAndSpecialtyAndIsActiveTrue(clinicId, specialty));
        }
        return ResponseEntity.ok(medicalActRepository.findByClinicIdAndIsActiveTrue(clinicId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Créer un acte médical")
    public ResponseEntity<MedicalAct> create(@RequestBody MedicalAct act) {
        act.setClinicId(clinicContextHolder.getClinicId());
        return ResponseEntity.status(HttpStatus.CREATED).body(medicalActRepository.save(act));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Modifier un acte médical")
    public ResponseEntity<MedicalAct> update(@PathVariable UUID id, @RequestBody MedicalAct act) {
        UUID clinicId = clinicContextHolder.getClinicId();
        MedicalAct existing = medicalActRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Acte non trouvé ou accès refusé: " + id));
        existing.setName(act.getName());
        existing.setCode(act.getCode());
        existing.setNature(act.getNature());
        existing.setIsLabExam(act.getIsLabExam());
        existing.setLabSection(act.getLabSection());
        existing.setSpecialty(act.getSpecialty());
        existing.setIsActive(act.getIsActive());
        return ResponseEntity.ok(medicalActRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Désactiver un acte médical")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        MedicalAct existing = medicalActRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Acte non trouvé ou accès refusé: " + id));
        existing.setIsActive(false);
        medicalActRepository.save(existing);
        return ResponseEntity.noContent().build();
    }

    // ─── Tarifications ───────────────────────────────────────────────────────

    @GetMapping("/tariffs")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE','COMPTABLE','GESTIONNAIRE_ASSURANCES')")
    @Operation(summary = "Lister tous les tarifs des actes de la clinique")
    public ResponseEntity<List<ActTariff>> getAllTariffs() {
        UUID clinicId = clinicContextHolder.getClinicId();
        // Filtrer par clinique via les actes appartenant à la clinique
        List<MedicalAct> acts = medicalActRepository.findByClinicIdAndIsActiveTrue(clinicId);
        List<UUID> actIds = acts.stream().map(MedicalAct::getId).toList();
        return ResponseEntity.ok(actTariffRepository.findByActIdIn(actIds));
    }

    @PostMapping("/tariffs/batch")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','COMPTABLE')")
    @Transactional
    @Operation(summary = "Ajouter/modifier une liste de tarifs")
    public ResponseEntity<List<ActTariff>> saveTariffsBatch(@RequestBody List<ActTariff> tariffs) {
        UUID clinicId = clinicContextHolder.getClinicId();
        for (ActTariff tariff : tariffs) {
            // Vérification cloisonnement : l'acte doit appartenir à la clinique
            medicalActRepository.findByIdAndClinicId(tariff.getActId(), clinicId)
                    .orElseThrow(() -> new RuntimeException("Acte non trouvé ou accès refusé: " + tariff.getActId()));

            ActTariff existing = actTariffRepository
                    .findByActIdAndTariffType(tariff.getActId(), tariff.getTariffType())
                    .orElse(null);
            if (existing != null) {
                existing.setAmount(tariff.getAmount());
                actTariffRepository.save(existing);
            } else {
                actTariffRepository.save(tariff);
            }
        }
        List<MedicalAct> acts = medicalActRepository.findByClinicIdAndIsActiveTrue(clinicId);
        List<UUID> actIds = acts.stream().map(MedicalAct::getId).toList();
        return ResponseEntity.ok(actTariffRepository.findByActIdIn(actIds));
    }

    @GetMapping("/{actId}/tariffs")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE','COMPTABLE','GESTIONNAIRE_ASSURANCES')")
    @Operation(summary = "Lister les tarifs d'un acte")
    public ResponseEntity<List<ActTariff>> getTariffs(@PathVariable UUID actId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        // Vérification cloisonnement
        medicalActRepository.findByIdAndClinicId(actId, clinicId)
                .orElseThrow(() -> new RuntimeException("Acte non trouvé ou accès refusé"));
        return ResponseEntity.ok(actTariffRepository.findByActId(actId));
    }

    @PostMapping("/{actId}/tariffs")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','COMPTABLE')")
    @Operation(summary = "Ajouter/modifier un tarif pour un acte")
    public ResponseEntity<ActTariff> saveTariff(@PathVariable UUID actId, @RequestBody ActTariff tariff) {
        UUID clinicId = clinicContextHolder.getClinicId();
        medicalActRepository.findByIdAndClinicId(actId, clinicId)
                .orElseThrow(() -> new RuntimeException("Acte non trouvé ou accès refusé"));
        tariff.setActId(actId);
        return ResponseEntity.status(HttpStatus.CREATED).body(actTariffRepository.save(tariff));
    }

    // ─── Seed (appelé depuis clinic-service lors de la création de clinique) ─

    @PostMapping("/seed")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Initialiser actes et assureurs par défaut (SUPER_ADMIN / clinic-service)")
    public ResponseEntity<SeedResult> seedClinicActs(
            @RequestParam UUID clinicId,
            @RequestParam(defaultValue = "false") boolean force) {

        long actsCount = medicalActRepository.countByClinicIdAndIsActiveTrue(clinicId);
        long insurancesCount = insuranceRepository.countByClinicId(clinicId);

        if (force || (actsCount > 0 && actsCount < MIN_MEDICAL_ACTS)
                || (insurancesCount > 0 && insurancesCount < MIN_INSURANCES)) {
            clearClinicPatientCatalog(clinicId);
            actsCount = 0;
            insurancesCount = 0;
        }

        int actsCreated = 0;
        int insurancesCreated = 0;

        if (actsCount < MIN_MEDICAL_ACTS) {
            List<MedicalAct> defaultActs = buildDefaultActs(clinicId);
            List<MedicalAct> savedActs = medicalActRepository.saveAll(defaultActs);
            seedTariffsForActs(savedActs);
            actsCreated = defaultActs.size();
        }

        if (insurancesCount < MIN_INSURANCES) {
            List<Insurance> defaultInsurances = buildDefaultInsurances(clinicId);
            insuranceRepository.saveAll(defaultInsurances);
            insurancesCreated = defaultInsurances.size();
        }

        int totalActs = (int) medicalActRepository.countByClinicIdAndIsActiveTrue(clinicId);
        int totalInsurances = (int) insuranceRepository.countByClinicId(clinicId);
        boolean skipped = actsCreated == 0 && insurancesCreated == 0;

        return ResponseEntity.ok(SeedResult.builder()
                .actsCreated(actsCreated)
                .insurancesCreated(insurancesCreated)
                .totalActs(totalActs)
                .totalInsurances(totalInsurances)
                .skipped(skipped)
                .forced(force)
                .build());
    }

    private void clearClinicPatientCatalog(UUID clinicId) {
        List<MedicalAct> acts = medicalActRepository.findByClinicId(clinicId);
        for (MedicalAct act : acts) {
            actTariffRepository.deleteByActId(act.getId());
        }
        medicalActRepository.deleteByClinicId(clinicId);
        insuranceRepository.deleteByClinicId(clinicId);
    }

    private List<Insurance> buildDefaultInsurances(UUID clinicId) {
        return Arrays.asList(
                ins(clinicId, "CORIS ASSURANCE", "NATIONAL"),
                ins(clinicId, "MCI", "NATIONAL"),
                ins(clinicId, "SUNU ASSURANCES", "NATIONAL"),
                ins(clinicId, "SONAR", "NATIONAL"),
                ins(clinicId, "ALLIANZ BURKINA", "NATIONAL"),
                ins(clinicId, "YELEN ASSURANCES", "NATIONAL"),
                ins(clinicId, "UAB", "NATIONAL"),
                ins(clinicId, "CNAMU", "NATIONAL"),
                ins(clinicId, "MAADO", "NATIONAL"),
                ins(clinicId, "CIMAS", "NATIONAL"),
                ins(clinicId, "SONABEL", "NATIONAL"),
                ins(clinicId, "SOGEA SATOM", "NATIONAL"),
                ins(clinicId, "CNSS", "NATIONAL")
        );
    }

    private List<MedicalAct> buildDefaultActs(UUID clinicId) {
        return Arrays.asList(
            act(clinicId,"CONSULT_001","Consultation Médecine Générale", ActNature.CONSULTATIONS,"MEDECINE_GENERALE",false,null),
            act(clinicId,"CONSULT_002","Consultation Pédiatrie",          ActNature.CONSULTATIONS,"PEDIATRIE",false,null),
            act(clinicId,"CONSULT_003","Consultation Cardiologie",        ActNature.CONSULTATIONS,"CARDIOLOGIE",false,null),
            act(clinicId,"CONSULT_004","Consultation Gynécologie",        ActNature.CONSULTATIONS,"GYNECOLOGIE",false,null),
            act(clinicId,"CONSULT_005","Consultation Ophtalmologie",      ActNature.CONSULTATIONS,"OPHTALMOLOGIE",false,null),
            act(clinicId,"CONSULT_006","Consultation Dermatologie",       ActNature.CONSULTATIONS,"DERMATOLOGIE",false,null),
            act(clinicId,"CONSULT_007","Consultation Neurologie",         ActNature.CONSULTATIONS,"NEUROLOGIE",false,null),
            act(clinicId,"CONSULT_008","Consultation Rhumatologie",       ActNature.CONSULTATIONS,"RHUMATOLOGIE",false,null),
            act(clinicId,"CONSULT_009","Consultation ORL",                ActNature.CONSULTATIONS,"ORL",false,null),
            act(clinicId,"CONSULT_010","Consultation Gastro-entérologie", ActNature.CONSULTATIONS,"GASTROENTEROLOGIE",false,null),
            act(clinicId,"SOINS_001","Injection",      ActNature.SOINS_INFIRMIERS,null,false,null),
            act(clinicId,"SOINS_002","Pansement",      ActNature.SOINS_INFIRMIERS,null,false,null),
            act(clinicId,"KINE_001","Séance de kinésithérapie", ActNature.SEANCES,"KINESITHERAPIE",false,null),
            act(clinicId,"LABO_001","Glycémie",          ActNature.EXAMENS,"LABORATOIRE",true,"BIOCHIMIE"),
            act(clinicId,"LABO_002","Ionogramme",        ActNature.EXAMENS,"LABORATOIRE",true,"BIOCHIMIE"),
            act(clinicId,"LABO_003","Urée",              ActNature.EXAMENS,"LABORATOIRE",true,"BIOCHIMIE"),
            act(clinicId,"LABO_004","Créatinine",        ActNature.EXAMENS,"LABORATOIRE",true,"BIOCHIMIE"),
            act(clinicId,"LABO_005","NFS",               ActNature.EXAMENS,"LABORATOIRE",true,"HEMATOLOGIE"),
            act(clinicId,"LABO_006","ECBU",              ActNature.EXAMENS,"LABORATOIRE",true,"MICROBIOLOGIE"),
            act(clinicId,"LABO_007","CRP",               ActNature.EXAMENS,"LABORATOIRE",true,"HEMATOLOGIE")
        );
    }

    private MedicalAct act(UUID clinicId, String code, String name, ActNature nature,
                           String specialty, boolean isLab, String labSection) {
        return MedicalAct.builder()
                .clinicId(clinicId)
                .code(code)
                .name(name)
                .nature(nature.toString())
                .specialty(specialty)
                .isLabExam(isLab)
                .labSection(labSection)
                .isActive(true)
                .accessLevel(0)
                .build();
    }

    private Insurance ins(UUID clinicId, String name, String type) {
        return Insurance.builder()
                .clinicId(clinicId)
                .name(name)
                .type(type)
                .build();
    }

    private BigDecimal getBasePriceForAct(String code) {
        switch (code) {
            case "CONSULT_001": return new BigDecimal("10000");
            case "CONSULT_002": return new BigDecimal("15000");
            case "CONSULT_003": return new BigDecimal("25000");
            case "CONSULT_004": return new BigDecimal("20000");
            case "CONSULT_005": return new BigDecimal("15000");
            case "CONSULT_006": return new BigDecimal("15000");
            case "CONSULT_007": return new BigDecimal("25000");
            case "CONSULT_008": return new BigDecimal("20000");
            case "CONSULT_009": return new BigDecimal("15000");
            case "CONSULT_010": return new BigDecimal("20000");
            case "SOINS_001": return new BigDecimal("2000");
            case "SOINS_002": return new BigDecimal("3000");
            case "KINE_001": return new BigDecimal("7000");
            case "LABO_001": return new BigDecimal("2500");
            case "LABO_002": return new BigDecimal("10000");
            case "LABO_003": return new BigDecimal("4000");
            case "LABO_004": return new BigDecimal("4000");
            case "LABO_005": return new BigDecimal("6000");
            case "LABO_006": return new BigDecimal("8000");
            case "LABO_007": return new BigDecimal("7000");
            default: return new BigDecimal("5000");
        }
    }

    private void seedTariffsForActs(List<MedicalAct> acts) {
        for (MedicalAct act : acts) {
            BigDecimal base = getBasePriceForAct(act.getCode());
            for (TariffType type : TariffType.values()) {
                if (type == TariffType.URGENCE) continue;
                BigDecimal amount = base;
                if (type == TariffType.PERSONNEL) {
                    amount = base.multiply(new BigDecimal("0.40")).setScale(0, java.math.RoundingMode.HALF_UP);
                } else if (type == TariffType.RETRAITE) {
                    amount = base.multiply(new BigDecimal("0.60")).setScale(0, java.math.RoundingMode.HALF_UP);
                } else if (type == TariffType.ASSURE_NATIONAL) {
                    amount = base.multiply(new BigDecimal("0.90")).setScale(0, java.math.RoundingMode.HALF_UP);
                } else if (type == TariffType.ASSURE_INTERNATIONAL) {
                    amount = base.multiply(new BigDecimal("1.20")).setScale(0, java.math.RoundingMode.HALF_UP);
                }
                ActTariff tariff = ActTariff.builder()
                        .actId(act.getId())
                        .tariffType(type)
                        .amount(amount)
                        .build();
                actTariffRepository.save(tariff);
            }
        }
    }
}
