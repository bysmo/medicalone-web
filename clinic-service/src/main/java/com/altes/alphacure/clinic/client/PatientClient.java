package com.altes.alphacure.clinic.client;

import com.altes.alphacure.clinic.dto.SeedResultDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(name = "patient-service")
public interface PatientClient {

    @PostMapping("/api/v1/medical-acts/seed")
    SeedResultDto seedClinicActs(@RequestParam("clinicId") UUID clinicId,
                                 @RequestParam(value = "force", defaultValue = "false") boolean force);

    @PostMapping("/api/v1/practitioners/seed")
    void seedClinicStaff(@RequestParam("clinicId") UUID clinicId,
                         @RequestParam(value = "force", defaultValue = "false") boolean force);
}
