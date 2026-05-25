/**
 * Définition unique du filtre Hibernate de cloisonnement par clinique.
 * Les entités utilisent {@code @Filter(name = "clinicFilter")} sans redéfinir {@code @FilterDef}.
 */
@org.hibernate.annotations.FilterDef(
        name = "clinicFilter",
        parameters = @org.hibernate.annotations.ParamDef(name = "clinicId", type = java.util.UUID.class)
)
package com.altes.alphacure.billing.entity;
