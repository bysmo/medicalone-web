# 🏥 Guide de Déploiement AlphaCure

Ce document fournit les instructions détaillées pour déployer l'application de microservices **AlphaCure** dans un environnement **On-Premise** (serveur physique ou machine virtuelle dédié) ou **Cloud** (Kubernetes géré).

---

## 1. Architecture Générale & Prérequis

L'application **AlphaCure** est basée sur une architecture de microservices Spring Boot orchestrés avec Spring Cloud, utilisant Keycloak pour la gestion des identités, Apache Kafka pour la messagerie asynchrone, et MySQL pour la persistance des données.

### Spécifications Matérielles Recommandées
- **Processeur** : Minimum 4 vCPUs (Recommandé : 8 vCPUs ou plus).
- **Mémoire (RAM)** : Minimum 16 Go (Recommandé : 32 Go pour faire tourner tous les services + bases de données + Keycloak + Kafka).
- **Stockage** : 50 Go SSD minimum (selon le volume de données médicales).

---

## 2. Déploiement On-Premise (avec Docker Compose)

C'est la méthode de déploiement la plus rapide et la plus simple pour des serveurs sur site ou des machines virtuelles dédiées (ex: Ubuntu Server 22.04 / 24.04).

### Étape 1 : Installer Docker et Docker Compose
Mettez à jour le système et installez Docker Engine :
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git apt-transport-https ca-certificates gnupg lsb-release

# Ajouter la clé officielle de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Configurer le dépôt stable de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

### Étape 2 : Préparer la Configuration
1. Clonez ou copiez votre code source sur le serveur de production.
2. Copiez le fichier d'environnement et ajustez les variables :
   ```bash
   cp .env.example .env
   ```
3. Modifiez le fichier `.env` pour y renseigner des mots de passe robustes (notamment pour MySQL, Keycloak admin, etc.) ainsi que les secrets Keycloak :
   ```env
   # Exemple de modifications pour la production
   MYSQL_ROOT_PASSWORD=VotreMotDePasseSQLRootSecurise
   MYSQL_PASSWORD=VotreMotDePasseSQLAlphaCureSecurise
   KEYCLOAK_ADMIN_PASSWORD=VotreMotDePasseKeycloakAdminSecurise
   KEYCLOAK_CLIENT_SECRET=SecretClientKeycloakGenere
   ```

### Étape 3 : Démarrer l'Infrastructure & les Microservices
Pour assurer la stabilité, démarrez les services dans l'ordre suivant :

1. **Bases de données et serveurs de messagerie/sécurité** :
   ```bash
   docker compose up -d mysql keycloak zookeeper kafka
   ```
   *Attendez environ 30 secondes que MySQL et Keycloak soient pleinement opérationnels.*

2. **Services d'infrastructure Spring Cloud** :
   ```bash
   docker compose up -d discovery-service config-service
   ```
   *Vérifiez les logs de `config-service` avec `docker compose logs -f config-service` pour s'assurer que le service est sain.*

3. **API Gateway et Microservices Métier** :
   ```bash
   docker compose up -d gateway-service patient-service billing-service identity-service clinic-service medical-record-service nomenclature-service payment-service session-service staff-service
   ```

4. **Interfaces Frontend** :
   ```bash
   docker compose up -d alphacure-ui alphacure-admin
   ```

### Étape 4 : Reverse Proxy & SSL (HTTPS) avec Nginx
Pour un déploiement de production, n'exposez pas directement les ports internes. Utilisez Nginx en reverse-proxy avec SSL.

