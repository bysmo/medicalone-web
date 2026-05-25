const DEFAULT_PACKAGES = [
  {
    id: 'pack-standard',
    name: 'Plan Standard',
    price: 150,
    billingCycle: 'monthly',
    description: 'Parfait pour les cabinets médicaux de petite taille débutant leur transition numérique.',
    maxUsers: 5,
    maxActs: 500,
    status: 'ACTIVE',
    features: ['Jusqu\'à 5 utilisateurs', '500 actes médicaux / mois', 'Dossiers patients électroniques', 'Support email standard', 'Trésorerie de base']
  },
  {
    id: 'pack-pro',
    name: 'Plan Professionnel',
    price: 350,
    billingCycle: 'monthly',
    description: 'Conçu pour les cliniques médicales à forte croissance avec gestion avancée.',
    maxUsers: 20,
    maxActs: 2500,
    status: 'ACTIVE',
    features: ['Jusqu\'à 20 utilisateurs', '2500 actes médicaux / mois', 'Laboratoire & Imagerie intégrés', 'Support prioritaire 24/7', 'Statistiques et KPIs financiers', 'Multi-praticiens simultanés']
  },
  {
    id: 'pack-enterprise',
    name: 'Plan Entreprise',
    price: 750,
    billingCycle: 'monthly',
    description: 'La puissance maximale pour les grands centres hospitaliers et polycliniques.',
    maxUsers: 999,
    maxActs: 999999,
    status: 'ACTIVE',
    features: ['Utilisateurs illimités', 'Actes et ordonnances illimités', 'Hébergement dédié renforcé', 'Rapports personnalisés avancés', 'Intégration d\'API tierces', 'Gestionnaire de compte dédié']
  }
];

export const packagesStore = {
  getPackages: () => {
    const data = localStorage.getItem('alphacure_saas_packages');
    if (!data) {
      localStorage.setItem('alphacure_saas_packages', JSON.stringify(DEFAULT_PACKAGES));
      return DEFAULT_PACKAGES;
    }
    return JSON.parse(data);
  },

  savePackages: (packages) => {
    localStorage.setItem('alphacure_saas_packages', JSON.stringify(packages));
  },

  addPackage: (newPack) => {
    const packs = packagesStore.getPackages();
    const packWithId = {
      ...newPack,
      id: 'pack-' + Date.now(),
      status: 'ACTIVE'
    };
    packs.push(packWithId);
    packagesStore.savePackages(packs);
    return packWithId;
  },

  updatePackage: (updatedPack) => {
    const packs = packagesStore.getPackages();
    const index = packs.findIndex(p => p.id === updatedPack.id);
    if (index !== -1) {
      packs[index] = updatedPack;
      packagesStore.savePackages(packs);
      return true;
    }
    return false;
  },

  deletePackage: (id) => {
    const packs = packagesStore.getPackages();
    const index = packs.findIndex(p => p.id === id);
    if (index !== -1) {
      // Hard delete or archive
      packs[index].status = 'ARCHIVED';
      packagesStore.savePackages(packs);
      return true;
    }
    return false;
  }
};
