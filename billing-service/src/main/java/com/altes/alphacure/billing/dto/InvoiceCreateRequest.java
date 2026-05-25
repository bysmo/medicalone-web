package com.altes.alphacure.billing.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class InvoiceCreateRequest {

    @NotNull(message = "L'ID patient est obligatoire")
    private UUID patientId;

    @NotNull(message = "Au moins une ligne est obligatoire")
    @Size(min = 1)
    @Valid
    private List<InvoiceLineRequest> lines;
}
