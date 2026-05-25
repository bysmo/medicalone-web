/**
 * Correspondance codes actes (GYNECOLOGIE) ↔ libellés praticiens (Gynécologie).
 */
const ACT_CODE_TO_CANONICAL = {
  MEDECINE_GENERALE: 'medecine generale',
  PEDIATRIE: 'pediatrie',
  CARDIOLOGIE: 'cardiologie',
  GYNECOLOGIE: 'gynecologie',
  OPHTALMOLOGIE: 'ophtalmologie',
  DERMATOLOGIE: 'dermatologie',
  NEUROLOGIE: 'neurologie',
  RHUMATOLOGIE: 'rhumatologie',
  ORL: 'orl',
  GASTROENTEROLOGIE: 'gastroenterologie',
};

const stripAccents = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Normalise une spécialité (code acte ou libellé humain) pour comparaison stricte. */
export const normalizeSpecialty = (value) => {
  if (!value) return '';
  const raw = String(value).trim();
  const upperKey = raw.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (ACT_CODE_TO_CANONICAL[upperKey]) {
    return ACT_CODE_TO_CANONICAL[upperKey];
  }
  return stripAccents(raw);
};

/** Extrait la spécialité d'un acte (champ specialty ou libellé « Consultation X »). */
export const extractActSpecialty = ({ specialty, actName, name } = {}) => {
  if (specialty) {
    return normalizeSpecialty(specialty);
  }
  const label = actName || name || '';
  const match = label.match(/consultation\s+(.+)/i);
  if (match) {
    return normalizeSpecialty(match[1]);
  }
  return normalizeSpecialty(label);
};

export const getPractitionerRole = (practitioner) =>
  (practitioner?.specialty || '').split('|')[0]?.trim().toUpperCase() || '';

export const getPractitionerSpecialtyLabel = (practitioner) =>
  normalizeSpecialty((practitioner?.specialty || '').split('|')[1] || '');

/** Médecin prescripteur (exclut caissier, labo, comptable, etc.). */
export const isMedicalDoctor = (practitioner) => {
  const role = getPractitionerRole(practitioner);
  return role === 'PRATICIEN' || role === 'MEDECIN';
};

/** Correspondance stricte spécialité acte ↔ spécialité praticien. */
export const specialtiesMatch = (actSpecialty, practitioner) => {
  const actNorm = normalizeSpecialty(actSpecialty);
  const prNorm = getPractitionerSpecialtyLabel(practitioner);
  if (!actNorm || !prNorm) return false;
  return actNorm === prNorm;
};

/**
 * Praticiens éligibles pour une affectation : médecins uniquement, même spécialité que l'acte.
 */
/** Libellés français pour filtres / colonnes */
const CANONICAL_TO_LABEL = {
  'medecine generale': 'Médecine générale',
  pediatrie: 'Pédiatrie',
  cardiologie: 'Cardiologie',
  gynecologie: 'Gynécologie',
  ophtalmologie: 'Ophtalmologie',
  dermatologie: 'Dermatologie',
  neurologie: 'Neurologie',
  rhumatologie: 'Rhumatologie',
  orl: 'ORL',
  gastroenterologie: 'Gastro-entérologie',
};

export const formatSpecialtyLabel = (canonicalOrRaw) => {
  const norm = normalizeSpecialty(canonicalOrRaw);
  if (!norm) return '—';
  return CANONICAL_TO_LABEL[norm] || (canonicalOrRaw || norm).replace(/\b\w/g, c => c.toUpperCase());
};

export const filterEligiblePractitioners = (practitioners, actContext) => {
  const actSpec = extractActSpecialty(actContext);
  if (!actSpec) return [];

  return (practitioners || []).filter(
    (pr) => isMedicalDoctor(pr) && specialtiesMatch(actSpec, pr)
  );
};
