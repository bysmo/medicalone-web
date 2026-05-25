package com.altes.alphacure.identity.security;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

public class KeycloakRoleConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

    private final JwtGrantedAuthoritiesConverter defaultConverter = new JwtGrantedAuthoritiesConverter();

    @Override
    public Collection<GrantedAuthority> convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = new ArrayList<>(
                defaultConverter.convert(jwt) != null ? defaultConverter.convert(jwt) : List.of());
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
        return authorities;
    }
}
