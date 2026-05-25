package com.altes.alphacure.patient.exception;

public class PatientAlreadyExistsException extends RuntimeException {
    public PatientAlreadyExistsException(String message) {
        super(message);
    }
}
