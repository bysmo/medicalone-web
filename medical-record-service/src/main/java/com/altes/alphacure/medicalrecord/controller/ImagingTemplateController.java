package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.ImagingTemplate;
import com.altes.alphacure.medicalrecord.repository.ImagingTemplateRepository;
import com.altes.alphacure.medicalrecord.security.ClinicContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medical/imaging/templates")
@RequiredArgsConstructor
public class ImagingTemplateController {

    private final ImagingTemplateRepository repository;
    private final ClinicContextHolder clinicContextHolder;

    @GetMapping
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    public ResponseEntity<List<ImagingTemplate>> getTemplates(@RequestParam(required = false) String category) {
        UUID clinicId = clinicContextHolder.getClinicId();
        if (category != null && !category.isBlank()) {
            return ResponseEntity.ok(repository.findByClinicIdAndCategory(clinicId, category));
        }
        return ResponseEntity.ok(repository.findByClinicId(clinicId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<ImagingTemplate> saveTemplate(@RequestBody ImagingTemplate template) {
        UUID clinicId = clinicContextHolder.getClinicId();
        template.setClinicId(clinicId);
        return ResponseEntity.ok(repository.save(template));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        UUID clinicId = clinicContextHolder.getClinicId();
        ImagingTemplate template = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Modèle introuvable"));
        if (!clinicId.equals(template.getClinicId())) {
            throw new org.springframework.security.access.AccessDeniedException("Accès non autorisé.");
        }
        repository.delete(template);
        return ResponseEntity.noContent().build();
    }
}
