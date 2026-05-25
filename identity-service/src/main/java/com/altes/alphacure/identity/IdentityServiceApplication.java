package com.altes.alphacure.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Identity Service — Proxy Keycloak.
 *
 * Ce service ne gère plus d'utilisateurs en base de données locale.
 * Il est le point d'entrée pour :
 *  - Login (POST /api/v1/auth/login)
 *  - Refresh token (POST /api/v1/auth/refresh)
 *  - Logout (POST /api/v1/auth/logout)
 *  - Profil courant (GET /api/v1/auth/me)
 *
 * La création et la gestion des utilisateurs Keycloak se fait
 * exclusivement via clinic-service (KeycloakAdminClient).
 */
@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class,
        HibernateJpaAutoConfiguration.class
})
@EnableDiscoveryClient
public class IdentityServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(IdentityServiceApplication.class, args);
    }
}
