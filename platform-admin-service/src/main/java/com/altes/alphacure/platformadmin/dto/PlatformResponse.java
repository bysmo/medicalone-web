package com.altes.alphacure.platformadmin.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class PlatformResponse {
    private UUID id;
    private String name;
    private LocalDateTime createdAt;
}
