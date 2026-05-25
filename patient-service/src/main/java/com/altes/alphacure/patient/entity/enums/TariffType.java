package com.altes.alphacure.patient.entity.enums;

public enum TariffType {
    STANDARD,
    PERSONNEL,
    RETRAITE,
    ASSURE_NATIONAL,
    ASSURE_INTERNATIONAL,
    URGENCE;

    @com.fasterxml.jackson.annotation.JsonCreator
    public static TariffType fromValue(String value) {
        if (value == null) {
            return STANDARD;
        }
        String normalized = value.trim().toUpperCase();
        switch (normalized) {
            case "ASSURE_INT":
            case "ASSURE_INTERNATIONAL":
            case "INTERNATIONAL":
                return ASSURE_INTERNATIONAL;
            case "ASSURE_NAT":
            case "ASSURE_NATIONAL":
            case "NATIONAL":
            case "CONVENTIONNE":
                return ASSURE_NATIONAL;
            case "PERSONNEL":
                return PERSONNEL;
            case "RETRAITE":
                return RETRAITE;
            case "URGENCE":
                return URGENCE;
            default:
                try {
                    return TariffType.valueOf(normalized);
                } catch (IllegalArgumentException e) {
                    return STANDARD;
                }
        }
    }
}
