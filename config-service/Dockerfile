# Dockerfile générique pour tous les microservices Spring Boot
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Utilisateur non-root pour la sécurité
RUN apk add --no-cache curl && \
    addgroup -S alphacure && adduser -S alphacure -G alphacure

# Copie du JAR (utiliser le profil Maven pour construire)
ARG JAR_FILE=target/*.jar
COPY ${JAR_FILE} app.jar

# Permissions
RUN chown alphacure:alphacure app.jar
USER alphacure

# Port exposé (override via docker-compose ou K8s)
EXPOSE 8080

# Options JVM pour production (Java 21 + containers)
ENV JAVA_OPTS="-XX:+UseContainerSupport \
               -XX:MaxRAMPercentage=75.0 \
               -XX:+UseG1GC \
               -XX:+HeapDumpOnOutOfMemoryError \
               -XX:HeapDumpPath=/tmp/heapdump.hprof \
               -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
