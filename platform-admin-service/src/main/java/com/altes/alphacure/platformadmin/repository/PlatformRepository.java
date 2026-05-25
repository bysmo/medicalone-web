package com.altes.alphacure.platformadmin.repository;

import com.altes.alphacure.platformadmin.entity.Platform;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PlatformRepository extends JpaRepository<Platform, UUID> {
}
