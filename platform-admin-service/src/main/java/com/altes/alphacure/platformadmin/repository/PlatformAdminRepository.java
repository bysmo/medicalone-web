package com.altes.alphacure.platformadmin.repository;

import com.altes.alphacure.platformadmin.entity.PlatformAdmin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlatformAdminRepository extends JpaRepository<PlatformAdmin, UUID> {
    Optional<PlatformAdmin> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
