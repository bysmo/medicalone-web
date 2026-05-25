package com.altes.alphacure.clinic.service;

import com.altes.alphacure.clinic.dto.ClinicNumberingRuleDto;
import com.altes.alphacure.clinic.dto.ClinicNumberingUpdateRequest;
import com.altes.alphacure.clinic.dto.NumberingSegmentDto;
import com.altes.alphacure.clinic.entity.ClinicNumberingRule;
import com.altes.alphacure.clinic.entity.NumberingDocumentType;
import com.altes.alphacure.clinic.entity.NumberingSegmentType;
import com.altes.alphacure.clinic.repository.ClinicNumberingRuleRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ClinicNumberingService {

    private final ClinicNumberingRuleRepository numberingRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public List<ClinicNumberingRuleDto> getNumberingRules(UUID clinicId) {
        ensureDefaultNumbering(clinicId);
        return numberingRepository.findByClinicIdOrderByDocumentTypeAsc(clinicId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public List<ClinicNumberingRuleDto> updateNumberingRules(UUID clinicId, ClinicNumberingUpdateRequest request) {
        if (request.getRules() == null || request.getRules().isEmpty()) {
            throw new IllegalArgumentException("Au moins une règle de numérotation est requise.");
        }
        for (ClinicNumberingRuleDto dto : request.getRules()) {
            validateSegments(dto.getSegments());
            ClinicNumberingRule rule = numberingRepository
                    .findByClinicIdAndDocumentType(clinicId, dto.getDocumentType())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Règle introuvable : " + dto.getDocumentType()));
            rule.setSegmentsJson(writeSegments(dto.getSegments()));
            if (dto.getNextSequence() != null && dto.getNextSequence() > 0) {
                rule.setNextSequence(dto.getNextSequence());
            }
            if (dto.getActive() != null) {
                rule.setActive(dto.getActive());
            }
            numberingRepository.save(rule);
        }
        return getNumberingRules(clinicId);
    }

    @Transactional
    public void ensureDefaultNumbering(UUID clinicId) {
        if (numberingRepository.existsByClinicId(clinicId)) {
            return;
        }
        for (NumberingDocumentType type : NumberingDocumentType.values()) {
            numberingRepository.save(ClinicNumberingRule.builder()
                    .clinicId(clinicId)
                    .documentType(type)
                    .segmentsJson(writeSegments(defaultSegmentsFor(type)))
                    .nextSequence(1L)
                    .active(true)
                    .build());
        }
        numberingRepository.flush();
    }

    @Transactional
    public synchronized String generateNextNumber(UUID clinicId, NumberingDocumentType documentType) {
        ensureDefaultNumbering(clinicId);
        ClinicNumberingRule rule = numberingRepository
                .findByClinicIdAndDocumentType(clinicId, documentType)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Règle de numérotation introuvable pour la clinique : " + clinicId + " et le type : " + documentType));
        if (!Boolean.TRUE.equals(rule.getActive())) {
            throw new IllegalStateException("La règle de numérotation est inactive : " + documentType);
        }
        List<NumberingSegmentDto> segments = readSegments(rule.getSegmentsJson());
        long seq = rule.getNextSequence();
        String generatedNumber = buildPreview(segments, seq);
        rule.setNextSequence(seq + 1);
        numberingRepository.save(rule);
        return generatedNumber;
    }

    public String buildPreview(List<NumberingSegmentDto> segments, long nextSequence) {
        LocalDate today = LocalDate.now();
        StringBuilder sb = new StringBuilder();
        for (NumberingSegmentDto seg : segments) {
            if (seg.getType() == null) continue;
            switch (seg.getType()) {
                case INCREMENT -> {
                    int pad = seg.getPadLength() != null && seg.getPadLength() > 0 ? seg.getPadLength() : 5;
                    sb.append(String.format("%0" + pad + "d", nextSequence));
                }
                case DAY -> sb.append(String.format("%02d", today.getDayOfMonth()));
                case MONTH -> sb.append(String.format("%02d", today.getMonthValue()));
                case YEAR -> sb.append(today.getYear());
                case YEAR_SHORT -> sb.append(String.format("%02d", today.getYear() % 100));
                case SEPARATOR, LITERAL -> {
                    if (seg.getValue() != null) sb.append(seg.getValue());
                }
                default -> { /* ignore */ }
            }
        }
        return sb.toString();
    }

    private List<NumberingSegmentDto> defaultSegmentsFor(NumberingDocumentType type) {
        return switch (type) {
            case PATIENT_DOSSIER -> segments(
                    literal("DOS-"), year(), sep("-"), increment(5));
            case STAFF_MATRICULE -> segments(
                    literal("MAT-"), year(), sep("-"), increment(4));
            case CASH_RECEIPT -> segments(
                    literal("REC-"), year(), month(), sep("-"), increment(6));
            case INSURANCE_INVOICE -> segments(
                    literal("FASS-"), year(), sep("-"), increment(5));
            case PATIENT_INVOICE -> segments(
                    literal("FAC-"), year(), sep("-"), increment(5));
            case PRESTATION -> segments(
                    literal("PREST-"), yearShort(), month(), day(), sep("-"), increment(4));
            case CONSULTATION -> segments(
                    literal("CONS-"), year(), month(), day(), sep("-"), increment(4));
        };
    }

    private static List<NumberingSegmentDto> segments(NumberingSegmentDto... items) {
        return new ArrayList<>(Arrays.asList(items));
    }

    private static NumberingSegmentDto literal(String v) {
        return NumberingSegmentDto.builder().type(NumberingSegmentType.LITERAL).value(v).build();
    }

    private static NumberingSegmentDto sep(String v) {
        return NumberingSegmentDto.builder().type(NumberingSegmentType.SEPARATOR).value(v).build();
    }

    private static NumberingSegmentDto increment(int pad) {
        return NumberingSegmentDto.builder().type(NumberingSegmentType.INCREMENT).padLength(pad).build();
    }

    private static NumberingSegmentDto year() {
        return NumberingSegmentDto.builder().type(NumberingSegmentType.YEAR).build();
    }

    private static NumberingSegmentDto yearShort() {
        return NumberingSegmentDto.builder().type(NumberingSegmentType.YEAR_SHORT).build();
    }

    private static NumberingSegmentDto month() {
        return NumberingSegmentDto.builder().type(NumberingSegmentType.MONTH).build();
    }

    private static NumberingSegmentDto day() {
        return NumberingSegmentDto.builder().type(NumberingSegmentType.DAY).build();
    }

    private void validateSegments(List<NumberingSegmentDto> segments) {
        if (segments == null || segments.isEmpty()) {
            throw new IllegalArgumentException("La numérotation doit contenir au moins un segment.");
        }
        boolean hasIncrement = segments.stream()
                .anyMatch(s -> s.getType() == NumberingSegmentType.INCREMENT);
        if (!hasIncrement) {
            throw new IllegalArgumentException("Ajoutez au moins un segment « Compteur séquentiel ».");
        }
    }

    private ClinicNumberingRuleDto toDto(ClinicNumberingRule rule) {
        List<NumberingSegmentDto> segments = readSegments(rule.getSegmentsJson());
        return ClinicNumberingRuleDto.builder()
                .id(rule.getId())
                .documentType(rule.getDocumentType())
                .documentLabel(rule.getDocumentType().getLabel())
                .segments(segments)
                .nextSequence(rule.getNextSequence())
                .active(rule.getActive())
                .preview(Boolean.TRUE.equals(rule.getActive())
                        ? buildPreview(segments, rule.getNextSequence())
                        : "(inactive)")
                .build();
    }

    private String writeSegments(List<NumberingSegmentDto> segments) {
        try {
            return objectMapper.writeValueAsString(segments);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Segments de numérotation invalides", e);
        }
    }

    private List<NumberingSegmentDto> readSegments(String json) {
        if (json == null || json.isBlank()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return new ArrayList<>();
        }
    }
}
