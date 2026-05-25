package com.altes.alphacure.billing.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class InvoiceLineRequest {

    @NotNull(message = "L'ID de l'acte médical est obligatoire")
    private UUID medicalActId;

    @Min(value = 1, message = "La quantité doit être >= 1")
    private Integer quantity = 1;

    /**
     * Type de tarification applicable (standard, assure_national, etc.)
     * Si null → tarif standard appliqué automatiquement
     */
    private String priceType;
}
