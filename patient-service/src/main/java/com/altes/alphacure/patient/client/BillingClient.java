package com.altes.alphacure.patient.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

/**
 * Client Feign patient-service → billing-service.
 *
 * L'en-tête Authorization (JWT) est injecté automatiquement
 * par FeignSecurityConfig.jwtFeignRequestInterceptor().
 * L'en-tête X-Clinic-Id est injecté automatiquement
 * par le même interceptor depuis le JWT courant.
 *
 * Ne plus passer Authorization ou X-Clinic-Id manuellement.
 */
@FeignClient(name = "billing-service")
public interface BillingClient {

    @GetMapping("/api/v1/cash-sessions/active")
    Map<String, Object> getActiveSession();

    @PostMapping("/api/v1/cash-sessions/transaction")
    Map<String, Object> addTransaction(@RequestBody Map<String, Object> body);

    @GetMapping("/api/v1/cash-sessions/stats")
    Map<String, Object> getCashierStats(
            @org.springframework.web.bind.annotation.RequestParam("cashierUsername") String cashierUsername,
            @org.springframework.web.bind.annotation.RequestParam("month") String month);
}
