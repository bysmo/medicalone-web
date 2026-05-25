package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.client.ClinicClient;
import com.altes.alphacure.patient.client.NumberingDocumentType;
import com.altes.alphacure.patient.entity.Practitioner;
import com.altes.alphacure.patient.entity.PractitionerAct;
import com.altes.alphacure.patient.repository.PractitionerActRepository;
import com.altes.alphacure.patient.repository.PractitionerRepository;
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
 * Gestion des praticiens — cloisonné par clinique.
 * Rôles Keycloak : ADMIN, MEDECIN, INFIRMIER, RECEPTIONNISTE, MANAGER_CLINIQUE...
 */
@RestController
@RequestMapping("/api/v1/practitioners")
@RequiredArgsConstructor
@Tag(name = "Praticiens", description = "Gestion du staff médical (praticiens)")
public class PractitionerController {

    private final PractitionerRepository practitionerRepository;
    private final PractitionerActRepository practitionerActRepository;
    private final ClinicContextHolder clinicContextHolder;
    private final ClinicClient clinicClient;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE','RH')")
    @Operation(summary = "Lister tous les praticiens actifs de la clinique")
    public ResponseEntity<List<Practitioner>> getAll() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(practitionerRepository.findByClinicIdAndIsActiveTrue(clinicId));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN','RECEPTIONNISTE','CAISSIER')")
    @Operation(summary = "Récupérer le profil praticien du compte connecté (par email JWT)")
    public ResponseEntity<?> getMe(jakarta.servlet.http.HttpServletRequest request) {
        UUID clinicId = clinicContextHolder.getClinicId();
        // Extract email from JWT claim (set by Spring Security via Keycloak)
        String email = (String) request.getAttribute("keycloak_email");
        if (email == null) {
            // Fallback: try preferred_username from security context
            Object principal = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication().getPrincipal();
            if (principal instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
                email = jwt.getClaimAsString("email");
            }
        }
        if (email == null) {
            return ResponseEntity.ok(java.util.Map.of());
        }
        final String emailFinal = email;
        return ResponseEntity.ok(practitionerRepository.findByClinicIdAndIsActiveTrue(clinicId)
                .stream().filter(p -> emailFinal.equalsIgnoreCase(p.getEmail())).findFirst()
                .orElse(null));
    }


    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH')")
    @Operation(summary = "Créer un praticien")
    public ResponseEntity<Practitioner> create(@RequestBody Practitioner practitioner) {
        practitioner.setClinicId(clinicContextHolder.getClinicId());
        if (practitioner.getMatricule() == null || practitioner.getMatricule().isBlank()) {
            try {
                practitioner.setMatricule(clinicClient.getNextNumber(NumberingDocumentType.STAFF_MATRICULE, null));
            } catch (Exception e) {
                // ignore
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(practitionerRepository.save(practitioner));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE','RH')")
    @Operation(summary = "Modifier un praticien")
    public ResponseEntity<Practitioner> update(@PathVariable UUID id, @RequestBody Practitioner practitioner) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Practitioner existing = practitionerRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Praticien non trouvé ou accès refusé: " + id));
        existing.setFullName(practitioner.getFullName());
        existing.setSpecialty(practitioner.getSpecialty());
        existing.setPhone(practitioner.getPhone());
        existing.setEmail(practitioner.getEmail());
        existing.setIsActive(practitioner.getIsActive());
        return ResponseEntity.ok(practitionerRepository.save(existing));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Désactiver un praticien")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        Practitioner existing = practitionerRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Praticien non trouvé ou accès refusé: " + id));
        existing.setIsActive(false);
        practitionerRepository.save(existing);
        return ResponseEntity.noContent().build();
    }

    // ─── Actes réalisables par praticien ─────────────────────────────────────

    @GetMapping("/{id}/acts")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE')")
    @Operation(summary = "Lister les actes réalisables par un praticien")
    public ResponseEntity<List<PractitionerAct>> getActs(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        practitionerRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Praticien non trouvé ou accès refusé"));
        return ResponseEntity.ok(practitionerActRepository.findByPractitionerId(id));
    }

    @PostMapping("/{id}/acts")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Operation(summary = "Ajouter un acte réalisable par le praticien")
    public ResponseEntity<PractitionerAct> addAct(@PathVariable UUID id, @RequestBody PractitionerAct link) {
        UUID clinicId = clinicContextHolder.getClinicId();
        practitionerRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Praticien non trouvé ou accès refusé"));
        link.setPractitionerId(id);
        return ResponseEntity.status(HttpStatus.CREATED).body(practitionerActRepository.save(link));
    }

