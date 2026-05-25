package com.altes.alphacure.platformadmin.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PlatformAdminResponse {
    private UUID id;
    private String username;
    private String email;
    private LocalDateTime createdAt;
}
