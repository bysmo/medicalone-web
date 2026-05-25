package com.altes.alphacure.platformadmin.mapper;

import com.altes.alphacure.platformadmin.dto.PlatformRequest;
import com.altes.alphacure.platformadmin.dto.PlatformResponse;
import com.altes.alphacure.platformadmin.entity.Platform;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface PlatformMapper {
    Platform toEntity(PlatformRequest request);
    PlatformResponse toResponse(Platform platform);
}
