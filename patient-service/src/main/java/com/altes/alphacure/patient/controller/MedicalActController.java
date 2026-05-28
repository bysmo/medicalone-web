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

    private static final int MIN_MEDICAL_ACTS = 100;
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
            act(clinicId,"LABO_007","CRP",               ActNature.EXAMENS,"LABORATOIRE",true,"HEMATOLOGIE"),

            // Échographies
            act(clinicId,"ECHO_001","Échographie Abdominale", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_002","Échographie Pelvienne", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_003","Échographie Abdomino-pelvienne", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_004","Échographie de datation", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_005","Échographie de suivi", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_006","Échographie du col de l'utérus", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_007","Doppler cervical / TSA", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_008","Doppler des membres", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_009","Échographie rénale / vésicale", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_010","Échographie Cervicale / Thyroïdienne", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_011","Échographie Musculo-tendineuse", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),
            act(clinicId,"ECHO_012","Échographie des Parties molles et glandes salivaires", ActNature.EXAMENS,"ECHOGRAPHIE",false,null),

            // Radiographies
            // Cou et Thorax
            act(clinicId,"RADIO_001","Laryngographie-pharyngographie", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_002","Radiographie du thorax y compris médiastin et cœur (Face)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_003","Radiographie du thorax y compris médiastin et cœur (Face + Profil)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_004","Examen radiologique des poumons avec opacification bronchique", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_005","Radiographie du thorax pour suivi post opératoire d'une intervention thoracique chez un patient hospitalisé", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Tube Digestif
            act(clinicId,"RADIO_006","Abdomen sans préparation (face)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_007","Abdomen sans préparation (face) + autres incidences quel que soit le nombre", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_008","Abdomen aigu (syndrome occlusif ou péritonéal, ASP debout, couché + RX thorax)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_009","Transit Oesophagien", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_010","Transit Oeso-gastro-duodénal (avec scopie télévisée pour 2 régions)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_011","Examen radiologique du colon", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_012","Transit du grêle", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_013","Defecographie", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_014","Fistulographie (Face + Profil) sans tenir compte de l'injection", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_015","Cholangiographie par le drain", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Membre supérieur
            act(clinicId,"RADIO_016","Membre Supérieur Entier - 2 Incidences", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_017","Epaule Face", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_018","Epaule Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_019","Clavicule", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_020","Omoplate Face", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_021","Omoplate Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_022","Humérus Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_023","Coude Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_024","Avant-bras Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_025","Poignet Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_026","Main Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_027","Doigt Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_028","Scaphoïde (2 incidences)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_029","Main Face/Profil + Scaphoïde", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Membre inférieur
            act(clinicId,"RADIO_030","Bassin, hanche, articulations sacro-iliaques", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_031","Hanche Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_032","Hanche + 2 x 3/4", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_033","Fémur Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_034","Genou Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_035","Jambe Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_036","Pied Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_037","Talon Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_038","Cheville Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_039","Orteil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_040","Axiales 2 genoux 2 incidences", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_041","Gonométrie (Règle de Bell Thomson) Adultes", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_042","Gonométrie (Règle de Bell Thomson) Enfants", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_043","Radiomensuration comparative des membres", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Tête
            act(clinicId,"RADIO_044","Maxillaire défilé, os propres du nez", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_045","Dent par technique intrabuccale, film occlusal ou rétro-alvéolaire", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_046","Radiographie panoramique de la totalité du système maxillaire et du système dentaire", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_047","Téléradiographie du crâne à trois mètres (diagnostic orthodontique), par séance", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_048","Articulation Temporo-Maxillaire (1 côté)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_049","Articulation Temporo-Maxillaire (2 côtés)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_050","Cavum", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_051","Larynx Face ou Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_052","Larynx Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Thorax
            act(clinicId,"RADIO_053","Gril costal, ou sternum, ou hémithorax, ou articulation sterno-claviculaire (Une incidence)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_054","Gril costal, ou sternum, ou hémithorax, ou articulation sterno-claviculaire (Par incidence supplémentaire)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Rachis
            act(clinicId,"RADIO_055","Rachis dans son entier en téléradiographie à 2,50 mètres par examen", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_056","Rachis Cervical Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_057","Rachis Cervical Face + Profil + 2 x 3/4", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_058","Rachis Cervical Face + Profil + dynamique", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_059","Rachis Dorsal Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_060","Rachis lombaire Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_061","Rachis entier Enfant", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_062","Sacrum Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_063","Charnière cervico-occipitale Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_064","Rachis lombaire Face + Profil + L5-S1 Face + Profil", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_065","Rachis lombaire Face + Profil + 3/4 droit+gauche", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_066","Rachis lombaire Face + Profil + Etude dynamique", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Gynécologie
            act(clinicId,"RADIO_067","Mammographie unilatérale", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_068","Hystérosalpingographie sans l'injection", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_069","Radiopelvimétrie", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_070","Génitographie externe, colpocystographie sans l'injection", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_071","Contenu utérin", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_072","Galactographie sans l'injection", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Système nerveux
            act(clinicId,"RADIO_073","Myélographie", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_074","Discographie d'un ou plusieurs disques", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_075","Sacco-radiculographie", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            // Angiographie numérisée
            act(clinicId,"RADIO_076","Examen cranien (4 axes)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_077","Examen cranien (sélectif)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_078","Examen viscéral (global)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_079","Examen viscéral (sélectif)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_080","Examen périphérique (global)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_081","Examen périphérique (sélectif)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_082","Phlébographie (1 membre)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_083","Phlébographie (2 membres)", ActNature.EXAMENS,"RADIOGRAPHIE",false,null),
            act(clinicId,"RADIO_084","Cavographie", ActNature.EXAMENS,"RADIOGRAPHIE",false,null)
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
        if (code.startsWith("ECHO_")) {
            if (code.contains("007") || code.contains("008")) { // Dopplers
                return new BigDecimal("25000");
            }
            if (code.contains("003")) { // Abdomino-pelvienne
                return new BigDecimal("20000");
            }
            if (code.contains("004")) { // Datation
                return new BigDecimal("10000");
            }
            return new BigDecimal("15000");
        }
        if (code.startsWith("RADIO_")) {
            // Complex procedures
            if (code.equals("RADIO_073") || code.equals("RADIO_074") || code.equals("RADIO_075") || 
                code.equals("RADIO_078") || code.equals("RADIO_079") || code.equals("RADIO_081") || code.equals("RADIO_083")) {
                return new BigDecimal("35000");
            }
            if (code.equals("RADIO_010") || code.equals("RADIO_013") || code.equals("RADIO_041") || 
                code.equals("RADIO_047") || code.equals("RADIO_055") || code.equals("RADIO_068") || 
                code.equals("RADIO_070") || code.equals("RADIO_076") || code.equals("RADIO_077") || 
                code.equals("RADIO_080") || code.equals("RADIO_084")) {
                return new BigDecimal("25000");
            }
            // Simple / Face only
            if (code.equals("RADIO_002") || code.equals("RADIO_006") || code.equals("RADIO_017") || 
                code.equals("RADIO_019") || code.equals("RADIO_020") || code.equals("RADIO_027") || 
                code.equals("RADIO_039") || code.equals("RADIO_045") || code.equals("RADIO_054")) {
                return new BigDecimal("10000");
            }
            return new BigDecimal("15000");
        }
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
