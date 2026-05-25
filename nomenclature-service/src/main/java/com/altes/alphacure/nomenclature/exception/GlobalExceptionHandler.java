package com.altes.alphacure.nomenclature.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Contexte clinique manquant dans le JWT (clinic_id absent ou null).
     * NOTE : Spring Security intercepte aussi AccessDeniedException — le AccessDeniedHandler
     * dans SecurityConfig prend la main en premier pour les cas pré-controller.
     * Ce handler gère les cas lancés DEPUIS les controllers/services après auth réussie.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        log.warn("[Nomenclature] Accès refusé (clinic_id manquant dans JWT?): {}", ex.getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN,
                "Contexte clinique introuvable (clinic_id). Déconnectez-vous et reconnectez-vous.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("[Nomenclature] Argument invalide: {}", ex.getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(RuntimeException.class)
    public ProblemDetail handleRuntime(RuntimeException ex) {
        log.error("[Nomenclature] Erreur interne inattendue", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR,
                "Erreur interne : " + ex.getMessage());
    }
}
