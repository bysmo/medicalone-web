package com.altes.alphacure.clinic.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccountDto {
    private String id;
    private String name;
    private String type; // ESPECES, MOBILE_MONEY, VIREMENT_BANCAIRE
    
    // ESPECES fields
    private List<String> eligibleCaisseCodes;
    
    // MOBILE_MONEY fields
    private String providerName;
    private String phoneNumber;
    
    // VIREMENT_BANCAIRE fields
    private String bankName;
    private String accountHolder;
    private String accountNumber;
    private String iban;
    private String swift;
    private String branch;
    
    private Boolean primary;
    private java.math.BigDecimal actualBalance;
}

