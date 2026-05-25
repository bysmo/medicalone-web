package com.altes.alphacure.clinic.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum NumberingSegmentType {
    INCREMENT("Compteur séquentiel"),
    DAY("Jour (JJ)"),
    MONTH("Mois (MM)"),
    YEAR("Année (AAAA)"),
    YEAR_SHORT("Année (AA)"),
    SEPARATOR("Séparateur"),
    LITERAL("Texte libre");

    private final String label;
}
