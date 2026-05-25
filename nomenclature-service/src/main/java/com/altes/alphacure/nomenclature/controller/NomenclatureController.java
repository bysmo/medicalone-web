package com.altes.alphacure.nomenclature.controller;

import com.altes.alphacure.nomenclature.dto.SeedResult;
import com.altes.alphacure.nomenclature.entity.Nomenclature;
import com.altes.alphacure.nomenclature.repository.NomenclatureRepository;
import com.altes.alphacure.nomenclature.security.ClinicContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Gestion des nomenclatures — cloisonné par clinique via JWT /
 * ClinicContextHolder.
 *
 * Deux niveaux de données :
 * - Global (clinicId=null) : référentiels partagés, lecture seule pour les
 * cliniques
 * - Clinique (clinicId=<id>) : données propres à chaque clinique, modifiables
 *
 * Le cloisonnement est assuré par ClinicContextHolder (JWT → clinic_id).
 * Plus de X-Clinic-Id passé depuis le frontend — c'est le Gateway qui
 * l'injecte.
 */
@RestController
@RequestMapping("/api/v1/nomenclatures")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Nomenclatures", description = "Gestion des référentiels et nomenclatures")
public class NomenclatureController {

    private static final int MIN_NOMENCLATURE_COUNT = 60;

