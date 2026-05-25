package com.altes.alphacure.clinic.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Profil étendu de la clinique : branding, fiscal, bancaire, impressions, web & réseaux.
 * Une ligne par clinique (clinic_id unique).
 */
@Entity
@Table(name = "clinic_profiles", uniqueConstraints = {
        @UniqueConstraint(name = "uk_clinic_profiles_clinic_id", columnNames = "clinic_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID id;

    @Column(name = "clinic_id", nullable = false, columnDefinition = "CHAR(36)")
    @org.hibernate.annotations.JdbcTypeCode(java.sql.Types.VARCHAR)
    private UUID clinicId;

    // ── Identité & branding ───────────────────────────────────────────────────
    @Column(name = "legal_name", length = 200)
    private String legalName;

    @Column(name = "slogan", length = 300)
    private String slogan;

    @Column(name = "logo_data_url", columnDefinition = "LONGTEXT")
    private String logoDataUrl;

    @Column(name = "currency_code", length = 10)
    @Builder.Default
    private String currencyCode = "XOF";

    @Column(name = "currency_symbol", length = 10)
    @Builder.Default
    private String currencySymbol = "FCFA";

    // ── Coordonnées étendues ──────────────────────────────────────────────────
    @Column(name = "postal_code", length = 20)
    private String postalCode;

    @Column(name = "region", length = 100)
    private String region;

    @Column(name = "contact_email", length = 150)
    private String contactEmail;

    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    @Column(name = "whatsapp_number", length = 50)
    private String whatsappNumber;

    @Column(name = "website_url", length = 300)
    private String websiteUrl;

    // ── Fiscal & juridique ────────────────────────────────────────────────────
    @Column(name = "legal_regime", length = 100)
    private String legalRegime;

    @Column(name = "tax_identification_number", length = 80)
    private String taxIdentificationNumber;

    @Column(name = "vat_number", length = 80)
    private String vatNumber;

    @Column(name = "trade_register_number", length = 80)
    private String tradeRegisterNumber;

    @Column(name = "fiscal_year_end", length = 20)
    private String fiscalYearEnd;

    @Column(name = "fiscal_notes", columnDefinition = "TEXT")
    private String fiscalNotes;

    // ── Comptes bancaires (JSON array) ────────────────────────────────────────
    @Column(name = "bank_accounts_json", columnDefinition = "TEXT")
    private String bankAccountsJson;

    // ── En-têtes / pieds de page impressions (images base64) ───────────────────
    @Column(name = "print_header_a4", columnDefinition = "LONGTEXT")
    private String printHeaderA4;

    @Column(name = "print_footer_a4", columnDefinition = "LONGTEXT")
    private String printFooterA4;

    @Column(name = "print_header_a5", columnDefinition = "LONGTEXT")
    private String printHeaderA5;

    @Column(name = "print_footer_a5", columnDefinition = "LONGTEXT")
    private String printFooterA5;

    // ── Réseaux sociaux (JSON object) ─────────────────────────────────────────
    @Column(name = "social_links_json", columnDefinition = "TEXT")
    private String socialLinksJson;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
