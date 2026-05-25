package com.altes.alphacure.staff.repository;

import com.altes.alphacure.staff.entity.StaffType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface StaffTypeRepository extends JpaRepository<StaffType, UUID> {
}
