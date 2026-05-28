package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.client.BillingClient;
import com.altes.alphacure.patient.entity.*;
import com.altes.alphacure.patient.repository.*;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/staff-remunerations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Rémunération du Personnel", description = "Gestion du calcul et du paiement des salaires du staff")
public class StaffRemunerationController {

    private final StaffRemunerationItemRepository itemRepository;
    private final PractitionerRepository practitionerRepository;
    private final InvoiceLineRepository invoiceLineRepository;
    private final PatientRepository patientRepository;
    private final BillingClient billingClient;
    private final ClinicContextHolder clinicContextHolder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/staff")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPTABLE', 'MANAGER_CLINIQUE', 'RH')")
    @Operation(summary = "Lister le personnel et calculer sa rémunération pour un mois")
    public ResponseEntity<List<Map<String, Object>>> getStaffRemunerationList(
            @RequestParam String month,
            @RequestParam(required = false, defaultValue = "ALL") String roleFilter,
            @RequestParam(required = false, defaultValue = "ALL") String contractFilter) {

        UUID clinicId = clinicContextHolder.getClinicId();
        LocalDate start = LocalDate.parse(month + "-01");
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = start.plusMonths(1).atStartOfDay();

        List<Practitioner> staffList = practitionerRepository.findByClinicIdAndIsActiveTrue(clinicId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (Practitioner staff : staffList) {
            String spec = staff.getSpecialty();
            if (spec == null || spec.isBlank()) continue;

            String[] parts = spec.split("\\|");
            String type = parts[0];
            String contractType = parts.length > 2 ? parts[2] : "permanent";
            String valStr = parts.length > 3 ? parts[3] : "0";

            // Apply filter
            if (!"ALL".equalsIgnoreCase(roleFilter)) {
                if ("AUTRES".equalsIgnoreCase(roleFilter)) {
                    if (List.of("MEDECIN", "PRATICIEN", "INFIRMIER", "LABORANTIN", "CAISSIER", "RECEPTIONNISTE").contains(type.toUpperCase())) {
                        continue;
                    }
                } else if ("MEDECIN".equalsIgnoreCase(roleFilter)) {
                    if (!"MEDECIN".equalsIgnoreCase(type) && !"PRATICIEN".equalsIgnoreCase(type)) {
                        continue;
                    }
                } else if (!type.equalsIgnoreCase(roleFilter)) {
                    continue;
                }
            }
            if (!"ALL".equalsIgnoreCase(contractFilter) && !contractType.equalsIgnoreCase(contractFilter)) {
                continue;
            }

            String paymentMethod = parts.length > 11 ? parts[11] : "ESPECES";
            String paymentDetails = parts.length > 12 ? parts[12] : "";

            // Check if already paid
            Optional<StaffRemunerationItem> savedItemOpt = itemRepository.findByClinicIdAndStaffIdAndMonth(clinicId, staff.getId(), month);

            Map<String, Object> map = new HashMap<>();
            map.put("staffId", staff.getId());
            map.put("staffName", staff.getFullName());
            map.put("staffType", type);
            map.put("contractType", contractType);
            map.put("paymentMethod", paymentMethod);
            map.put("paymentDetails", paymentDetails);

            if (savedItemOpt.isPresent()) {
                StaffRemunerationItem saved = savedItemOpt.get();
                map.put("id", saved.getId());
                map.put("calculatedAmount", saved.getCalculatedAmount());
                map.put("adjustedAmount", saved.getAdjustedAmount());
                map.put("notes", saved.getNotes());
                map.put("statsJson", saved.getStatsJson());
                map.put("paid", true);
            } else {
                // Calculate theoretical amount
                BigDecimal calculatedAmount = BigDecimal.ZERO;
                Map<String, Object> statsMap = new HashMap<>();

                if ("permanent".equalsIgnoreCase(contractType)) {
                    try {
                        calculatedAmount = new BigDecimal(valStr);
                    } catch (Exception e) {
                        calculatedAmount = BigDecimal.ZERO;
                    }
                } else if ("vacataire".equalsIgnoreCase(contractType)) {
                    if (List.of("MEDECIN", "PRATICIEN", "LABORANTIN", "INFIRMIER").contains(type.toUpperCase())) {
                        List<InvoiceLine> acts = invoiceLineRepository.findByPractitionerAndMonth(clinicId, staff.getId(), startDateTime, endDateTime);
                        BigDecimal actsSum = BigDecimal.ZERO;
                        for (InvoiceLine act : acts) {
                            BigDecimal price = act.getTotalPrice() != null ? act.getTotalPrice() : act.getUnitPrice().multiply(BigDecimal.valueOf(act.getQuantity()));
                            actsSum = actsSum.add(price);
                        }
                        BigDecimal commPct;
                        try {
                            commPct = new BigDecimal(valStr).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                        } catch (Exception e) {
                            commPct = BigDecimal.ZERO;
                        }
                        calculatedAmount = actsSum.multiply(commPct).setScale(0, RoundingMode.HALF_UP);
                        statsMap.put("actsCount", acts.size());
                        statsMap.put("actsTotal", actsSum);
                    }
                }

                // Compute stats for info
                if ("CAISSIER".equalsIgnoreCase(type)) {
                    String cashierUsername = staff.getEmail() != null && staff.getEmail().contains("@")
                            ? staff.getEmail().split("@")[0]
                            : staff.getFullName().toLowerCase().replace(" ", ".");
                    try {
                        Map<String, Object> stats = billingClient.getCashierStats(cashierUsername, month);
                        statsMap.putAll(stats);
                    } catch (Exception e) {
                        log.error("Failed to fetch stats for cashier {}", cashierUsername, e);
                        statsMap.put("sessionCount", 0);
                        statsMap.put("totalEncaisse", 0);
                        statsMap.put("totalDecaisse", 0);
                        statsMap.put("totalEcarts", 0);
                    }
                } else if ("RECEPTIONNISTE".equalsIgnoreCase(type)) {
                    String recUsername = staff.getEmail() != null && staff.getEmail().contains("@")
                            ? staff.getEmail().split("@")[0]
                            : staff.getFullName().toLowerCase().replace(" ", ".");
                    try {
                        long newPatients = patientRepository.countByClinicIdAndCreatedByAndCreatedAtBetween(clinicId, recUsername, startDateTime, endDateTime);
                        long registeredPrestations = invoiceLineRepository.countRegisteredPrestations(clinicId, recUsername, startDateTime, endDateTime);
                        statsMap.put("newPatients", newPatients);
                        statsMap.put("registeredPrestations", registeredPrestations);
                    } catch (Exception e) {
                        log.error("Failed to compute stats for receptionist {}", recUsername, e);
                        statsMap.put("newPatients", 0);
                        statsMap.put("registeredPrestations", 0);
                    }
                } else if (List.of("MEDECIN", "PRATICIEN", "LABORANTIN", "INFIRMIER").contains(type.toUpperCase()) && !"vacataire".equalsIgnoreCase(contractType)) {
                    List<InvoiceLine> acts = invoiceLineRepository.findByPractitionerAndMonth(clinicId, staff.getId(), startDateTime, endDateTime);
                    BigDecimal actsSum = BigDecimal.ZERO;
                    for (InvoiceLine act : acts) {
                        BigDecimal price = act.getTotalPrice() != null ? act.getTotalPrice() : act.getUnitPrice().multiply(BigDecimal.valueOf(act.getQuantity()));
                        actsSum = actsSum.add(price);
                    }
                    statsMap.put("actsCount", acts.size());
                    statsMap.put("actsTotal", actsSum);
                }

                String statsJson = "{}";
                try {
                    statsJson = objectMapper.writeValueAsString(statsMap);
                } catch (Exception ignored) {}

                map.put("id", null);
                map.put("calculatedAmount", calculatedAmount);
                map.put("adjustedAmount", calculatedAmount);
                map.put("notes", "");
                map.put("statsJson", statsJson);
                map.put("paid", false);
            }

            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/staff/{staffId}/prestations")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPTABLE', 'MANAGER_CLINIQUE', 'RH')")
    @Operation(summary = "Lister les prestations d'un praticien pour un mois")
    public ResponseEntity<List<InvoiceLine>> getStaffPrestations(
            @PathVariable UUID staffId,
            @RequestParam String month) {

        UUID clinicId = clinicContextHolder.getClinicId();
        LocalDate start = LocalDate.parse(month + "-01");
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = start.plusMonths(1).atStartOfDay();

        return ResponseEntity.ok(invoiceLineRepository.findByPractitionerAndMonth(
                clinicId, staffId, startDateTime, endDateTime));
    }

    @PostMapping("/save")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPTABLE', 'MANAGER_CLINIQUE', 'RH')")
    @Transactional
    @Operation(summary = "Enregistrer et payer la rémunération d'un membre du personnel")
    public ResponseEntity<?> saveRemuneration(@RequestBody Map<String, Object> payload) {
        UUID clinicId = clinicContextHolder.getClinicId();

        String staffIdStr = (String) payload.get("staffId");
        String month = (String) payload.get("month");
        if (staffIdStr == null || month == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "staffId et month sont requis."));
        }

        UUID staffId = UUID.fromString(staffIdStr);

        // Check if already paid
        if (itemRepository.findByClinicIdAndStaffIdAndMonth(clinicId, staffId, month).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "La rémunération a déjà été enregistrée pour ce membre du personnel ce mois-ci."));
        }

        Practitioner staff = practitionerRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException("Membre du personnel introuvable."));

        String spec = staff.getSpecialty();
        if (spec == null || spec.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le profil du personnel n'est pas correctement configuré (spécialité vide)."));
        }

        String[] parts = spec.split("\\|");
        String type = parts[0];
        String contractType = parts.length > 2 ? parts[2] : "permanent";
        String valStr = parts.length > 3 ? parts[3] : "0";
        String paymentMethod = parts.length > 11 ? parts[11] : "ESPECES";
        String paymentDetails = parts.length > 12 ? parts[12] : "";

        BigDecimal adjustedAmount = payload.get("adjustedAmount") != null
                ? new BigDecimal(payload.get("adjustedAmount").toString())
                : BigDecimal.ZERO;
        String notes = (String) payload.get("notes");
        if (notes == null) notes = "";

        // Recompute calculatedAmount and stats for saving
        LocalDate start = LocalDate.parse(month + "-01");
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = start.plusMonths(1).atStartOfDay();

        BigDecimal calculatedAmount = BigDecimal.ZERO;
        Map<String, Object> statsMap = new HashMap<>();

        if ("permanent".equalsIgnoreCase(contractType)) {
            try {
                calculatedAmount = new BigDecimal(valStr);
            } catch (Exception e) {
                calculatedAmount = BigDecimal.ZERO;
            }
        } else if ("vacataire".equalsIgnoreCase(contractType)) {
            if (List.of("MEDECIN", "PRATICIEN", "LABORANTIN", "INFIRMIER").contains(type.toUpperCase())) {
                List<InvoiceLine> acts = invoiceLineRepository.findByPractitionerAndMonth(clinicId, staff.getId(), startDateTime, endDateTime);
                BigDecimal actsSum = BigDecimal.ZERO;
                for (InvoiceLine act : acts) {
                    BigDecimal price = act.getTotalPrice() != null ? act.getTotalPrice() : act.getUnitPrice().multiply(BigDecimal.valueOf(act.getQuantity()));
                    actsSum = actsSum.add(price);
                }
                BigDecimal commPct;
                try {
                    commPct = new BigDecimal(valStr).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                } catch (Exception e) {
                    commPct = BigDecimal.ZERO;
                }
                calculatedAmount = actsSum.multiply(commPct).setScale(0, RoundingMode.HALF_UP);
                statsMap.put("actsCount", acts.size());
                statsMap.put("actsTotal", actsSum);
            }
        }

        // Stats
        if ("CAISSIER".equalsIgnoreCase(type)) {
            String cashierUsername = staff.getEmail() != null && staff.getEmail().contains("@")
                    ? staff.getEmail().split("@")[0]
                    : staff.getFullName().toLowerCase().replace(" ", ".");
            try {
                Map<String, Object> stats = billingClient.getCashierStats(cashierUsername, month);
                statsMap.putAll(stats);
            } catch (Exception e) {
                statsMap.put("sessionCount", 0);
            }
        } else if ("RECEPTIONNISTE".equalsIgnoreCase(type)) {
            String recUsername = staff.getEmail() != null && staff.getEmail().contains("@")
                    ? staff.getEmail().split("@")[0]
                    : staff.getFullName().toLowerCase().replace(" ", ".");
            try {
                long newPatients = patientRepository.countByClinicIdAndCreatedByAndCreatedAtBetween(clinicId, recUsername, startDateTime, endDateTime);
                long registeredPrestations = invoiceLineRepository.countRegisteredPrestations(clinicId, recUsername, startDateTime, endDateTime);
                statsMap.put("newPatients", newPatients);
                statsMap.put("registeredPrestations", registeredPrestations);
            } catch (Exception ignored) {}
        } else if (List.of("MEDECIN", "PRATICIEN", "LABORANTIN", "INFIRMIER").contains(type.toUpperCase()) && !"vacataire".equalsIgnoreCase(contractType)) {
            List<InvoiceLine> acts = invoiceLineRepository.findByPractitionerAndMonth(clinicId, staff.getId(), startDateTime, endDateTime);
            BigDecimal actsSum = BigDecimal.ZERO;
            for (InvoiceLine act : acts) {
                BigDecimal price = act.getTotalPrice() != null ? act.getTotalPrice() : act.getUnitPrice().multiply(BigDecimal.valueOf(act.getQuantity()));
                actsSum = actsSum.add(price);
            }
            statsMap.put("actsCount", acts.size());
            statsMap.put("actsTotal", actsSum);
        }

        String statsJson = "{}";
        try {
            statsJson = objectMapper.writeValueAsString(statsMap);
        } catch (Exception ignored) {}

        // Save
        StaffRemunerationItem item = StaffRemunerationItem.builder()
                .batchId(new UUID(0L, 0L)) // dummy UUID
                .clinicId(clinicId)
                .month(month)
                .staffId(staffId)
                .staffName(staff.getFullName())
                .staffType(type)
                .contractType(contractType)
                .paymentMethod(paymentMethod)
                .paymentDetails(paymentDetails)
                .calculatedAmount(calculatedAmount)
                .adjustedAmount(adjustedAmount)
                .notes(notes)
                .statsJson(statsJson)
                .build();

        item = itemRepository.save(item);

        // Debit treasury transaction
        if (adjustedAmount.compareTo(BigDecimal.ZERO) > 0) {
            String bankAccountId = (String) payload.get("bankAccountId");

            if ("VIREMENT".equalsIgnoreCase(paymentMethod) && (bankAccountId == null || bankAccountId.isBlank())) {
                throw new IllegalArgumentException("Le compte bancaire de règlement est requis pour les paiements par virement.");
            }

            String label = "Paiement Salaire (" + month + ") : " + staff.getFullName();
            Map<String, Object> txPayload = new HashMap<>();
            txPayload.put("type", "DECAISSEMENT");
            txPayload.put("amount", adjustedAmount);
            txPayload.put("label", label);
            txPayload.put("expenseCategory", "SALAIRE");
            txPayload.put("referenceId", item.getId().toString());

            if ("VIREMENT".equalsIgnoreCase(paymentMethod)) {
                txPayload.put("paymentMethod", "VIREMENT");
                txPayload.put("bankAccountCode", bankAccountId);
            } else if ("MOBILE_MONEY".equalsIgnoreCase(paymentMethod)) {
                txPayload.put("paymentMethod", "MOBILE_MONEY");
                txPayload.put("caisseCode", "CAISSE_PRINCIPALE");
            } else {
                txPayload.put("paymentMethod", "ESPECES");
                txPayload.put("caisseCode", "CAISSE_PRINCIPALE");
            }

            try {
                billingClient.addTransaction(txPayload);
            } catch (Exception e) {
                log.error("Failed to debit treasury for staff payment {}", staff.getFullName(), e);
                throw new IllegalStateException("Enregistrement impossible : échec lors de la création de la transaction de trésorerie.");
            }
        }

        return ResponseEntity.ok(item);
    }
}
