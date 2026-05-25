package com.altes.alphacure.test;

import net.datafaker.Faker;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class TestOrchestrator {
    private final WebClient webClient;
    private final Faker faker = new Faker();
    private final String CLINIC_ID = "8f7d9a1c-5b2e-4d3f-a1b2-c3d4e5f6f7e8";

    public TestOrchestrator(WebClient webClient) {
        this.webClient = webClient;
    }

    public Map<String, Object> runFullCycle(int patientCount) {
        Map<String, Object> results = new HashMap<>();
        results.put("status", "STARTED");
        results.put("patients_to_create", patientCount);

        int successCount = 0;
        for (int i = 0; i < patientCount; i++) {
            try {
                createRandomPatient().block();
                successCount++;
            } catch (Exception e) {
                System.err.println("Error creating patient: " + e.getMessage());
            }
        }

        results.put("patients_created", successCount);
        results.put("status", "COMPLETED");
        return results;
    }

    private Mono<Void> createRandomPatient() {
        Map<String, Object> patient = new HashMap<>();
        patient.put("firstName", faker.name().firstName());
        patient.put("lastName", faker.name().lastName());
        patient.put("gender", faker.options().option("M", "F"));
        patient.put("phone1", faker.phoneNumber().cellPhone());
        patient.put("dossierNumber", "TEST-" + faker.number().digits(5));
        patient.put("ssn", faker.idNumber().valid());
        patient.put("isActive", true);

        // Champs Assurance
        patient.put("insurer", faker.options().option("SONAR", "UAB"));
        patient.put("subscriber", faker.options().option("SONABEL", "ONEA"));
        patient.put("policyNumber", "POL-" + faker.number().digits(6));
        patient.put("coverageRate", faker.number().numberBetween(70, 100));
        patient.put("insuranceStartDate", LocalDate.now());
        patient.put("insuranceEndDate", LocalDate.now().plusYears(1));

        return webClient.post()
                .uri("/api/v1/patients")
                .header("X-Clinic-Id", CLINIC_ID)
                .bodyValue(patient)
                .retrieve()
                .bodyToMono(Void.class);
    }
}
