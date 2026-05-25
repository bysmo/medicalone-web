package com.altes.alphacure.platformadmin.controller;

import com.altes.alphacure.platformadmin.dto.*;
import com.altes.alphacure.platformadmin.service.PlatformAdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/platform-admin")
@RequiredArgsConstructor
@Tag(name = "Platform Admin", description = "Gestion de la plateforme et des administrateurs")
public class PlatformAdminController {

    private final PlatformAdminService service;

    // ---- Platforms ----

    @PostMapping("/platforms")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Créer une plateforme")
    public ResponseEntity<PlatformResponse> createPlatform(@Valid @RequestBody PlatformRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createPlatform(request));
    }

    @GetMapping("/platforms")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Lister toutes les plateformes")
    public ResponseEntity<List<PlatformResponse>> getAllPlatforms() {
        return ResponseEntity.ok(service.getAllPlatforms());
    }

    @GetMapping("/platforms/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Obtenir une plateforme par ID")
    public ResponseEntity<PlatformResponse> getPlatform(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getPlatformById(id));
    }

    @DeleteMapping("/platforms/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Supprimer une plateforme")
    public ResponseEntity<Void> deletePlatform(@PathVariable UUID id) {
        service.deletePlatform(id);
        return ResponseEntity.noContent().build();
    }

    // ---- Admins ----

    @PostMapping("/admins")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Créer un administrateur de plateforme")
    public ResponseEntity<PlatformAdminResponse> createAdmin(@Valid @RequestBody PlatformAdminRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createAdmin(request));
    }

    @GetMapping("/admins")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Lister tous les administrateurs")
    public ResponseEntity<List<PlatformAdminResponse>> getAllAdmins() {
        return ResponseEntity.ok(service.getAllAdmins());
    }

    @GetMapping("/admins/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Obtenir un admin par ID")
    public ResponseEntity<PlatformAdminResponse> getAdmin(@PathVariable UUID id) {
        return ResponseEntity.ok(service.getAdminById(id));
    }
}