    private final NomenclatureRepository repository;
    private final ClinicContextHolder clinicContextHolder;

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','LABORANTIN','PHARMACIEN','MANAGER_CLINIQUE','COMPTABLE','GESTIONNAIRE_ASSURANCES','RH')")
    @Operation(summary = "Rechercher des nomenclatures par type (et optionnellement nature)")
    public ResponseEntity<List<Nomenclature>> search(
            @RequestParam String type,
            @RequestParam(required = false) String nature) {

        UUID clinicId = clinicContextHolder.getClinicId();

        if (nature != null && !nature.isBlank()) {
            return ResponseEntity.ok(repository.findByTypeAndNatureAndClinicId(type, nature, clinicId));
        }
        return ResponseEntity.ok(repository.findByTypeAndClinicId(type, clinicId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','LABORANTIN','PHARMACIEN','MANAGER_CLINIQUE','COMPTABLE','GESTIONNAIRE_ASSURANCES','RH')")
    @Operation(summary = "Lister toutes les nomenclatures de la clinique")
    public ResponseEntity<List<Nomenclature>> getAll(
            @RequestParam(required = false) String type) {
        UUID clinicId = clinicContextHolder.getClinicId();
        if (type != null && !type.isBlank()) {
            return ResponseEntity.ok(repository.findByTypeAndClinicId(type, clinicId));
        }
        return ResponseEntity.ok(repository.findByClinicId(clinicId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Créer une nomenclature pour la clinique")
    public ResponseEntity<Nomenclature> create(@RequestBody Nomenclature nomenclature) {
        UUID clinicId = clinicContextHolder.getClinicId();
        nomenclature.setClinicId(clinicId); // toujours forcer le clinicId depuis le JWT
        return ResponseEntity.ok(repository.save(nomenclature));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Modifier une nomenclature de la clinique")
    public ResponseEntity<Nomenclature> update(
            @PathVariable UUID id,
            @RequestBody Nomenclature nomenclature) {
        UUID clinicId = clinicContextHolder.getClinicId();

        Nomenclature existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nomenclature introuvable"));

        // Cloisonnement : une clinique ne peut modifier que ses propres nomenclatures
        if (existing.getClinicId() == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Les nomenclatures globales ne peuvent pas être modifiées.");
        }
        if (!clinicId.equals(existing.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Accès non autorisé à cette nomenclature.");
        }

        existing.setCode(nomenclature.getCode());
        existing.setNature(nomenclature.getNature());
        existing.setType(nomenclature.getType());
        existing.setString1(nomenclature.getString1());
        existing.setString2(nomenclature.getString2());
        existing.setString3(nomenclature.getString3());
        existing.setString4(nomenclature.getString4());
        existing.setString5(nomenclature.getString5());
        existing.setInt1(nomenclature.getInt1());
        existing.setInt2(nomenclature.getInt2());
        existing.setInt3(nomenclature.getInt3());
        existing.setInt4(nomenclature.getInt4());
        existing.setInt5(nomenclature.getInt5());
        existing.setRate1(nomenclature.getRate1());
        existing.setRate2(nomenclature.getRate2());
        existing.setRate3(nomenclature.getRate3());
        existing.setRate4(nomenclature.getRate4());
        existing.setRate5(nomenclature.getRate5());
        existing.setDate1(nomenclature.getDate1());
        existing.setDate2(nomenclature.getDate2());
        existing.setDate3(nomenclature.getDate3());
        existing.setDate4(nomenclature.getDate4());
        existing.setDate5(nomenclature.getDate5());

        return ResponseEntity.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Supprimer une nomenclature de la clinique")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Nomenclature existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nomenclature introuvable"));

        if (existing.getClinicId() == null) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Les nomenclatures globales ne peuvent pas être supprimées.");
        }
        if (!clinicId.equals(existing.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Accès non autorisé à cette nomenclature.");
        }
        repository.delete(existing);
        return ResponseEntity.noContent().build();
    }

    /**
     * Initialisation des nomenclatures d'une clinique.
     * Appelé par clinic-service lors de la création d'une clinique.
     */
    @PostMapping("/seed")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Initialiser les nomenclatures de la clinique (SUPER_ADMIN / clinic-service)")
    public ResponseEntity<SeedResult> seedClinicNomenclature(
            @RequestParam UUID clinicId,
            @RequestParam(defaultValue = "false") boolean force) {

        long existing = repository.countByClinicId(clinicId);

        if (force || (existing > 0 && existing < MIN_NOMENCLATURE_COUNT)) {
            log.info("Réinitialisation nomenclatures clinique {} (force={}, existant={})", clinicId, force, existing);
            repository.deleteByClinicId(clinicId);
            existing = 0;
        }

        if (existing >= MIN_NOMENCLATURE_COUNT && !force) {
            return ResponseEntity.ok(SeedResult.builder()
                    .created(0)
                    .total((int) existing)
                    .skipped(true)
                    .forced(false)
                    .build());
        }

        log.info("Initialisation des nomenclatures pour la clinique : {}", clinicId);
        List<Nomenclature> defaults = buildDefaultNomenclatures(clinicId);
        repository.saveAll(defaults);
        int total = (int) repository.countByClinicId(clinicId);
        log.info("[Nomenclature] {} nomenclatures créées pour la clinique {} (total={})", defaults.size(), clinicId, total);

        return ResponseEntity.ok(SeedResult.builder()
                .created(defaults.size())
                .total(total)
                .skipped(false)
                .forced(force)
                .build());
    }

    private List<Nomenclature> buildDefaultNomenclatures(UUID clinicId) {
        return Arrays.asList(
                // Catégories de Nomenclature (Système)
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "SPECIALITE", "Spécialités médicales", "MEDICAL", 1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "TARIF", "Types de tarification", "FINANCES", 1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "NATURE_ACTE", "Natures d'actes", "MEDICAL", 1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "TYPE_PERSONNEL", "Types de personnels", "RH", 1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "SECTION_LABO", "Sections de laboratoire",
                        "LABORATOIRE", 1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "CAISSES_TRESORERIE", "Caisses de trésorerie",
                        "FINANCES", 1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "COMPTES_BANCAIRES", "Comptes bancaires", "FINANCES",
                        1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "MOYENS_REGLEMENT", "Moyens de règlement", "FINANCES",
                        1),
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "CONFIG_DELAIS", "Configuration des délais de contrôle", "SYSTEM", 1),

                // Spécialités Médicales
                nom(clinicId, "SPECIALITE", "MEDICAL", "MEDECINE GENERALE", "Médecine générale", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "PEDIATRIE", "Pédiatrie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "CARDIOLOGIE", "Cardiologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "GYNECOLOGIE", "Gynécologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "DERMATOLOGIE", "Dermatologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "OPHTALMOLOGIE", "Ophtalmologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "ORL", "Oto-rhino-laryngologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "NEUROLOGIE", "Neurologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "PNEUMOLOGIE", "Pneumologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "GASTROENTEROLOGIE", "Gastro-entérologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "RHUMATOLOGIE", "Rhumatologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "UROLOGIE", "Urologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "NEPHROLOGIE", "Nephrologie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "RADIOGRAPHIE", "Radiographie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "ECHOGRAPHIE", "Echographie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "LABORATOIRE", "Laboratoire", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "KINESITHERAPIE", "Kinésithérapie", null, 1),
                nom(clinicId, "SPECIALITE", "MEDICAL", "TRAUMATOLOGIE", "Traumatologie", null, 1),

                //Constantes medicales
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "POIDS", "Poids", "kg", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "TAILLE", "Taille", "cm", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "TEMPERATURE", "Température", "°C", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "TA_SYSTOLIQUE", "Tension Artérielle (Systolique)", "mmHg", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "TA_DIASTOLIQUE", "Tension Artérielle (Diastolique)", "mmHg", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "FREQUENCE_CARDIAQUE", "Fréquence Cardiaque", "bpm", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "SATURATION_O2", "Saturation en Oxygène (SpO₂)", "%", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "GLYCEMIE", "Glycémie", "g/L", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "IMC", "Indice de Masse Corporelle (IMC)", "kg/m²", 1),
                nom(clinicId, "CONSTANTES_MEDICALES", "MEDICAL", "FREQUENCE_RESPIRATOIRE", "Fréquence Respiratoire", "cycles/min", 1),

                // Types de Tarification
                nom(clinicId, "TARIF", "FINANCES", "STANDARD", "Standard", null, 1),
                nom(clinicId, "TARIF", "FINANCES", "ASSURE_NAT", "Assuré National", null, 1),
                nom(clinicId, "TARIF", "FINANCES", "ASSURE_INT", "Assuré International", null, 1),
                nom(clinicId, "TARIF", "FINANCES", "RETRAITE", "Retraite", null, 1),
                nom(clinicId, "TARIF", "FINANCES", "PERSONNEL", "Personnel", null, 1),
                nom(clinicId, "TARIF", "FINANCES", "JUMEAUX", "Jumeaux", null, 1),

                // Natures d'Actes
                nom(clinicId, "NATURE_ACTE", "MEDICAL", "CONSULTATIONS", "Consultation", null, 1),
                nom(clinicId, "NATURE_ACTE", "MEDICAL", "EXAMENS", "Examen", null, 1),
                nom(clinicId, "NATURE_ACTE", "MEDICAL", "SEANCES", "Séance", null, 1),
                nom(clinicId, "NATURE_ACTE", "MEDICAL", "INTERVENTIONS", "Interventions", null, 1),
                nom(clinicId, "NATURE_ACTE", "MEDICAL", "SOINS_INFIRMIERS", "Soins Infirmiers", null, 1),

                // Caisses de trésorerie
                nom(clinicId, "CAISSES_TRESORERIE", "FINANCES", "CAISSE_PRINCIPALE", "Caisse Principale", null, 1),
                nom(clinicId, "CAISSES_TRESORERIE", "FINANCES", "CAISSE_SECONDAIRE_1", "Caisse Secondaire 1", null, 1),
                nom(clinicId, "CAISSES_TRESORERIE", "FINANCES", "CAISSE_SECONDAIRE_2", "Caisse Secondaire 2", null, 1),
                nom(clinicId, "CAISSES_TRESORERIE", "FINANCES", "CAISSE_SECONDAIRE_3", "Caisse Secondaire 3", null, 1),
                nom(clinicId, "CAISSES_TRESORERIE", "FINANCES", "CAISSE_SECONDAIRE_4", "Caisse Secondaire 4", null, 1),

                // Comptes bancaires
                nom(clinicId, "COMPTES_BANCAIRES", "FINANCES", "COMPTE_BANCAIRE_BOA", "Compte Bancaire BOA", null, 1),
                nom(clinicId, "COMPTES_BANCAIRES", "FINANCES", "COMPTE_BANCAIRE_BSIC", "Compte Bancaire BSIC", null, 1),
                nom(clinicId, "COMPTES_BANCAIRES", "FINANCES", "COMPTE_BANCAIRE_CORIS", "Compte Bancaire CORIS", null,
                        1),
                nom(clinicId, "COMPTES_BANCAIRES", "FINANCES", "COMPTE_BANCAIRE_VISTA", "Compte Bancaire VISTA", null,
                        1),

                // Moyens de règlement
                nom(clinicId, "MOYENS_REGLEMENT", "FINANCES", "ESPECES", "Espèces", null, 1),
                nom(clinicId, "MOYENS_REGLEMENT", "FINANCES", "CARTE_BANCAIRE", "Carte Bancaire", null, 1),
                nom(clinicId, "MOYENS_REGLEMENT", "FINANCES", "CHEQUE", "Chèque", null, 1),
                nom(clinicId, "MOYENS_REGLEMENT", "FINANCES", "VIREMENT", "Virement", null, 1),

                // Modes de prélèvement
                nom(clinicId, "MODES_PRELEVEMENT", "FINANCES", "PRELEVEMENT_BANCAIRE", "Prélèvement Bancaire", null, 1),
                nom(clinicId, "MODES_PRELEVEMENT", "FINANCES", "PRELEVEMENT_CARTE", "Prélèvement Carte Bancaire", null,
                        1),
                nom(clinicId, "MODES_PRELEVEMENT", "FINANCES", "PRELEVEMENT_CHEQUE", "Prélèvement Chèque", null, 1),
                nom(clinicId, "MODES_PRELEVEMENT", "FINANCES", "PRELEVEMENT_VIREMENT", "Prélèvement Virement", null, 1),

                // Types de personnels
                nom(clinicId, "TYPE_PERSONNEL", "RH", "MEDECINS", "Médecin", null, 1),
                nom(clinicId, "TYPE_PERSONNEL", "RH", "INFIRMIERS", "Infirmier / Sage-femme", null, 1),
                nom(clinicId, "TYPE_PERSONNEL", "RH", "LABORANTINS", "Technicien de Laboratoire", null, 1),
                nom(clinicId, "TYPE_PERSONNEL", "RH", "ADMINISTRATIF", "Personnel Administratif", null, 1),
                nom(clinicId, "TYPE_PERSONNEL", "RH", "CAISSIERS", "Caissiers", null, 1),
                nom(clinicId, "TYPE_PERSONNEL", "RH", "COMPTABLES", "Comptables", null, 1),
                nom(clinicId, "TYPE_PERSONNEL", "RH", "MANAGER_CLINIQUE", "Manager Clinique", null, 1),

                // Sections de laboratoire
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "BIOCHIMIE", "Biochimie", null, 1),
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "HEMATOLOGIE", "Hématologie", null, 1),
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "PARASITOLOGIE", "Parasitologie", null, 1),
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "IMMUNOLOGIE", "Immunologie", null, 1),
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "SEROLOGIE", "Sérologie", null, 1),
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "MICROBIOLOGIE", "Microbiologie", null, 1),
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "ANATOMOPATHOLOGIE", "Anatomopathologie", null, 1),
                nom(clinicId, "SECTION_LABO", "LABORATOIRE", "CYTOLOGIE", "Cytologie", null, 1),

                // Configuration des Délais
                nom(clinicId, "CONFIG_DELAIS", "MEDICAL", "DELAI_CONTROLE", "Délai de contrôle (jours)", "jours", 15),

                // Catégories de dépenses
                nom(clinicId, "CATEGORIE_NOMENCLATURE", "SYSTEM", "CATEGORIES_DEPENSES", "Catégories de dépenses", "FINANCES", 1),
                nom(clinicId, "CATEGORIES_DEPENSES", "FINANCES", "FOURNITURES", "Fournitures de bureau", null, 1),
                nom(clinicId, "CATEGORIES_DEPENSES", "FINANCES", "LOYER_CHARGES", "Loyer et charges", null, 1),
                nom(clinicId, "CATEGORIES_DEPENSES", "FINANCES", "MAINTENANCE", "Entretien et maintenance", null, 1),
                nom(clinicId, "CATEGORIES_DEPENSES", "FINANCES", "TRANSPORT", "Frais de transport", null, 1),
                nom(clinicId, "CATEGORIES_DEPENSES", "FINANCES", "DIVERS", "Autres dépenses diverses", null, 1));
    }

    private Nomenclature nom(UUID clinicId, String type, String nature, String code, String string1, String string2,
            Integer int1) {

        return Nomenclature.builder()
                .clinicId(clinicId)
                .type(type)
                .nature(nature)
                .code(code)
                .string1(string1)
                .string2(string2)
                .int1(int1)
                .build();

    }
}
