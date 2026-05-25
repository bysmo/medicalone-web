package com.altes.alphacure.patient.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        log.warn("Accès refusé: {}", ex.getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN,
                "Contexte clinique introuvable (clinic_id). Déconnectez-vous et reconnectez-vous.");
    }

    @ExceptionHandler(PatientNotFoundException.class)
    public ProblemDetail handleNotFound(PatientNotFoundException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        detail.setTitle("Patient introuvable");
        return detail;
    }

    @ExceptionHandler(PatientAlreadyExistsException.class)
    public ProblemDetail handleConflict(PatientAlreadyExistsException ex) {
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        detail.setTitle("Patient déjà existant");
        return detail;
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public ProblemDetail handleBusinessRule(RuntimeException ex) {
        log.warn("Règle métier: {}", ex.getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(err ->
            errors.put(err.getField(), err.getDefaultMessage())
        );
        ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation échouée");
        detail.setProperty("errors", errors);
        return detail;
    }

    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGeneric(Exception ex) {
        log.error("Erreur interne: ", ex);
        return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "Erreur serveur interne");
    }
}
