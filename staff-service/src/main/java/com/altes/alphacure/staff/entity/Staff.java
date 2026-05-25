package com.altes.alphacure.staff.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;

@Entity
@Table(name = "staff")
@FilterDef(name = "clinicFilter", parameters = @ParamDef(name = "clinicId", type = UUID.class))
@Filter(name = "clinicFilter", condition = "clinic_id = :clinicId")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID clinicId;

    @Column(name = "matricule", length = 50)
    private String matricule;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "type_id", columnDefinition = "CHAR(36)")
    private UUID typeId;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email", length = 150)
    private String email;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
