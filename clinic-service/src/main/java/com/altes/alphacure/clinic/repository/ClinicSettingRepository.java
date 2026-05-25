package com.altes.alphacure.clinic.repository;

import com.altes.alphacure.clinic.entity.ClinicSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClinicSettingRepository extends JpaRepository<ClinicSetting, UUID> {
    List<ClinicSetting> findByClinicId(UUID clinicId);

    Optional<ClinicSetting> findByClinicIdAndSettingKey(UUID clinicId, String settingKey);
}
