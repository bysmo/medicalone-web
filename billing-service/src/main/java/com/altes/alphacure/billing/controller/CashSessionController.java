package com.altes.alphacure.billing.controller;

import com.altes.alphacure.billing.client.ClinicClient;
import com.altes.alphacure.billing.client.NumberingDocumentType;
import com.altes.alphacure.billing.entity.CashSession;
import com.altes.alphacure.billing.entity.CashTransaction;
import com.altes.alphacure.billing.repository.CashSessionRepository;
import com.altes.alphacure.billing.repository.CashTransactionRepository;
import com.altes.alphacure.billing.security.ClinicContextHolder;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cash-sessions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Sessions de Caisse", description = "Gestion de la trésorerie et sessions de caisse")
public class CashSessionController {

    private final CashSessionRepository cashSessionRepository;
    private final CashTransactionRepository cashTransactionRepository;
    private final ClinicContextHolder clinicContextHolder;
    private final ClinicClient clinicClient;

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Obtenir la session active de l'utilisateur connecté")
    public ResponseEntity<?> getActiveSession() {
        String username = clinicContextHolder.getUsername();
        return cashSessionRepository.findByCashierUsernameAndStatus(username, "OPEN")
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("active", false)));
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPTABLE', 'MANAGER_CLINIQUE', 'RH')")
    @Operation(summary = "Obtenir les statistiques mensuelles de caisse pour un caissier")
    public ResponseEntity<?> getCashierStats(
            @RequestParam String cashierUsername,
            @RequestParam String month) {
        
        java.time.LocalDate start = java.time.LocalDate.parse(month + "-01");
        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = start.plusMonths(1).atStartOfDay();
        
        List<CashSession> sessions = cashSessionRepository.findSessionsForStats(cashierUsername, startDateTime, endDateTime);
        
        long count = sessions.size();
        BigDecimal totalEcarts = sessions.stream()
                .map(s -> s.getDiscrepancy() != null ? s.getDiscrepancy() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
                
        BigDecimal totalEncaisse = BigDecimal.ZERO;
        BigDecimal totalDecaisse = BigDecimal.ZERO;
        
        if (count > 0) {
            List<UUID> sessionIds = sessions.stream().map(CashSession::getId).toList();
            
            BigDecimal enc = cashTransactionRepository.sumTransactionAmountBySessionsAndType(sessionIds, "ENCAISSEMENT");
            totalEncaisse = enc != null ? enc : BigDecimal.ZERO;
            
            BigDecimal dec = cashTransactionRepository.sumTransactionAmountBySessionsAndType(sessionIds, "DECAISSEMENT");
            totalDecaisse = dec != null ? dec : BigDecimal.ZERO;
        }
        
        return ResponseEntity.ok(Map.of(
                "sessionCount", count,
                "totalEncaisse", totalEncaisse,
                "totalDecaisse", totalDecaisse,
                "totalEcarts", totalEcarts
        ));
    }

    @PostMapping("/open")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE', 'CAISSIER', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Ouvrir une nouvelle session de caisse")
    public ResponseEntity<?> openSession(@RequestBody Map<String, Object> body) {
        UUID clinicId = clinicContextHolder.getClinicId();
        String username = clinicContextHolder.getUsername();

        // 1. Check if user already has an open session
        if (cashSessionRepository.findByCashierUsernameAndStatus(username, "OPEN").isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Vous avez déjà une session de caisse ouverte."));
        }

        String caisseCode = (String) body.get("caisseCode");
        if (caisseCode == null || caisseCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le code de la caisse est requis."));
        }

        // 2. Check if this cash register (caisseCode) is already open by someone else
        if (cashSessionRepository.findFirstByCaisseCodeAndStatus(caisseCode, "OPEN").isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cette caisse est déjà ouverte par un autre caissier."));
        }

        BigDecimal openingBalance = BigDecimal.ZERO;
        if (body.get("openingBalance") != null) {
            openingBalance = new BigDecimal(body.get("openingBalance").toString());
        }

        // Generate reference SESS-YYYYMMDD-HHmmss
        String ref = "SESS-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));

        CashSession session = CashSession.builder()
                .clinicId(clinicId)
                .sessionRef(ref)
                .cashierUsername(username)
                .caisseCode(caisseCode)
                .openingBalance(openingBalance)
                .status("OPEN")
                .build();

        CashSession saved = cashSessionRepository.save(session);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/close/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE', 'CAISSIER', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Clôturer une session de caisse")
    public ResponseEntity<?> closeSession(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        CashSession session = cashSessionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Session introuvable"));

        if (!"OPEN".equals(session.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cette session est déjà clôturée."));
        }

        BigDecimal actualAmount = BigDecimal.ZERO;
        if (body.get("actualAmount") != null) {
            actualAmount = new BigDecimal(body.get("actualAmount").toString());
        }

        boolean forceClose = body.get("forceClose") != null && (Boolean) body.get("forceClose");
        String justification = (String) body.get("justification");

        // Calculate expected amount = opening + total_encaissements - total_decaissements
        List<CashTransaction> txs = cashTransactionRepository.findBySessionId(id);
        BigDecimal totalEncaissements = txs.stream()
                .filter(t -> "ENCAISSEMENT".equals(t.getType()))
                .filter(t -> !"PENDING".equals(t.getStatus()) && !"CANCELLED".equals(t.getStatus()))
                .map(CashTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDecaissements = txs.stream()
                .filter(t -> "DECAISSEMENT".equals(t.getType()))
                .filter(t -> !"PENDING".equals(t.getStatus()) && !"CANCELLED".equals(t.getStatus()))
                .map(CashTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal expectedAmount = session.getOpeningBalance().add(totalEncaissements).subtract(totalDecaissements);
        BigDecimal discrepancy = actualAmount.subtract(expectedAmount);

        // If there's an discrepancy and forceClose is not checked, ask for confirmation
        if (discrepancy.compareTo(BigDecimal.ZERO) != 0 && !forceClose) {
            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "requiresConfirmation", true,
                    "discrepancy", discrepancy,
                    "expectedAmount", expectedAmount,
                    "actualAmount", actualAmount,
                    "message", "Un écart de caisse a été détecté. Souhaitez-vous forcer la clôture de la caisse ?"
            ));
        }

        // Complete closing process
        session.setExpectedAmount(expectedAmount);
        session.setActualAmount(actualAmount);
        session.setDiscrepancy(discrepancy);
        session.setJustification(justification);
        session.setClosingDate(LocalDateTime.now());
        session.setStatus("CLOSED");

        CashSession saved = cashSessionRepository.save(session);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "session", saved
        ));
    }

    @GetMapping("/{id}/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Lister les transactions d'une session")
    public ResponseEntity<List<CashTransaction>> getTransactions(@PathVariable UUID id) {
        return ResponseEntity.ok(cashTransactionRepository.findBySessionIdOrderByCreatedAtDesc(id));
    }

    private void updateSessionExpectedAmount(CashSession session) {
        List<CashTransaction> txs = cashTransactionRepository.findBySessionId(session.getId());
        BigDecimal totalEncaissements = txs.stream()
                .filter(t -> "ENCAISSEMENT".equals(t.getType()))
                .filter(t -> !"PENDING".equals(t.getStatus()) && !"CANCELLED".equals(t.getStatus()))
                .map(CashTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalDecaissements = txs.stream()
                .filter(t -> "DECAISSEMENT".equals(t.getType()))
                .filter(t -> !"PENDING".equals(t.getStatus()) && !"CANCELLED".equals(t.getStatus()))
                .map(CashTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal expected = session.getOpeningBalance().add(totalEncaissements).subtract(totalDecaissements);
        session.setExpectedAmount(expected);
        cashSessionRepository.save(session);
    }

    @PostMapping("/transaction")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE', 'CAISSIER', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Ajouter une transaction manuelle (décaissement ou encaissement direct)")
    public ResponseEntity<?> addTransaction(@RequestBody Map<String, Object> body) {
        UUID clinicId = clinicContextHolder.getClinicId();
        String username = clinicContextHolder.getUsername();

        String caisseCode = (String) body.get("caisseCode");
        CashSession activeSession;
        if (caisseCode != null && !caisseCode.isBlank()) {
            java.util.Optional<CashSession> openSessionOpt = cashSessionRepository.findFirstByCaisseCodeAndStatus(caisseCode, "OPEN");
            if (openSessionOpt.isPresent()) {
                activeSession = openSessionOpt.get();
            } else {
                List<CashSession> allSessions = cashSessionRepository.findByClinicIdOrderByOpeningDateDesc(clinicId);
                activeSession = allSessions.stream()
                        .filter(s -> caisseCode.equals(s.getCaisseCode()))
                        .findFirst()
                        .orElseThrow(() -> new IllegalStateException("Aucune session de caisse ouverte ni historique trouvé pour la caisse: " + caisseCode));
            }
        } else {
            java.util.Optional<CashSession> openOpt = cashSessionRepository.findByCashierUsernameAndStatus(username, "OPEN");
            if (openOpt.isPresent()) {
                activeSession = openOpt.get();
            } else {
                List<CashSession> allSessions = cashSessionRepository.findByClinicIdOrderByOpeningDateDesc(clinicId);
                if (!allSessions.isEmpty()) {
                    activeSession = allSessions.get(0);
                } else {
                    throw new IllegalStateException("Aucune session de caisse ouverte ou archivée pour cette clinique.");
                }
            }
        }

        String type = (String) body.get("type"); // ENCAISSEMENT, DECAISSEMENT
        if (type == null || (!"ENCAISSEMENT".equals(type) && !"DECAISSEMENT".equals(type))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le type de transaction (ENCAISSEMENT/DECAISSEMENT) est incorrect ou absent."));
        }

        BigDecimal amount = BigDecimal.ZERO;
        if (body.get("amount") != null) {
            amount = new BigDecimal(body.get("amount").toString());
        }

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le montant doit être supérieur à zéro."));
        }

        String label = (String) body.get("label");
        if (label == null || label.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le libellé de la transaction est requis."));
        }

        String paymentMethod = (String) body.get("paymentMethod");
        if (paymentMethod == null || paymentMethod.isBlank()) {
            paymentMethod = "ESPECES";
        }

        String bankAccountCode = (String) body.get("bankAccountCode");
        String expenseCategory = (String) body.get("expenseCategory");

        String status = "VALIDATED";
        if (expenseCategory != null && !expenseCategory.trim().isEmpty()) {
            status = "PENDING";
        }

        // Validate that disbursement doesn't exceed current machine balance
        if ("DECAISSEMENT".equals(type) && "VALIDATED".equals(status)) {
            BigDecimal currentBalance = activeSession.getExpectedAmount() != null ? activeSession.getExpectedAmount() : activeSession.getOpeningBalance();
            if (currentBalance.compareTo(amount) < 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Le solde de caisse actuel (" + currentBalance + " FCFA) est insuffisant pour effectuer ce remboursement ou décaissement de " + amount + " FCFA."));
            }
        }

        String referenceId = (String) body.get("referenceId");

        String receiptNumber = null;
        if ("ENCAISSEMENT".equals(type)) {
            try {
                receiptNumber = clinicClient.getNextNumber(NumberingDocumentType.CASH_RECEIPT, null);
            } catch (Exception e) {
                log.error("[Billing] Échec de la génération automatique du numéro de reçu: {}", e.getMessage());
            }
        }

        CashTransaction tx = CashTransaction.builder()
                .clinicId(clinicId)
                .sessionId(activeSession.getId())
                .type(type)
                .amount(amount)
                .label(label)
                .paymentMethod(paymentMethod)
                .bankAccountCode(bankAccountCode)
                .expenseCategory(expenseCategory)
                .referenceId(referenceId)
                .receiptNumber(receiptNumber)
                .status(status)
                .build();

        CashTransaction saved = cashTransactionRepository.save(tx);
        
        // Update session expected balance
        updateSessionExpectedAmount(activeSession);

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{secondarySessionId}/transfer-to-main")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Transférer le solde d'une caisse secondaire clôturée vers la caisse principale active")
    public ResponseEntity<?> transferToMain(@PathVariable UUID secondarySessionId) {
        UUID clinicId = clinicContextHolder.getClinicId();
        String username = clinicContextHolder.getUsername();

        CashSession secondarySession = cashSessionRepository.findById(secondarySessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session secondaire introuvable"));

        if (!clinicId.equals(secondarySession.getClinicId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Accès non autorisé à cette session."));
        }

        if (!"CLOSED".equals(secondarySession.getStatus())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Seules les sessions clôturées peuvent être transférées."));
        }

        if (secondarySession.getTransferred() != null && secondarySession.getTransferred()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Cette session a déjà été transférée."));
        }

        // Find the active main session of the logged-in user
        CashSession mainSession = cashSessionRepository.findByCashierUsernameAndStatus(username, "OPEN")
                .orElseThrow(() -> new IllegalStateException("Vous devez avoir une session de caisse ouverte pour recevoir un transfert."));

        if (!"CAISSE_PRINCIPALE".equals(mainSession.getCaisseCode())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Seule la caisse principale active peut recevoir des transferts de caisses secondaires."));
        }

        BigDecimal transferAmount = secondarySession.getActualAmount();
        if (transferAmount == null || transferAmount.compareTo(BigDecimal.ZERO) <= 0) {
            // If the amount is zero or less, just mark it as transferred
            secondarySession.setTransferred(true);
            cashSessionRepository.save(secondarySession);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "La session a été marquée comme transférée (solde nul).",
                    "secondarySession", secondarySession
            ));
        }

        // Create transaction in main session
        CashTransaction mainTx = CashTransaction.builder()
                .clinicId(clinicId)
                .sessionId(mainSession.getId())
                .type("ENCAISSEMENT")
                .amount(transferAmount)
                .label("Transfert reçu de la caisse " + secondarySession.getCaisseCode() + " (" + secondarySession.getSessionRef() + ")")
                .paymentMethod("ESPECES")
                .referenceId(secondarySession.getId().toString())
                .build();

        cashTransactionRepository.save(mainTx);
        updateSessionExpectedAmount(mainSession);

        // Update secondary session
        secondarySession.setTransferred(true);
        secondarySession.setActualAmount(BigDecimal.ZERO);
        secondarySession.setDiscrepancy(secondarySession.getExpectedAmount().negate());
        cashSessionRepository.save(secondarySession);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Le montant de " + transferAmount + " FCFA a été transféré vers la caisse principale.",
                "secondarySession", secondarySession,
                "mainSession", mainSession
        ));
    }

    @GetMapping("/balances")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPTABLE', 'MANAGER_CLINIQUE', 'CAISSIER')")
    @Operation(summary = "Obtenir les soldes en temps réel de toutes les caisses et tous les comptes bancaires")
    public ResponseEntity<?> getBalances() {
        UUID clinicId = clinicContextHolder.getClinicId();

        List<CashSession> sessions = cashSessionRepository.findByClinicIdOrderByOpeningDateDesc(clinicId);
        List<CashTransaction> transactions = cashTransactionRepository.findByClinicId(clinicId);

        Map<String, BigDecimal> caisseBalances = new HashMap<>();
        for (CashSession s : sessions) {
            BigDecimal balance = BigDecimal.ZERO;
            if ("OPEN".equals(s.getStatus())) {
                balance = s.getExpectedAmount() != null ? s.getExpectedAmount() : s.getOpeningBalance();
            } else if ("CLOSED".equals(s.getStatus())) {
                balance = s.getActualAmount() != null ? s.getActualAmount() : BigDecimal.ZERO;
            }
            caisseBalances.put(s.getCaisseCode(), caisseBalances.getOrDefault(s.getCaisseCode(), BigDecimal.ZERO).add(balance));
        }

        Map<String, BigDecimal> bankBalances = new HashMap<>();
        for (CashTransaction t : transactions) {
            if (t.getBankAccountCode() != null && !t.getBankAccountCode().isBlank()) {
                if ("PENDING".equals(t.getStatus()) || "CANCELLED".equals(t.getStatus())) {
                    continue;
                }
                BigDecimal amount = t.getAmount();
                
                boolean isDebit;
                if ("TRANSFERT_BANQUE".equals(t.getExpenseCategory())) {
                    isDebit = false;
                } else if ("APPROVISIONNEMENT_BANQUE".equals(t.getExpenseCategory())) {
                    isDebit = true;
                } else {
                    isDebit = "DECAISSEMENT".equals(t.getType());
                }
                
                if (isDebit) {
                    amount = amount.negate();
                }
                bankBalances.put(t.getBankAccountCode(), bankBalances.getOrDefault(t.getBankAccountCode(), BigDecimal.ZERO).add(amount));
            }
        }

        return ResponseEntity.ok(Map.of(
                "caisses", caisseBalances,
                "comptes", bankBalances
        ));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONNISTE', 'CAISSIER', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Lister toutes les sessions de caisse de la clinique")
    public ResponseEntity<List<CashSession>> getAllSessions() {
        UUID clinicId = clinicContextHolder.getClinicId();
        return ResponseEntity.ok(cashSessionRepository.findByClinicIdOrderByOpeningDateDesc(clinicId));
    }

    @PutMapping("/transaction/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAISSIER', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Modifier une dépense en attente")
    public ResponseEntity<?> updateTransaction(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        CashTransaction tx = cashTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction introuvable"));

        if (!"PENDING".equals(tx.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Seules les dépenses en attente peuvent être modifiées."));
        }

        CashSession session = cashSessionRepository.findById(tx.getSessionId())
                .orElseThrow(() -> new IllegalStateException("Session associée introuvable"));

        if (!"OPEN".equals(session.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "La session de caisse associée est clôturée."));
        }

        BigDecimal amount = BigDecimal.ZERO;
        if (body.get("amount") != null) {
            amount = new BigDecimal(body.get("amount").toString());
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le montant doit être supérieur à zéro."));
        }

        String label = (String) body.get("label");
        if (label == null || label.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le libellé est requis."));
        }

        String paymentMethod = (String) body.get("paymentMethod");
        String bankAccountCode = (String) body.get("bankAccountCode");
        String expenseCategory = (String) body.get("expenseCategory");

        tx.setAmount(amount);
        tx.setLabel(label);
        if (paymentMethod != null) tx.setPaymentMethod(paymentMethod);
        tx.setBankAccountCode(bankAccountCode);
        tx.setExpenseCategory(expenseCategory);

        CashTransaction saved = cashTransactionRepository.save(tx);
        updateSessionExpectedAmount(session);

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/transaction/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAISSIER', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Annuler (supprimer logiquement) une dépense en attente")
    public ResponseEntity<?> deleteTransaction(@PathVariable UUID id) {
        CashTransaction tx = cashTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction introuvable"));

        if (!"PENDING".equals(tx.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Seules les dépenses en attente peuvent être annulées."));
        }

        CashSession session = cashSessionRepository.findById(tx.getSessionId())
                .orElseThrow(() -> new IllegalStateException("Session associée introuvable"));

        if (!"OPEN".equals(session.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "La session de caisse associée est clôturée."));
        }

        tx.setStatus("CANCELLED");
        CashTransaction saved = cashTransactionRepository.save(tx);
        updateSessionExpectedAmount(session);

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/transaction/{id}/validate")
    @PreAuthorize("hasAnyRole('ADMIN', 'CAISSIER', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Valider une dépense en attente")
    public ResponseEntity<?> validateTransaction(@PathVariable UUID id) {
        CashTransaction tx = cashTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction introuvable"));

        if (!"PENDING".equals(tx.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Seules les dépenses en attente peuvent être validées."));
        }

        CashSession session = cashSessionRepository.findById(tx.getSessionId())
                .orElseThrow(() -> new IllegalStateException("Session associée introuvable"));

        if (!"OPEN".equals(session.getStatus())) {
            if ("VIREMENT".equalsIgnoreCase(tx.getPaymentMethod())) {
                // Bank transfers don't affect cash drawer balance, we can validate directly
            } else {
                java.util.Optional<CashSession> openSessionOpt = cashSessionRepository.findFirstByCaisseCodeAndStatus(session.getCaisseCode(), "OPEN");
                if (openSessionOpt.isPresent()) {
                    session = openSessionOpt.get();
                    tx.setSessionId(session.getId());
                } else {
                    return ResponseEntity.badRequest().body(Map.of("message", "La session de caisse associée est clôturée et aucune nouvelle session n'est ouverte pour la caisse: " + session.getCaisseCode()));
                }
            }
        }

        // Validate that disbursement doesn't exceed current machine balance
        if ("DECAISSEMENT".equals(tx.getType())) {
            BigDecimal currentBalance = session.getExpectedAmount() != null ? session.getExpectedAmount() : session.getOpeningBalance();
            if (currentBalance.compareTo(tx.getAmount()) < 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Le solde de caisse actuel (" + currentBalance + " FCFA) est insuffisant pour valider cette dépense de " + tx.getAmount() + " FCFA."));
            }
        }

        tx.setStatus("VALIDATED");
        CashTransaction saved = cashTransactionRepository.save(tx);
        updateSessionExpectedAmount(session);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'COMPTABLE', 'MANAGER_CLINIQUE')")
    @Operation(summary = "Lister toutes les transactions de la clinique, avec filtre optionnel")
    public ResponseEntity<List<CashTransaction>> getAllClinicTransactions(
            @RequestParam(required = false) String bankAccountCode,
            @RequestParam(required = false) String status) {
        UUID clinicId = clinicContextHolder.getClinicId();
        List<CashTransaction> txs = cashTransactionRepository.findByClinicId(clinicId);

        java.util.stream.Stream<CashTransaction> stream = txs.stream();

        if (bankAccountCode != null && !bankAccountCode.isBlank()) {
            stream = stream.filter(t -> bankAccountCode.equals(t.getBankAccountCode()));
        }

        if (status != null && !status.isBlank()) {
            stream = stream.filter(t -> status.equalsIgnoreCase(t.getStatus()));
        }

        List<CashTransaction> result = stream
                .sorted(java.util.Comparator.comparing(CashTransaction::getCreatedAt).reversed())
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