    @DeleteMapping("/{id}/acts/{actId}")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER_CLINIQUE')")
    @Transactional
    @Operation(summary = "Supprimer un acte réalisable par le praticien")
    public ResponseEntity<Void> deleteAct(@PathVariable UUID id, @PathVariable UUID actId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        practitionerRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new RuntimeException("Praticien non trouvé ou accès refusé"));
        practitionerActRepository.findByPractitionerIdAndActId(id, actId)
                .ifPresent(practitionerActRepository::delete);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/seed")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Transactional
    @Operation(summary = "Initialiser les membres du personnel fictifs par défaut")
    public ResponseEntity<Void> seedClinicStaff(
            @RequestParam UUID clinicId,
            @RequestParam(defaultValue = "false") boolean force) {

        List<Practitioner> existing = practitionerRepository.findByClinicIdAndIsActiveTrue(clinicId);
        if (force || existing.isEmpty()) {
            for (Practitioner p : existing) {
                practitionerActRepository.deleteByPractitionerId(p.getId());
                practitionerRepository.delete(p);
            }

            List<Practitioner> fictionalStaff = Arrays.asList(
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("ZONGO Pierre")
                        .specialty("PRATICIEN|Médecine Générale|permanent|500000|ZONGO|Pierre|1980-05-12|M|Ouagadougou|B12345678|Doctorat")
                        .phone("+226 70 11 22 33")
                        .email("p.zongo@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("KABORE Aminata")
                        .specialty("PRATICIEN|Pédiatrie|permanent|650000|KABORE|Aminata|1985-06-15|F|Bobo-Dioulasso|B87654321|Doctorat")
                        .phone("+226 76 89 54 32")
                        .email("a.kabore@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("OUEDRAOGO Fatoumata")
                        .specialty("PRATICIEN|Gynécologie|permanent|700000|OUEDRAOGO|Fatoumata|1983-09-24|F|Koudougou|B99887766|Doctorat")
                        .phone("+226 71 00 22 44")
                        .email("f.ouedraogo@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("HIEN Rosine")
                        .specialty("RECEPTIONNISTE|Standard|permanent|200000|HIEN|Rosine|1992-09-24|F|Ouagadougou|B99887766|Licence")
                        .phone("+226 71 00 22 45")
                        .email("h.rosine@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("SAWADOGO Moussa")
                        .specialty("CAISSIER|Caisse Principale|permanent|300000|SAWADOGO|Moussa|1990-03-12|M|Ouahigouya|B11223344|Licence")
                        .phone("+226 77 44 55 66")
                        .email("m.sawadogo@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("CONGO Adama")
                        .specialty("CAISSIER|Caisse Secondaire|permanent|250000|CONGO|Adama|1992-08-04|M|Banfora|B44556677|Bac")
                        .phone("+226 75 22 11 00")
                        .email("a.congo@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("TRAORE Cheick")
                        .specialty("LABORANTIN|Biochimie|permanent|400000|TRAORE|Cheick|1988-12-21|M|Bobo-Dioulasso|B22334455|Master")
                        .phone("+226 70 88 99 77")
                        .email("c.traore@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("ILBOUDO Beatrice")
                        .specialty("LABORANTIN|Hématologie|permanent|380000|ILBOUDO|Beatrice|1994-02-14|F|Ouagadougou|B33445566|Licence")
                        .phone("+226 71 23 45 67")
                        .email("b.ilboudo@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("BADO Jean")
                        .specialty("COMPTABLE|BOA - BANK OF AFRICA,ECOBANK|permanent|450000|BADO|Jean|1987-11-30|M|Koudougou|B55667788|Master")
                        .phone("+226 78 90 12 34")
                        .email("j.bado@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("SOME Emmanuel")
                        .specialty("RH|Standard|permanent|350000|SOME|Emmanuel|1982-12-30|M|Ouagadougou|B55667782|Master")
                        .phone("+226 78 90 12 35")
                        .email("e.some@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build(),
                Practitioner.builder()
                        .clinicId(clinicId)
                        .fullName("BOLLY Aboubacar")
                        .specialty("MANAGER_CLINIQUE|Standard|permanent|1500000|BOLLY|Aboubacar|1980-07-15|M|Ouagadougou|B55667799|Doctorat")
                        .phone("+226 78 90 12 35")
                        .email("a.bolly@clinic.bf")
                        .isActive(true)
                        .accessLevel(0)
                        .build()
            );
            for (Practitioner p : fictionalStaff) {
                try {
                    p.setMatricule(clinicClient.getNextNumber(NumberingDocumentType.STAFF_MATRICULE, clinicId));
                } catch (Exception e) {
                    // ignore
                }
            }
            practitionerRepository.saveAll(fictionalStaff);
        }
        return ResponseEntity.ok().build();
    }
}
