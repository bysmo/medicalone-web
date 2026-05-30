# ================================================================
# Multi-stage build — Maven compile + JRE runtime
# Contexte de build = RACINE du repo (pour accéder au pom.xml parent)
# ================================================================

# === STAGE 1 : Compilation Maven ===
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

# ARG pour savoir quel sous-module compiler
ARG SERVICE_DIR=.

WORKDIR /build

# 1. Copier le pom.xml parent (à la racine du contexte de build)
COPY pom.xml ./pom.xml

# 2. Copier le pom.xml du service concerné pour pré-télécharger les dépendances
COPY ${SERVICE_DIR}/pom.xml ./${SERVICE_DIR}/pom.xml

# 3. Pré-télécharger les dépendances (optimise le cache Docker)
RUN mvn -pl ${SERVICE_DIR} dependency:go-offline -q 2>/dev/null || true

# 4. Copier les sources du service
COPY ${SERVICE_DIR}/src ./${SERVICE_DIR}/src

# 5. Compiler uniquement ce service
RUN mvn -pl ${SERVICE_DIR} package -DskipTests -am -q

# === STAGE 2 : Runtime JRE minimal ===
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Sécurité : utilisateur non-root
RUN apk add --no-cache curl && \
    addgroup -S alphacure && adduser -S alphacure -G alphacure

ARG SERVICE_DIR=.
# Copier le JAR compilé depuis le stage builder
COPY --from=builder /build/${SERVICE_DIR}/target/*.jar app.jar
RUN chown alphacure:alphacure app.jar
USER alphacure

EXPOSE 8761

# Options JVM optimisées pour containers
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -XX:+HeapDumpOnOutOfMemoryError \
               -XX:HeapDumpPath=/tmp/heapdump.hprof \
               -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
