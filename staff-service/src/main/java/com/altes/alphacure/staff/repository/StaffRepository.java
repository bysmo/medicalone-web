package com.altes.alphacure.staff.repository;

import com.altes.alphacure.staff.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StaffRepository extends JpaRepository<Staff, UUID> {

    /** Cloisonnement : récupère un membre du staff en vérifiant son appartenance à la clinique. */
    Optional<Staff> findByIdAndClinicId(UUID id, UUID clinicId);

    List<Staff> findByClinicId(UUID clinicId);

    @Query("SELECT s FROM Staff s WHERE s.clinicId = :clinicId " +
           "AND (LOWER(s.firstName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(s.lastName) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "  OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    List<Staff> searchByClinicId(UUID clinicId, String search);

    List<Staff> findByClinicIdAndTypeId(UUID clinicId, UUID typeId);

    boolean existsByClinicIdAndEmail(UUID clinicId, String email);
}
