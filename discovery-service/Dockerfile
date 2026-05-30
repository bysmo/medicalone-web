# ================================================================
# Multi-stage build — Maven multi-module (tous les pom.xml copiés)
# Contexte de build = RACINE du repo
# ================================================================

# === STAGE 1 : Compilation Maven ===
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

ARG SERVICE_DIR=.

WORKDIR /build

# --- Étape clé : copier TOUS les pom.xml pour que Maven puisse
#     résoudre le projet multi-module parent sans erreur ---
COPY pom.xml                              ./pom.xml
COPY config-service/pom.xml              ./config-service/pom.xml
COPY discovery-service/pom.xml           ./discovery-service/pom.xml
COPY gateway-service/pom.xml             ./gateway-service/pom.xml
COPY platform-admin-service/pom.xml      ./platform-admin-service/pom.xml
COPY clinic-service/pom.xml              ./clinic-service/pom.xml
COPY identity-service/pom.xml            ./identity-service/pom.xml
COPY patient-service/pom.xml             ./patient-service/pom.xml
COPY medical-record-service/pom.xml      ./medical-record-service/pom.xml
COPY billing-service/pom.xml             ./billing-service/pom.xml
COPY payment-service/pom.xml             ./payment-service/pom.xml
COPY session-service/pom.xml             ./session-service/pom.xml
COPY nomenclature-service/pom.xml        ./nomenclature-service/pom.xml
COPY staff-service/pom.xml               ./staff-service/pom.xml
COPY integration-test-service/pom.xml    ./integration-test-service/pom.xml

# Pré-télécharger les dépendances du service cible (optimise le cache Docker)
RUN mvn -pl ${SERVICE_DIR} dependency:go-offline -q

# Copier UNIQUEMENT les sources du service à compiler
COPY ${SERVICE_DIR}/src ./${SERVICE_DIR}/src

# Compiler uniquement ce service (-am résout les dépendances inter-modules)
RUN mvn -pl ${SERVICE_DIR} package -DskipTests -am -q

# === STAGE 2 : Runtime JRE minimal ===
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache curl && \
    addgroup -S alphacure && adduser -S alphacure -G alphacure

ARG SERVICE_DIR=.
COPY --from=builder /build/${SERVICE_DIR}/target/*.jar app.jar
RUN chown alphacure:alphacure app.jar
USER alphacure

EXPOSE 8761

ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -XX:+HeapDumpOnOutOfMemoryError \
               -XX:HeapDumpPath=/tmp/heapdump.hprof \
               -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
