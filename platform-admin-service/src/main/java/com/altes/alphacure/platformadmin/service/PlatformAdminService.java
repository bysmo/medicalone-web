package com.altes.alphacure.platformadmin.service;

import com.altes.alphacure.platformadmin.dto.PlatformAdminRequest;
import com.altes.alphacure.platformadmin.dto.PlatformAdminResponse;
import com.altes.alphacure.platformadmin.dto.PlatformRequest;
import com.altes.alphacure.platformadmin.dto.PlatformResponse;
import com.altes.alphacure.platformadmin.entity.Platform;
import com.altes.alphacure.platformadmin.entity.PlatformAdmin;
import com.altes.alphacure.platformadmin.exception.ResourceAlreadyExistsException;
import com.altes.alphacure.platformadmin.exception.ResourceNotFoundException;
import com.altes.alphacure.platformadmin.mapper.PlatformMapper;
import com.altes.alphacure.platformadmin.repository.PlatformAdminRepository;
import com.altes.alphacure.platformadmin.repository.PlatformRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PlatformAdminService {

    private final PlatformRepository platformRepository;
    private final PlatformAdminRepository platformAdminRepository;
    private final PlatformMapper platformMapper;
    private final PasswordEncoder passwordEncoder;

    // ---- Platform CRUD ----

    public PlatformResponse createPlatform(PlatformRequest request) {
        Platform platform = platformMapper.toEntity(request);
        Platform saved = platformRepository.save(platform);
        log.info("Platform créée: {}", saved.getId());
        return platformMapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PlatformResponse> getAllPlatforms() {
        return platformRepository.findAll().stream()
                .map(platformMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PlatformResponse getPlatformById(UUID id) {
        Platform platform = platformRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Platform non trouvée: " + id));
        return platformMapper.toResponse(platform);
    }

    public void deletePlatform(UUID id) {
        if (!platformRepository.existsById(id)) {
            throw new ResourceNotFoundException("Platform non trouvée: " + id);
        }
        platformRepository.deleteById(id);
    }

    // ---- Platform Admin CRUD ----

    public PlatformAdminResponse createAdmin(PlatformAdminRequest request) {
        if (platformAdminRepository.existsByUsername(request.getUsername())) {
            throw new ResourceAlreadyExistsException("Username déjà utilisé: " + request.getUsername());
        }
        if (request.getEmail() != null && platformAdminRepository.existsByEmail(request.getEmail())) {
            throw new ResourceAlreadyExistsException("Email déjà utilisé");
        }
        PlatformAdmin admin = PlatformAdmin.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .build();
        PlatformAdmin saved = platformAdminRepository.save(admin);
        log.info("Admin plateforme créé: {}", saved.getId());
        return toAdminResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PlatformAdminResponse> getAllAdmins() {
        return platformAdminRepository.findAll().stream()
                .map(this::toAdminResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PlatformAdminResponse getAdminById(UUID id) {
        PlatformAdmin admin = platformAdminRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin non trouvé: " + id));
        return toAdminResponse(admin);
    }

    private PlatformAdminResponse toAdminResponse(PlatformAdmin admin) {
        PlatformAdminResponse response = new PlatformAdminResponse();
        response.setId(admin.getId());
        response.setUsername(admin.getUsername());
        response.setEmail(admin.getEmail());
        response.setCreatedAt(admin.getCreatedAt());
        return response;
    }
}
