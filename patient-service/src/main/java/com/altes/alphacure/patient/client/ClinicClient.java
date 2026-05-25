package com.altes.alphacure.patient.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import java.util.UUID;

@FeignClient(name = "clinic-service")
public interface ClinicClient {

    @PostMapping("/api/v1/clinics/numbering/next")
    String getNextNumber(
            @RequestParam("documentType") NumberingDocumentType documentType,
            @RequestParam(value = "clinicId", required = false) UUID clinicId
    );
}
