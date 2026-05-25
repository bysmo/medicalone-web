package com.altes.alphacure.patient.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/**
 * Convertit les rôles Keycloak du JWT en GrantedAuthority Spring Security.
 *
 * Rôles Keycloak (realm_access.roles) :
 * SUPER_ADMIN, ADMIN, MEDECIN, INFIRMIER, LABORANTIN, PHARMACIEN,
 * RECEPTIONNISTE (un seul N), CAISSIER, COMPTABLE, MAGASINIER,
 * MANAGER_CLINIQUE, GESTIONNAIRE_ASSURANCES, RH
 *
 * Spring Security hasRole('X') vérifie ROLE_X → on préfixe avec ROLE_.
 */
public class KeycloakRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private final JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = new ArrayList<>(
                defaultConverter.convert(jwt) != null ? defaultConverter.convert(jwt) : List.of());

        // Rôles Realm Keycloak → ROLE_<nom_keycloak>
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess != null && realmAccess.get("roles") instanceof List<?> roles) {
            for (Object roleObj : roles) {
                String roleName = roleObj.toString();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName));
                if ("RECEPTIONISTE".equals(roleName)) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_RECEPTIONNISTE"));
                }
            }
        }

        // Rôles Client Keycloak (resource_access.<clientId>.roles)
        Map<String, Object> resourceAccess = jwt.getClaim("resource_access");
        if (resourceAccess != null) {
            for (Map.Entry<String, Object> entry : resourceAccess.entrySet()) {
                if (entry.getValue() instanceof Map<?, ?> clientAccess
                        && clientAccess.get("roles") instanceof List<?> roles) {
                    for (Object roleObj : roles) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_" + entry.getKey() + "_" + roleObj));
                    }
                }
            }
        }

        return authorities;
    }
}
