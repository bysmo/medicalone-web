package com.altes.alphacure.session.repository;

import com.altes.alphacure.session.entity.SessionUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionUsageRepository extends JpaRepository<SessionUsage, UUID> {
    List<SessionUsage> findBySessionPackageId(UUID sessionPackageId);
}
