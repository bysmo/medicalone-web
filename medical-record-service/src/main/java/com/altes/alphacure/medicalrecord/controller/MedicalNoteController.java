package com.altes.alphacure.medicalrecord.controller;

import com.altes.alphacure.medicalrecord.entity.MedicalNote;
import com.altes.alphacure.medicalrecord.repository.MedicalNoteRepository;
import com.altes.alphacure.medicalrecord.security.ClinicContextHolder;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/medical/notes")
@RequiredArgsConstructor
public class MedicalNoteController {

    private final MedicalNoteRepository medicalNoteRepository;
    private final ClinicContextHolder clinicContextHolder;

    private UUID parseUUID(Object val) {
        if (val == null) return null;
        String str = val.toString().trim();
        if (str.isEmpty() || "null".equalsIgnoreCase(str) || "undefined".equalsIgnoreCase(str)) return null;
        try {
            return UUID.fromString(str);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * POST /api/v1/medical/notes
     * Body: {prestationId, patientId, consultationId(optional), observations, diagnostics, conclusions}
     * Creates or updates the medical note for the given prestation (upsert by prestationId).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('MEDECIN','ADMIN')")
    @Transactional
    public ResponseEntity<MedicalNote> saveNote(@RequestBody Map<String, String> body) {
        UUID clinicId = clinicContextHolder.getClinicId();

        UUID prestationId = parseUUID(body.get("prestationId"));
        UUID patientId = parseUUID(body.get("patientId"));
        UUID consultationId = parseUUID(body.get("consultationId"));

        if (patientId == null) {
            return ResponseEntity.badRequest().build();
        }

        MedicalNote note = null;
        if (consultationId != null) {
            note = medicalNoteRepository.findByConsultationId(consultationId).orElse(null);
        }
        if (note == null && prestationId != null) {
            List<MedicalNote> existing = medicalNoteRepository.findByPrestationId(prestationId);
            if (!existing.isEmpty()) {
                note = existing.get(0);
            }
        }
        if (note == null) {
            note = MedicalNote.builder()
                    .clinicId(clinicId)
                    .patientId(patientId)
                    .prestationId(prestationId)
                    .consultationId(consultationId)
                    .build();
        }

        note.setObservations(body.get("observations"));
        note.setDiagnostics(body.get("diagnostics"));
        note.setConclusions(body.get("conclusions"));

        return ResponseEntity.ok(medicalNoteRepository.save(note));
    }

    /**
     * GET /api/v1/medical/notes/prestation/{prestationId}
     * Returns the medical note for a given prestation.
     */
    @GetMapping("/prestation/{prestationId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<MedicalNote> getByPrestation(@PathVariable UUID prestationId) {
        List<MedicalNote> notes = medicalNoteRepository.findByPrestationId(prestationId);
        if (notes.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(notes.get(0));
    }

    /**
     * GET /api/v1/medical/notes/consultation/{consultationId}
     * Returns the medical note for a given consultation.
     */
    @GetMapping("/consultation/{consultationId}")
    @PreAuthorize("hasAnyRole('MEDECIN','INFIRMIER','ADMIN')")
    public ResponseEntity<MedicalNote> getByConsultation(@PathVariable UUID consultationId) {
        return medicalNoteRepository.findByConsultationId(consultationId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
