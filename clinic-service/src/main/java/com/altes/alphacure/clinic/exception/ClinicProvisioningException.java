package com.altes.alphacure.clinic.exception;

public class ClinicProvisioningException extends RuntimeException {

    public ClinicProvisioningException(String message) {
        super(message);
    }

    public ClinicProvisioningException(String message, Throwable cause) {
        super(message, cause);
    }
}
