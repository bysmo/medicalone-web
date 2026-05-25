package com.altes.alphacure.nomenclature.repository;

import com.altes.alphacure.nomenclature.entity.Nomenclature;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NomenclatureRepository extends JpaRepository<Nomenclature, UUID> {

    // ── Cloisonnement par clinique ────────────────────────────────────────────

    /** Toutes les nomenclatures d'une clinique (propres + globales). */
    @Query("SELECT n FROM Nomenclature n WHERE n.clinicId = :clinicId OR n.clinicId IS NULL ORDER BY n.type, n.code")
    List<Nomenclature> findByClinicId(@Param("clinicId") UUID clinicId);

    /** Nomenclatures propres à une clinique (sans les globales). */
    @Query("SELECT n FROM Nomenclature n WHERE n.clinicId = :clinicId ORDER BY n.type, n.code")
    List<Nomenclature> findByClinicIdOnly(@Param("clinicId") UUID clinicId);

    /**
     * Nomenclatures par type pour une clinique : inclut les données propres ET les globales (clinicId IS NULL).
     * CRITIQUE : findByTypeAndClinicId() généré par Spring Data JPA produit WHERE clinic_id = :clinicId
     * strictement, excluant les données globales. Cette requête @Query corrige ce comportement.
     */
    @Query("SELECT n FROM Nomenclature n WHERE n.type = :type AND (n.clinicId = :clinicId OR n.clinicId IS NULL) ORDER BY n.clinicId NULLS LAST, n.code")
    List<Nomenclature> findByTypeAndClinicId(@Param("type") String type, @Param("clinicId") UUID clinicId);

    /**
     * Nomenclatures par type+nature pour une clinique : inclut les données propres ET les globales.
     * CRITIQUE : même raison que findByTypeAndClinicId — le nom Spring Data JPA est trompeur.
     */
    @Query("SELECT n FROM Nomenclature n WHERE n.type = :type AND n.nature = :nature AND (n.clinicId = :clinicId OR n.clinicId IS NULL) ORDER BY n.clinicId NULLS LAST, n.code")
    List<Nomenclature> findByTypeAndNatureAndClinicId(@Param("type") String type, @Param("nature") String nature, @Param("clinicId") UUID clinicId);

    List<Nomenclature> findByParentId(UUID parentId);

    /**
     * Recherche précise par type+nature+code avec fallback global.
     */
    @Query("SELECT n FROM Nomenclature n WHERE n.type = :type AND n.nature = :nature AND n.code = :code " +
            "AND (n.clinicId = :clinicId OR n.clinicId IS NULL) " +
            "ORDER BY n.clinicId NULLS LAST")
    List<Nomenclature> findByTypeNatureCode(@Param("type") String type,
            @Param("nature") String nature,
            @Param("code") String code,
            @Param("clinicId") UUID clinicId);

    // ── Données globales (référentiels partagés) ──────────────────────────────

    List<Nomenclature> findByClinicIdIsNull();

    List<Nomenclature> findByTypeAndClinicIdIsNull(String type);

    Optional<Nomenclature> findByTypeAndCodeAndClinicIdIsNull(String type, String code);

    long countByClinicId(UUID clinicId);

    void deleteByClinicId(UUID clinicId);
}
