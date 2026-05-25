-- ================================================================
-- AlphaCureClinic — Init MySQL Script
-- Création des bases de données pour chaque microservice
-- ================================================================

CREATE DATABASE IF NOT EXISTS db_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_clinic CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_identity CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_patient CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_medical CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_billing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_payment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_session CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_nomenclature CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_staff CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS db_keycloak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Permissions pour l'utilisateur alphacure
GRANT ALL PRIVILEGES ON db_platform.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_clinic.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_identity.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_patient.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_medical.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_billing.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_payment.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_session.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_nomenclature.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_staff.* TO 'alphacure'@'%';
GRANT ALL PRIVILEGES ON db_keycloak.* TO 'alphacure'@'%';
FLUSH PRIVILEGES;
