package com.altes.alphacure.staff.config;

import com.altes.alphacure.staff.security.ClinicContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.hibernate.Session;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.security.access.AccessDeniedException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ClinicFilterInterceptor implements HandlerInterceptor {

    private final ClinicContextHolder clinicContextHolder;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        try {
            UUID clinicId = clinicContextHolder.getClinicId();
            
            // Récupère la session Hibernate native
            Session session = entityManager.unwrap(Session.class);
            
            // Active le filtre défini dans vos entités
            session.enableFilter("clinicFilter")
                   .setParameter("clinicId", clinicId);
                   
        } catch (AccessDeniedException e) {
            // Gestion si pas de contexte (ex: endpoint public ou healthcheck)
            // Vous pouvez choisir de bloquer ou de laisser passer sans filtre
            return true; 
        }
        return true;
    }
}