1. Installez Nginx et Certbot :
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```
2. Créez un fichier de configuration Nginx pour l'application frontend et la Gateway :
   `/etc/nginx/sites-available/alphacure.conf` :
   ```nginx
   server {
       listen 80;
       server_name app.alphacure.com admin.alphacure.com api.alphacure.com keycloak.alphacure.com;

       location / {
           return 301 https://$host$request_uri;
       }
   }

   # Exemple pour le portail patient/clinique (alphacure-ui)
   server {
       listen 443 ssl;
       server_name app.alphacure.com;
       # Certificats gérés par Certbot
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }

   # Exemple pour l'API Gateway (gateway-service)
   server {
       listen 443 ssl;
       server_name api.alphacure.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Activez le site et générez les certificats SSL Let's Encrypt :
   ```bash
   sudo ln -s /etc/nginx/sites-available/alphacure.conf /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   sudo certbot --nginx -d app.alphacure.com -d admin.alphacure.com -d api.alphacure.com -d keycloak.alphacure.com
   ```

---

## 3. Déploiement Cloud (avec Kubernetes)

Pour des déploiements hautement disponibles et scalables sur des providers Cloud publics (AWS EKS, GCP GKE, Azure AKS), nous utilisons des manifestes Kubernetes.

### Architecture Cloud Recommandée
- **MySQL managé** : Remplacez le conteneur MySQL par un service managé comme AWS RDS ou GCP Cloud SQL.
- **Kafka managé** : Utilisez AWS MSK ou Confluent Cloud pour décharger la gestion de Zookeeper/Kafka.
- **Stockage Persistant** : Utilisez des volumes de type `gp3` (AWS) ou `standard-rwo` (GCP) pour Keycloak et le stockage local si nécessaire.

### Étape 1 : Configurer le Namespace, ConfigMaps et Secrets
Tous les manifestes Kubernetes sont situés dans le dossier [k8s/](file:///Users/modestemariebegninesomda/IdeaProjects/senenity/k8s).

1. Appliquez la configuration globale et les espaces de noms :
   ```bash
   kubectl apply -f k8s/00-namespace-config.yaml
   ```
2. Modifiez le Secret Kubernetes `alphacure-secrets` dans [k8s/00-namespace-config.yaml](file:///Users/modestemariebegninesomda/IdeaProjects/senenity/k8s/00-namespace-config.yaml) pour y encoder en base64 vos mots de passe de production réels :
   ```bash
   echo -n "MonMotDePasseSQLAlphaCureSecurise" | base64
   ```

### Étape 2 : Déployer les StatefulSets (Bases de données / Message Broker)
Si vous n'utilisez pas de services managés Cloud et préférez installer les bases de données dans votre cluster :
```bash
kubectl apply -f k8s/02-statefulsets.yaml
```
Cela déploie :
- MySQL (StatefulSet pour la persistance des volumes)
- Kafka et Zookeeper

### Étape 3 : Déployer les Microservices et les Frontends
Déployez ensuite le registre de découverte Eureka, le serveur de configuration centralisé, l'API Gateway, puis tous les microservices métiers :
```bash
kubectl apply -f k8s/01-deployments.yaml
```

### Étape 4 : Gestion de l'Ingress et DNS
Configurez un **Ingress Controller** (ex: `ingress-nginx`) pour exposer les points d'entrée externes :
1. Installer Ingress-NGINX :
   ```bash
   kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
   ```
2. Associez vos noms de domaine (ex: `app.alphacure.com`, `api.alphacure.com`) à l'adresse IP publique attribuée au LoadBalancer de l'Ingress Controller.

---

## 4. Maintenance & Opérations

### 1. Sauvegarde des Bases de Données (MySQL)
Configurez une tâche Cron de sauvegarde pour extraire régulièrement les dumps de vos bases MySQL :
```bash
# Sauvegarde locale (Docker Compose)
docker exec alphacure-mysql mysqldump -u alphacure -pVotreMotDePasse alphacure_db > backup_$(date +%F).sql
```

### 2. Surveillance des messages Kafka
Le service `kafka-ui` est disponible sur le port `9000` (déploiement Docker Compose). Il permet de surveiller l'état des messages échangés entre les microservices (`patient.created`, `invoice.created`, etc.) et de gérer les groupes de consommateurs.
