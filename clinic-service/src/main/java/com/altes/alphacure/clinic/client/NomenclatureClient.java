package com.altes.alphacure.clinic.client;

import com.altes.alphacure.clinic.dto.SeedResultDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.UUID;

@FeignClient(name = "nomenclature-service")
public interface NomenclatureClient {

    @PostMapping("/api/v1/nomenclatures/seed")
    SeedResultDto seedClinicNomenclature(@RequestParam("clinicId") UUID clinicId,
                                         @RequestParam(value = "force", defaultValue = "false") boolean force);
}
