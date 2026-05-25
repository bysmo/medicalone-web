package com.altes.alphacure.patient.service;

import com.altes.alphacure.patient.client.ClinicClient;
import com.altes.alphacure.patient.client.NumberingDocumentType;
import com.altes.alphacure.patient.dto.PatientRequest;
import com.altes.alphacure.patient.dto.PatientResponse;
import com.altes.alphacure.patient.entity.Patient;
import com.altes.alphacure.patient.event.PatientCreatedEvent;
import com.altes.alphacure.patient.exception.PatientNotFoundException;
import com.altes.alphacure.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PatientService {

    private static final String TOPIC_PATIENT_CREATED = "patient.created";
    private final PatientRepository patientRepository;
    private final KafkaTemplate<String, PatientCreatedEvent> kafkaTemplate;
    private final ClinicClient clinicClient;

    public PatientResponse createPatient(UUID clinicId, PatientRequest request) {
        String code = generatePatientCode(clinicId);
        while (patientRepository.existsByPatientCodeAndClinicId(code, clinicId)) {
            code = generatePatientCode(clinicId);
        }

        String dossierNumber = request.getDossierNumber();
        if (dossierNumber == null || dossierNumber.isBlank()) {
            try {
                dossierNumber = clinicClient.getNextNumber(NumberingDocumentType.PATIENT_DOSSIER, null);
            } catch (Exception e) {
                log.error("[Patient] Échec génération numéro dossier automatique: {}", e.getMessage());
            }
        }

        Patient patient = Patient.builder()
                .clinicId(clinicId)
                .patientCode(code)
                .dossierNumber(dossierNumber)
                .ssn(request.getSsn())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .gender(request.getGender())
                .birthDate(request.getBirthDate())
                .birthPlace(request.getBirthPlace())
                .phone1(request.getPhone1())
                .phone2(request.getPhone2())
                .phone3(request.getPhone3())
                .email(request.getEmail())
                .address(request.getAddress())
                .insurer(request.getInsurer())
                .subscriber(request.getSubscriber())
                .mainInsured(request.getMainInsured())
                .policyNumber(request.getPolicyNumber())
                .coverageRate(request.getCoverageRate())
                .insuranceStartDate(request.getInsuranceStartDate())
                .insuranceEndDate(request.getInsuranceEndDate())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .accessLevel(0)
                .build();

        Patient saved = patientRepository.save(patient);
        log.info("Patient créé: {} avec dossier: {}", saved.getId(), saved.getDossierNumber());

        PatientCreatedEvent event = PatientCreatedEvent.builder()
                .patientId(saved.getId()).clinicId(clinicId).patientCode(saved.getPatientCode())
                .firstName(saved.getFirstName()).lastName(saved.getLastName()).createdAt(LocalDateTime.now())
                .build();
        kafkaTemplate.send(TOPIC_PATIENT_CREATED, saved.getId().toString(), event);

        return toResponse(saved);
    }

    public PatientResponse updatePatient(UUID clinicId, UUID id, PatientRequest request) {
        Patient patient = patientRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new PatientNotFoundException("Patient non trouvé: " + id));

        patient.setFirstName(request.getFirstName());
        patient.setLastName(request.getLastName());
        patient.setGender(request.getGender());
        patient.setBirthDate(request.getBirthDate());
        patient.setBirthPlace(request.getBirthPlace());
        patient.setPhone1(request.getPhone1());
        patient.setPhone2(request.getPhone2());
        patient.setPhone3(request.getPhone3());
        patient.setEmail(request.getEmail());
        patient.setAddress(request.getAddress());
        patient.setDossierNumber(request.getDossierNumber());
        patient.setSsn(request.getSsn());
        patient.setInsurer(request.getInsurer());
        patient.setSubscriber(request.getSubscriber());
        patient.setMainInsured(request.getMainInsured());
        patient.setPolicyNumber(request.getPolicyNumber());
        patient.setCoverageRate(request.getCoverageRate());
        patient.setInsuranceStartDate(request.getInsuranceStartDate());
        patient.setInsuranceEndDate(request.getInsuranceEndDate());
        if (request.getIsActive() != null) patient.setIsActive(request.getIsActive());

        return toResponse(patientRepository.save(patient));
    }

    @Transactional(readOnly = true)
    public Page<PatientResponse> getPatients(UUID clinicId, String search, Pageable pageable) {
        if (StringUtils.hasText(search)) {
            return patientRepository.searchByClinicId(clinicId, search, pageable).map(this::toResponse);
        }
        return patientRepository.findAllByClinicId(clinicId, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public PatientResponse getPatientById(UUID clinicId, UUID id) {
        Patient patient = patientRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new PatientNotFoundException("Patient non trouvé: " + id));
        return toResponse(patient);
    }

    public void deletePatient(UUID clinicId, UUID id) {
        Patient patient = patientRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> new PatientNotFoundException("Patient non trouvé: " + id));
        patientRepository.delete(patient);
    }

    private String generatePatientCode(UUID clinicId) {
        String suffix = String.format("%06d", (patientRepository.countByClinicId(clinicId) + 1));
        return "PAT-" + suffix;
    }

    private PatientResponse toResponse(Patient patient) {
        PatientResponse response = new PatientResponse();
        response.setId(patient.getId());
        response.setPatientCode(patient.getPatientCode());
        response.setDossierNumber(patient.getDossierNumber());
        response.setSsn(patient.getSsn());
        response.setFirstName(patient.getFirstName());
        response.setLastName(patient.getLastName());
        response.setFullName(patient.getFullName());
        response.setGender(patient.getGender());
        response.setBirthDate(patient.getBirthDate());
        response.setBirthPlace(patient.getBirthPlace());
        response.setPhone1(patient.getPhone1());
        response.setPhone2(patient.getPhone2());
        response.setPhone3(patient.getPhone3());
        response.setEmail(patient.getEmail());
        response.setAddress(patient.getAddress());
        response.setInsurer(patient.getInsurer());
        response.setSubscriber(patient.getSubscriber());
        response.setMainInsured(patient.getMainInsured());
        response.setPolicyNumber(patient.getPolicyNumber());
        response.setCoverageRate(patient.getCoverageRate());
        response.setInsuranceStartDate(patient.getInsuranceStartDate());
        response.setInsuranceEndDate(patient.getInsuranceEndDate());
        response.setIsActive(patient.getIsActive());
        response.setCreatedAt(patient.getCreatedAt());
        return response;
    }
}
