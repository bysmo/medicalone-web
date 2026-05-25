#!/bin/bash
# ================================================================
# AlphaCureClinic — Script de démarrage
# Utilise docker compose (v2 — sans tiret)
# ================================================================

set -e

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🏥 AlphaCureClinic — Démarrage${NC}"
echo "========================================"

# Vérification Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé.${NC}"
    echo ""
    echo "Installation via Homebrew :"
    echo "  brew install --cask docker"
    echo ""
    echo "Ou téléchargez Docker Desktop :"
    echo "  https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Vérification docker compose v2
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ docker compose (v2) non disponible.${NC}"
    echo "Mettez à jour Docker Desktop vers la dernière version."
    exit 1
fi

echo -e "${GREEN}✅ Docker $(docker --version)${NC}"
echo -e "${GREEN}✅ $(docker compose version)${NC}"
echo ""

# Copie .env si nécessaire
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Fichier .env manquant — copie depuis .env.example${NC}"
    cp .env.example .env
    echo "📝 .env créé. Éditez-le si nécessaire."
fi

# Étape 1 — Infrastructure
echo ""
echo -e "${GREEN}▶ Étape 1/3 — Démarrage infrastructure (MySQL, Kafka, Keycloak)...${NC}"
docker compose up -d mysql zookeeper kafka keycloak

echo "⏳ Attente santé MySQL (30s)..."
sleep 30

# Étape 2 — Spring Cloud
echo ""
echo -e "${GREEN}▶ Étape 2/3 — Démarrage Spring Cloud (Config, Discovery, Gateway)...${NC}"
docker compose up -d config-service discovery-service gateway-service

echo "⏳ Attente démarrage services cloud (20s)..."
sleep 20

# Étape 3 — Microservices métier
echo ""
echo -e "${GREEN}▶ Étape 3/3 — Démarrage microservices métier...${NC}"
docker compose up -d

echo ""
echo -e "${GREEN}✅ AlphaCureClinic démarré !${NC}"
echo ""
echo "🔗 URLs disponibles :"
echo "  • API Gateway    : http://localhost:8080"
echo "  • Eureka UI      : http://localhost:8761"
echo "  • Keycloak       : http://localhost:8180"
echo "  • Kafka UI       : http://localhost:8090"
echo "  • Swagger Patient: http://localhost:8084/swagger-ui.html"
echo ""
echo "📋 Statut des conteneurs :"
docker compose ps
