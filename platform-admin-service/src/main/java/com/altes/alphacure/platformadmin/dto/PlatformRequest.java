package com.altes.alphacure.platformadmin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PlatformRequest {
    @NotBlank(message = "Le nom de la plateforme est obligatoire")
    @Size(max = 150)
    private String name;
}
