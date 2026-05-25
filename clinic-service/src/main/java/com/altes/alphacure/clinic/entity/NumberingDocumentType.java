package com.altes.alphacure.clinic.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NumberingDocumentType {
    PATIENT_DOSSIER("Numéro de dossier patient"),
    STAFF_MATRICULE("Matricule personnel"),
    CASH_RECEIPT("Reçu de caisse"),
    INSURANCE_INVOICE("Facture d'assurance"),
    PATIENT_INVOICE("Facture patient"),
    PRESTATION("Référence prestation"),
    CONSULTATION("Référence consultation");

    private final String label;
}
