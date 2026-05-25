package com.altes.alphacure.clinic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccountDto {
    private String bankName;
    private String accountHolder;
    private String accountNumber;
    private String iban;
    private String swift;
    private String branch;
    private Boolean primary;
}
