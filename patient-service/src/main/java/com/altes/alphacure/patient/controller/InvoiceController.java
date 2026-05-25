package com.altes.alphacure.patient.controller;

import com.altes.alphacure.patient.client.BillingClient;
import com.altes.alphacure.patient.entity.Invoice;
import com.altes.alphacure.patient.entity.InvoiceLine;
import com.altes.alphacure.patient.entity.enums.ActNature;
import com.altes.alphacure.patient.entity.enums.InvoiceLineStatus;
import com.altes.alphacure.patient.entity.enums.InvoiceStatus;
import com.altes.alphacure.patient.entity.enums.TariffType;
import com.altes.alphacure.patient.repository.InvoiceRepository;
import com.altes.alphacure.patient.security.ClinicContextHolder;
import com.altes.alphacure.patient.service.InvoiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Facturation — cloisonné par clinique.
 *
 * Le JWT est propagé automatiquement aux appels Feign vers billing-service
 * via FeignSecurityConfig.jwtFeignRequestInterceptor().
 * Les headers manuels (getAuthHeader / getClinicIdHeader) sont supprimés.
 */
@RestController
@RequestMapping("/api/v1/invoices")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Factures", description = "Gestion de la facturation")
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final ClinicContextHolder clinicContextHolder;
    private final BillingClient billingClient;
    private final InvoiceRepository invoiceRepository;

    // ─── Helpers de conversion ────────────────────────────────────────────────

    private TariffType parseTariffType(String raw) {
        if (raw == null) return TariffType.STANDARD;
        return switch (raw.trim().toUpperCase()) {
            case "ASSURE_INT", "ASSURE_INTERNATIONAL", "INTERNATIONAL" -> TariffType.ASSURE_INTERNATIONAL;
            case "ASSURE_NAT", "ASSURE_NATIONAL", "NATIONAL", "CONVENTIONNE" -> TariffType.ASSURE_NATIONAL;
            case "PERSONNEL"  -> TariffType.PERSONNEL;
            case "RETRAITE"   -> TariffType.RETRAITE;
            case "URGENCE"    -> TariffType.URGENCE;
            default -> {
                try { yield TariffType.valueOf(raw.trim().toUpperCase()); }
                catch (IllegalArgumentException e) { yield TariffType.STANDARD; }
            }
        };
    }

    /** REGLEE (ancien frontend) = facture déjà payée via forfait → PAID */
    private InvoiceStatus parseInvoiceStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String s = raw.trim().toUpperCase();
        if ("REGLEE".equals(s) || "RÉGLÉE".equalsIgnoreCase(raw.trim())) {
            return InvoiceStatus.PAID;
        }
        try {
            return InvoiceStatus.valueOf(s);
        } catch (IllegalArgumentException e) {
            return InvoiceStatus.PENDING;
        }
    }

    private ActNature parseActNature(String raw) {
        if (raw == null) return ActNature.CONSULTATIONS;
        String n = raw.trim().toUpperCase();
        if (n.contains("CONSULT"))   return ActNature.CONSULTATIONS;
        if (n.contains("EXAM"))      return ActNature.EXAMENS;
        if (n.contains("SEANCE"))    return ActNature.SEANCES;
        if (n.contains("SOIN"))      return ActNature.SOINS_INFIRMIERS;
        if (n.contains("CHIRURG"))   return ActNature.INTERVENTIONS;
        if (n.contains("HOSP"))      return ActNature.HOSPITALISATIONS;
        try { return ActNature.valueOf(n); }
        catch (IllegalArgumentException e) { return ActNature.CONSULTATIONS; }
    }

    // ─── Endpoints ───────────────────────────────────────────────────────────

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE')")
    @Operation(summary = "Créer une facture avec ses lignes")
    public ResponseEntity<?> createInvoice(@RequestBody Map<String, Object> body) {
        UUID clinicId = clinicContextHolder.getClinicId();

        Invoice invoice = Invoice.builder()
                .clinicId(clinicId)
                .patientId(UUID.fromString((String) body.get("patientId")))
                .tariffType(parseTariffType((String) body.get("tariffType")))
                .coverageRate(body.get("coverageRate") != null ? (Integer) body.get("coverageRate") : 0)
                .bordereauCode((String) body.get("bordereauCode"))
                .status(parseInvoiceStatus((String) body.get("status")))
                .build();

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> linesData = (List<Map<String, Object>>) body.get("lines");
        UUID patientId = UUID.fromString((String) body.get("patientId"));
        List<InvoiceLine> lines = linesData.stream().map(lineData -> InvoiceLine.builder()
                .actId(UUID.fromString((String) lineData.get("actId")))
                .actName((String) lineData.get("actName"))
                .nature(parseActNature((String) lineData.get("nature")))
                .quantity(lineData.get("quantity") != null ? (Integer) lineData.get("quantity") : 1)
                .unitPrice(new BigDecimal(lineData.get("unitPrice").toString()))
                .patientId(patientId)
                .status(lineData.get("status") != null
                        ? InvoiceLineStatus.valueOf(((String) lineData.get("status")).toUpperCase())
                        : InvoiceLineStatus.EN_ATTENTE)
                .build()).toList();

        // Vérification session de caisse ouverte si paiement immédiat
        if (invoice.getStatus() == InvoiceStatus.PAID) {
            try {
                Map<String, Object> activeSession = billingClient.getActiveSession();
                if (activeSession == null || activeSession.get("id") == null) {
                    return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                            .body(Map.of("message", "Aucune session de caisse ouverte. Veuillez d'abord ouvrir une caisse."));
                }
                String caisseCode = (String) activeSession.get("caisseCode");
                if ("CAISSE_PRINCIPALE".equals(caisseCode)) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("message", "La caisse principale ne peut pas encaisser les prestations des patients. Veuillez utiliser une caisse secondaire."));
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                        .body(Map.of("message", "Aucune session de caisse ouverte. Veuillez d'abord ouvrir une caisse."));
            }
        }

        Invoice saved = invoiceService.createInvoice(invoice, lines);

        if (saved.getStatus() == InvoiceStatus.PAID) {
            String paymentMethod = body.get("paymentMethod") != null ? (String) body.get("paymentMethod") : "ESPECES";
            String bankAccountCode = body.get("bankAccountCode") != null ? (String) body.get("bankAccountCode") : null;
            try {
                Map<String, Object> txData = new java.util.HashMap<>();
                txData.put("type", "ENCAISSEMENT");
                txData.put("amount", saved.getPatientAmount());
                txData.put("label", "Encaissement Facture " + saved.getInvoiceRef());
                txData.put("paymentMethod", paymentMethod);
                txData.put("referenceId", saved.getId().toString());
                if (bankAccountCode != null) {
                    txData.put("bankAccountCode", bankAccountCode);
                }
                billingClient.addTransaction(txData);
            } catch (Exception e) {
                log.error("[Invoice] Échec enregistrement transaction caisse : {}", e.getMessage());
            }
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE')")
    @Operation(summary = "Encaisser le paiement d'une facture existante")
    public ResponseEntity<?> payInvoice(@PathVariable UUID id,
            @RequestBody(required = false) Map<String, Object> body) {
        // Vérifier session de caisse active
        try {
            Map<String, Object> activeSession = billingClient.getActiveSession();
            if (activeSession == null || activeSession.get("id") == null) {
                return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                        .body(Map.of("message", "Aucune session de caisse ouverte. Veuillez d'abord ouvrir une caisse."));
            }
            String caisseCode = (String) activeSession.get("caisseCode");
            if ("CAISSE_PRINCIPALE".equals(caisseCode)) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "La caisse principale ne peut pas encaisser les prestations des patients. Veuillez utiliser une caisse secondaire."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.PRECONDITION_REQUIRED)
                    .body(Map.of("message", "Aucune session de caisse ouverte. Veuillez d'abord ouvrir une caisse."));
        }

        Invoice saved;
        try {
            saved = invoiceService.payInvoice(id);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }

        String paymentMethod = body != null && body.get("paymentMethod") != null
                ? (String) body.get("paymentMethod") : "ESPECES";
        String bankAccountCode = body != null && body.get("bankAccountCode") != null
                ? (String) body.get("bankAccountCode") : null;

        try {
            Map<String, Object> txData = new java.util.HashMap<>();
            txData.put("type", "ENCAISSEMENT");
            txData.put("amount", saved.getPatientAmount());
            txData.put("label", "Encaissement Facture " + saved.getInvoiceRef());
            txData.put("paymentMethod", paymentMethod);
            txData.put("referenceId", saved.getId().toString());
            if (bankAccountCode != null) {
                txData.put("bankAccountCode", bankAccountCode);
            }
            billingClient.addTransaction(txData);
        } catch (Exception e) {
            log.error("[Invoice] Échec enregistrement transaction caisse : {}", e.getMessage());
        }
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE','COMPTABLE')")
    @Operation(summary = "Obtenir une facture par ID")
    public ResponseEntity<Invoice> getInvoice(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getInvoiceById(id));
    }

    @GetMapping("/{id}/lines")
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE','COMPTABLE')")
    @Operation(summary = "Lister les lignes d'une facture")
    public ResponseEntity<List<InvoiceLine>> getInvoiceLines(@PathVariable UUID id) {
        return ResponseEntity.ok(invoiceService.getInvoiceLines(id));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE','COMPTABLE')")
    @Operation(summary = "Lister les factures d'un patient")
    public ResponseEntity<List<Invoice>> getByPatient(@PathVariable UUID patientId) {
        return ResponseEntity.ok(invoiceService.getInvoicesByPatient(patientId));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','MEDECIN','INFIRMIER','RECEPTIONNISTE','CAISSIER','MANAGER_CLINIQUE','COMPTABLE')")
    @Operation(summary = "Lister toutes les factures de la clinique")
    public ResponseEntity<List<Invoice>> getAll() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(invoiceService.getInvoicesByClinic(clinicId));
    }
}
