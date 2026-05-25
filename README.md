# 🏥 AlphaCureClinic — Plateforme SAAS Microservices

> Application de gestion de clinique multi-tenant construite avec Java 21, Spring Boot 3, Spring Cloud, Kafka et Keycloak.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │           API Gateway (port 8080)            │
                    │         Spring Cloud Gateway + OAuth2         │
                    └──────────────────┬──────────────────────────┘
                                       │
              ┌────────────────────────┼──────────────────────────┐
              │                        │                           │
    ┌─────────▼──────────┐  ┌──────────▼──────────┐  ┌──────────▼──────────┐
    │  Discovery Service  │  │   Config Service     │  │   Keycloak (8180)   │
    │  Eureka (8761)      │  │   Spring Cloud (8888)│  │   OAuth2 / JWT       │
    └─────────────────────┘  └──────────────────────┘  └─────────────────────┘
              │
    ╔═════════╧═══════════════════════════════════════════════════════╗
    ║                    MICROSERVICES MÉTIER                         ║
    ╠═══════════════════╦═════════════════════════════════════════════╣
    ║ platform-admin(81)║ clinic-service (82) │ identity-service (83) ║
    ╠═══════════════════╬═════════════════════════════════════════════╣
    ║ patient (84)      ║ medical-record (85) │ billing (86)          ║
    ╠═══════════════════╬═════════════════════════════════════════════╣
    ║ payment (87)      ║ session (88)        │ nomenclature (89)     ║
    ╠═══════════════════╬═════════════════════════════════════════════╣
    ║ staff (90)        ║                                             ║
    ╚═══════════════════╩═════════════════════════════════════════════╝
              │
    ┌─────────┴─────────────────────────────────────────────────────┐
    │                     INFRASTRUCTURE                             │
    │   MySQL 8 · Kafka + Zookeeper · Kafka UI                      │
    └───────────────────────────────────────────────────────────────┘
```

## Stack Technique

| Composant | Technologie |
|---|---|
| Runtime | Java 21 |
| Framework | Spring Boot 3.3.5 |
| Cloud | Spring Cloud 2023.0.3 |
| Base de données | MySQL 8.0 (1 DB par service) |
| Messaging | Apache Kafka |
| Auth | Keycloak 24 (OAuth2 + JWT) |
| Communication sync | OpenFeign + Resilience4j |
| API Docs | SpringDoc OpenAPI (Swagger UI) |
| ORM | Spring Data JPA + Hibernate |
| Mapping | MapStruct |
| Boilerplate | Lombok |
| Containerisation | Docker + Kubernetes |

## Démarrage Rapide

### Prérequis
- Java 21+
- Maven 3.9+
- Docker + Docker Compose

### 1. Configuration
```bash
cp .env.example .env
# Éditez .env selon votre environnement
```

### 2. Démarrage en mode développement
```bash
docker-compose up -d mysql zookeeper kafka keycloak
# Attendez que les services soient sains, puis :
docker-compose up -d config-service discovery-service gateway-service
# Enfin les services métier :
docker-compose up -d
```

### 3. Build Maven (tous les modules)
```bash
mvn clean package -DskipTests
```

## Microservices

| Service | Port | Base | Description |
|---|---|---|---|
| config-service | 8888 | — | Spring Cloud Config Server |
| discovery-service | 8761 | — | Eureka Service Registry |
| gateway-service | 8080 | — | API Gateway (JWT validation) |
| platform-admin-service | 8081 | db_platform | Gestion plateforme |
| clinic-service | 8082 | db_clinic | Gestion cliniques + abonnements |
| identity-service | 8083 | db_identity | RBAC + utilisateurs |
| patient-service | 8084 | db_patient | Patients + assurances |
| medical-record-service | 8085 | db_medical | Dossiers médicaux |
| billing-service | 8086 | db_billing | Facturation multi-niveaux |
| payment-service | 8087 | db_payment | Caisses + encaissements |
| session-service | 8088 | db_session | Packs de séances |
| nomenclature-service | 8089 | db_nomenclature | Table paramétrique dynamique |
| staff-service | 8090 | db_staff | Gestion personnel |

## Topics Kafka

| Topic | Producer | Consumers |
|---|---|---|
| `patient.created` | patient-service | medical-record-service, billing-service |
| `invoice.created` | billing-service | payment-service, medical-record-service |
| `payment.completed` | payment-service | billing-service, session-service |
| `session.used` | session-service | medical-record-service, billing-service |

## Règles Métier

| Contrainte | Implémentation |
|---|---|
| 1 patient = 1 dossier médical | `@UniqueConstraint(patient_id, clinic_id)` + Kafka consumer |
| Pas de double facturation | `InvoiceService.existsByPatientIdAndStatusIn()` |
| Caisse ouverte pour encaisser | `CashRegister.status == OPEN` vérifié avant payment |
| Séances progressives | `remainingSessions--` atomique en transaction |
| Isolation clinic | `clinicId` extrait du JWT → filtrage dans tous les repositories |

## Sécurité

- **JWT Claims requis** : `clinic_id`, `user_id`, `access_level`, `roles`
- **ClinicContextHolder** : Bean Spring extrayant le contexte de chaque requête
- **access_level (0-10)** : Contrôle la visibilité des données sensibles
- **RBAC** : `@PreAuthorize("hasRole('ADMIN')")` sur chaque endpoint

## Interfaces Swagger

- Gateway : http://localhost:8080/swagger-ui.html
- Patient : http://localhost:8084/swagger-ui.html
- Billing : http://localhost:8086/swagger-ui.html
- Kafka UI : http://localhost:8090

## Kubernetes

```bash
kubectl apply -f k8s/00-namespace-config.yaml
kubectl apply -f k8s/02-statefulsets.yaml
kubectl apply -f k8s/01-deployments.yaml
```

## Structure du Projet

```
alphacure/
├── pom.xml                           # Parent POM multi-module
├── docker-compose.yml                # Orchestration locale
├── .env.example                      # Template configuration
├── Dockerfile.template               # Dockerfile générique
├── k8s/                              # Manifestes Kubernetes
│   ├── 00-namespace-config.yaml
│   ├── 01-deployments.yaml
│   └── 02-statefulsets.yaml
├── docker/mysql/init/                # Scripts init MySQL
├── config-service/                   # Spring Cloud Config
├── discovery-service/                # Eureka
├── gateway-service/                  # API Gateway
├── platform-admin-service/           # Gestion plateforme
├── clinic-service/                   # Gestion cliniques
├── identity-service/                 # Auth + RBAC
├── patient-service/                  # Patients + assurances
├── medical-record-service/           # Dossiers médicaux
├── billing-service/                  # Facturation
├── payment-service/                  # Paiements + caisses
├── session-service/                  # Packs de séances
├── nomenclature-service/             # Table paramétrique
└── staff-service/                    # Personnel
```
