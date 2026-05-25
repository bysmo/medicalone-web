package com.altes.alphacure.payment.service;

import com.altes.alphacure.payment.entity.*;
import com.altes.alphacure.payment.event.PaymentCompletedEvent;
import com.altes.alphacure.payment.exception.PaymentException;
import com.altes.alphacure.payment.repository.CashRegisterRepository;
import com.altes.alphacure.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PaymentService {

    private static final String TOPIC_PAYMENT_COMPLETED = "payment.completed";

    private final PaymentRepository paymentRepository;
    private final CashRegisterRepository cashRegisterRepository;
    private final KafkaTemplate<String, PaymentCompletedEvent> kafkaTemplate;

    /**
     * Effectue un encaissement.
     * Contrainte métier : la caisse doit être OUVERTE pour encaisser.
     */
    public Payment processPayment(UUID clinicId, UUID invoiceId, BigDecimal amount,
                                   String paymentMethod, UUID cashRegisterId) {
        // Vérification caisse ouverte
        CashRegister cashRegister = cashRegisterRepository.findByIdAndClinicId(cashRegisterId, clinicId)
                .orElseThrow(() -> new PaymentException("Caisse introuvable: " + cashRegisterId));

        if (cashRegister.getStatus() != CashRegisterStatus.OPEN) {
            throw new PaymentException("La caisse '" + cashRegister.getName() + "' est fermée. Ouvrez-la avant d'encaisser.");
        }

        Payment payment = Payment.builder()
                .clinicId(clinicId)
                .invoiceId(invoiceId)
                .amount(amount)
                .paymentMethod(paymentMethod)
                .status(PaymentStatus.COMPLETED)
                .cashRegisterId(cashRegisterId)
                .build();

        Payment saved = paymentRepository.save(payment);
        log.info("Paiement enregistré: {} — montant: {} — caisse: {}", saved.getId(), amount, cashRegisterId);

        // Événement Kafka
        PaymentCompletedEvent event = PaymentCompletedEvent.builder()
                .paymentId(saved.getId())
                .invoiceId(invoiceId)
                .clinicId(clinicId)
                .amount(amount)
                .paymentMethod(paymentMethod)
                .completedAt(LocalDateTime.now())
                .build();
        kafkaTemplate.send(TOPIC_PAYMENT_COMPLETED, saved.getId().toString(), event);

        return saved;
    }

    /**
     * Ouvre une caisse (une seule caisse ouverte par utilisateur à la fois).
     */
    public CashRegister openCashRegister(UUID clinicId, UUID userId, String name) {
        // Vérification : pas de caisse déjà ouverte pour cet utilisateur
        if (cashRegisterRepository.existsByClinicIdAndUserIdAndStatus(clinicId, userId, CashRegisterStatus.OPEN)) {
            throw new PaymentException("Vous avez déjà une caisse ouverte. Fermez-la avant d'en ouvrir une autre.");
        }

        CashRegister register = CashRegister.builder()
                .clinicId(clinicId)
                .userId(userId)
                .name(name)
                .status(CashRegisterStatus.OPEN)
                .openedAt(LocalDateTime.now())
                .build();

        return cashRegisterRepository.save(register);
    }

    /**
     * Ferme une caisse.
     */
    public CashRegister closeCashRegister(UUID clinicId, UUID registerId) {
        CashRegister register = cashRegisterRepository.findByIdAndClinicId(registerId, clinicId)
                .orElseThrow(() -> new PaymentException("Caisse introuvable: " + registerId));

        if (register.getStatus() == CashRegisterStatus.CLOSED) {
            throw new PaymentException("La caisse est déjà fermée");
        }

        register.setStatus(CashRegisterStatus.CLOSED);
        register.setClosedAt(LocalDateTime.now());
        return cashRegisterRepository.save(register);
    }
}
