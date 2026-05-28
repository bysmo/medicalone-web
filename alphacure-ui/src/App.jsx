import React, { useState, useEffect } from 'react';
import {
  Users, Activity, Stethoscope,
  LayoutDashboard, HeartPulse, FlaskConical, Settings, LogOut
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { patientService, nomenclatureService, insuranceService } from './services/api';
import Toast from './components/Toast';
import './components/Toast.css';

// --- Composants modulaires ---
import { TopHeader, SidebarItem, QuickModal } from './components/ui/index';
import { ClinicBrandingProvider, useClinicBranding } from './context/ClinicBrandingContext';
import DataTable from './components/ui/DataTable';
import BillingView from './components/patients/BillingView';
import PatientFormView from './components/patients/PatientForm';
import PrestationsView from './components/prestations/PrestationList';
import ActsManagement from './components/settings/ActsManagement';
import ActTariffsManagement from './components/settings/ActTariffsManagement';
import StaffManagement from './components/settings/StaffManagement';
import RemunerationCalculView from './components/hr/RemunerationCalculView';
import InsuranceConventions from './components/settings/InsuranceConventions';
import NomenclatureManagement from './components/settings/NomenclatureManagement';
import InsurersManagement from './components/settings/InsurersManagement';
import SubscribersManagement from './components/settings/SubscribersManagement';
import MaCliniqueView from './components/settings/MaCliniqueView';
import NumerotationsAutomatiquesView from './components/settings/NumerotationsAutomatiquesView';
import SuiviSeancesView from './components/patients/SuiviSeancesView';
import MaSessionView from './components/treasury/MaSessionView';
import AuditCaissesView from './components/treasury/AuditCaissesView';
import DepensesDiversesView from './components/treasury/DepensesDiversesView';
import EtatsPeriodiquesView from './components/treasury/EtatsPeriodiquesView';
import FacturesAssuranceView from './components/treasury/FacturesAssuranceView';
import ComptesBancairesView from './components/treasury/ComptesBancairesView';
import { hasRole, getUserProfile, logout, isMissingClinicContext } from './services/auth';
import ClinicRegistration from './components/public/ClinicRegistration';
import PlatformAdminDashboard from './components/admin/PlatformAdminDashboard';
import GeneralDashboard from './components/admin/GeneralDashboard';
import ConstantesConsultationsView from './components/medical/ConstantesConsultationsView';
import FileAttenteConsultationsView from './components/medical/FileAttenteConsultationsView';
import HistoriquePrestationsView from './components/medical/HistoriquePrestationsView';
import DossiersMedicauxListView from './components/medical/DossiersMedicauxListView';
import ImagerieConsultationView from './components/medical/ImagerieConsultationView';
import { Shield } from 'lucide-react';

const formatBirthDate = (dateStr) => {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

const computeAgeAndTranche = (birthDateStr) => {
  if (!birthDateStr) return null;
  try {
    const today = new Date();
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    const totalMonths = (years * 12) + months;

    let tranche = '';
    let ageLabel = '';
    let badgeClass = '';

    if (totalMonths < 3) {
      tranche = 'NOUVEAUX-NES';
      if (totalMonths === 0) {
        const diffTime = today - birth;
        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        ageLabel = `${diffDays} j`;
      } else {
        ageLabel = `${totalMonths} mois`;
      }
      badgeClass = 'bg-purple-100 text-purple-700 border border-purple-200';
    } else if (totalMonths < 12) {
      tranche = 'NOURRISSONS';
      ageLabel = `${totalMonths} mois`;
      badgeClass = 'bg-pink-100 text-pink-700 border border-pink-200';
    } else if (years < 15) {
      tranche = 'ENFANTS';
      ageLabel = `${years} ans`;
      badgeClass = 'bg-teal-100 text-teal-700 border border-teal-200';
    } else if (years < 25) {
      tranche = 'JEUNES';
      ageLabel = `${years} ans`;
      badgeClass = 'bg-sky-100 text-sky-700 border border-sky-200';
    } else if (years < 60) {
      tranche = 'ADULTES';
      ageLabel = `${years} ans`;
      badgeClass = 'bg-slate-100 text-slate-700 border border-slate-200';
    } else {
      tranche = 'SENIORS';
      ageLabel = `${years} ans`;
      badgeClass = 'bg-amber-100 text-amber-700 border border-amber-200';
    }

    return { ageLabel, tranche, badgeClass };
  } catch {
    return null;
  }
};

// --- Composant Principal App ---

const SidebarBrand = () => {
  const { name, logoDataUrl, loading } = useClinicBranding();
  return (
    <div className="px-4 pb-4 border-b border-slate-700/60">
      <div className="p-4 flex items-center gap-3 border-b border-slate-700/40 mb-3">
        <Activity className="text-sky-400 shrink-0" size={24} />
        <h1 className="text-xl font-black uppercase tracking-tighter text-white">AlphaCure</h1>
      </div>
      {!loading && (name || logoDataUrl) && (
        <div className="flex flex-col items-center gap-2 py-2 px-2 rounded-lg bg-slate-800/40">
          {logoDataUrl ? (
            <img
              src={logoDataUrl}
              alt=""
              className="w-14 h-14 rounded-lg object-contain bg-white/10 p-1"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-slate-700/50 flex items-center justify-center text-sky-400/60 text-lg font-black">
              {name ? name.charAt(0) : 'C'}
            </div>
          )}
          {name && (
            <p className="text-[11px] font-bold text-white text-center leading-tight uppercase tracking-wide line-clamp-2">
              {name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const AppShell = ({ isPublic }) => {
  if (isPublic) {
    return <ClinicRegistration />;
  }

  const [activeTab, setActiveTab] = useState(() => {
    if (hasRole('SUPER_ADMIN')) return 'platform-admin-dashboard';
    if (hasRole('MANAGER_CLINIQUE') || hasRole('ADMIN')) return 'dashboard';
    if (hasRole('MEDECIN')) return 'file-attente-medecin';
    if (hasRole('RECEPTIONNISTE')) return 'patients-list';
    if (hasRole('CAISSIER') || hasRole('COMPTABLE')) return 'ma-session';
    if (hasRole('INFIRMIER')) return 'prise-constantes';
    if (hasRole('LABORANTIN')) return 'prelevements-labo';
    if (hasRole('RH')) return 'personnel';
    return 'dashboard';
  });
  const [viewState, setViewState] = useState('list');
  const [expandedMenus, setExpandedMenus] = useState(() => {
    if (hasRole('MEDECIN')) return ['prestations-medicales', 'hospitalisation'];
    if (hasRole('RECEPTIONNISTE')) return ['accueil'];
    if (hasRole('CAISSIER') || hasRole('COMPTABLE')) return ['tresorerie'];
    if (hasRole('INFIRMIER')) return ['infirmerie', 'hospitalisation'];
    if (hasRole('LABORANTIN')) return ['labo'];
    if (hasRole('RH')) return ['rh'];
    return ['accueil'];
  });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal States
  const [showInsurerModal, setShowInsurerModal] = useState(false);
  const [showSubscriberModal, setShowSubscriberModal] = useState(false);
  const [patientForBilling, setPatientForBilling] = useState(null);

  // Dynamic Lists
  const [insurers, setInsurers] = useState(['SONAR', 'UAB', 'SUNU', 'ALLIANZ', 'MCI', 'GA']);
  const [subscribers, setSubscribers] = useState(['SONABEL', 'ONEA', 'CFAO', 'ORANGE', 'CORIS BANK', 'ECOBANK', 'BOA', 'VISTA BANK']);

  const loadDynamicInsurersAndSubscribers = async () => {
    try {
      const [insRes, subRes] = await Promise.all([
        insuranceService.getAll(),
        nomenclatureService.search('SOUSCRIPTEUR', 'FINANCES')
      ]);
      if (insRes.data && insRes.data.length > 0) {
        setInsurers(insRes.data.map(n => n.name));
      }
      if (subRes.data && subRes.data.length > 0) {
        setSubscribers(subRes.data.map(n => n.string1));
      }
    } catch (err) {
      console.warn("Failed loading dynamic insurers/subscribers, keeping default fallbacks", err);
    }
  };

  useEffect(() => {
    loadDynamicInsurersAndSubscribers();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadPatients = async (query = '', pageNum = 0, size = pageSize) => {
    setLoading(true);
    try {
      const res = await patientService.search(query, pageNum, size);
      setPatients(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.message
        || "Erreur lors du chargement des patients.";
      showToast(msg, "error");
    } finally { setLoading(false); }
  };

  const handleViewPatient = (patient) => { setSelectedPatient(patient); setViewState('view'); };
  const handleEditPatient = (patient) => { setSelectedPatient(patient); setViewState('edit'); };
  const handleBillPatient = (patient) => { setPatientForBilling(patient); setViewState('billing'); };

  const handleDeletePatient = async (patient) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le dossier de ${patient.fullName} ? Cette action est irréversible.`)) {
      setLoading(true);
      try {
        await patientService.delete(patient.id);
        showToast("Le dossier a été supprimé avec succès.");
        loadPatients(search, page, pageSize);
      } catch (err) {
        console.error(err);
        showToast("Erreur lors de la suppression du dossier.", "error");
      } finally { setLoading(false); }
    }
  };

  useEffect(() => {
    if (activeTab === 'patients-list') {
      setViewState('list');
      loadPatients(search, 0);
      loadDynamicInsurersAndSubscribers();
    }
  }, [activeTab, search]);

  const handlePageChange = (pageNum) => loadPatients(search, pageNum, pageSize);
  const handlePageSizeChange = (size) => { setPageSize(size); loadPatients(search, 0, size); };

  const toggleExpand = (id) => {
    setExpandedMenus(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const menuItems = [
    hasRole('SUPER_ADMIN') && { id: 'platform-admin-dashboard', icon: Shield, label: 'Administration SaaS' },
    !hasRole('SUPER_ADMIN') && { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    !hasRole('SUPER_ADMIN') && {
      id: 'accueil', icon: Users, label: 'Accueil patients', subs: [
        { id: 'patients-list', label: 'Dossiers patients' },
        { id: 'prestations-patients', label: 'Prestations patients' },
        { id: 'suivi-seances', label: 'Séances et contrôles' },
        //{ id: 'annulations', label: 'Annulations' }
      ]
    },
    !hasRole('SUPER_ADMIN') && {
      id: 'tresorerie', icon: Activity, label: 'Trésorerie', subs: [
        { id: 'ma-session', label: 'Ma session' },
        { id: 'a-encaisser', label: 'Prestations patients à régler' },
        { id: 'encaissements', label: 'Encaissements' },
        { id: 'remboursements', label: 'Remboursements' },
        { id: 'depenses-diverses', label: 'Dépenses diverses' },
        { id: 'audit-caisses', label: 'Audit des caisses' },
        { id: 'comptes-bancaires', label: 'Comptes de règlement' },
        { id: 'factures-assurance', label: 'Factures assurance' },
        { id: 'remuneration-personnel', label: 'Rémunération du personnel' },
        //{ id: 'statistiques-activite', label: 'Statistiques activité' },
        { id: 'etats-periodiques', label: 'Etats périodiques' },
      ]
    },

    !hasRole('SUPER_ADMIN') && {
      id: 'prestations-medicales', icon: Stethoscope, label: 'Prestations médicales', subs: [
        //{ id: 'agenda-medecin', label: 'Mon agenda' },
        { id: 'file-attente-medecin', label: 'File d\'attente' },
        { id: 'imagerie-consultations', label: 'Consultations Imagerie' },
        { id: 'historique-prestations-medecin', label: 'Historique des prestations' },
        { id: 'dossiers-medicaux', label: 'Dossiers médicaux' },
      ]
    },
    !hasRole('SUPER_ADMIN') && {
      id: 'infirmerie', icon: HeartPulse, label: 'Infirmerie', subs: [
        { id: 'prise-constantes', label: 'Prise de constantes' },
        { id: 'file-attente-infirmerie', label: 'File d\'attente' },
        { id: 'historique-soins-infirmiers', label: 'Historique des soins infirmiers' },
      ]
    },
    !hasRole('SUPER_ADMIN') && {
      id: 'labo', icon: FlaskConical, label: 'Laboratoire', subs: [
        { id: 'prelevements-labo', label: 'Prelevements' },
        { id: 'examens-labo', label: 'Examens' },
        { id: 'resultats-labo', label: 'Resultats' },
        { id: 'validation-resultats-labo', label: 'Validation resultats' },
        { id: 'historique-labo', label: 'Historique des examens' },
      ]
    },
    !hasRole('SUPER_ADMIN') && {
      id: 'hospitalisation', icon: FlaskConical, label: 'Hospitalisation', subs: [
        { id: 'hospitalisation-list', label: 'Liste des hospitalisations' },
        { id: 'hospitalisation-details', label: 'Détails de l\'hospitalisation' },
        { id: 'hospitalisation-factures', label: 'Factures d\'hospitalisation' },
        { id: 'hospitalisation-remboursements', label: 'Remboursements d\'hospitalisation' },
        { id: 'hospitalisation-statistiques', label: 'Statistiques d\'hospitalisation' },
        { id: 'hospitalisation-etats-periodiques', label: 'Etats périodiques d\'hospitalisation' },
      ]
    },
    !hasRole('SUPER_ADMIN') && {
      id: 'rh', icon: Users, label: 'Ressources humaines', subs: [
        { id: 'personnel', label: 'Personnel' },
        //{ id: 'absences', label: 'Absences' },
        //{ id: 'conges', label: 'Congés' },
        { id: 'calcul-paie-personnel', label: 'Calcul rémunération personnel' },
        { id: 'historique-remuneration', label: 'Historique des rémunérations' },
      ]
    },
    !hasRole('SUPER_ADMIN') && {
      id: 'settings', icon: Settings, label: '⚙ Paramétrage', subs: [
        { id: 'settings-ma-clinique', label: 'Ma clinique' },
        { id: 'settings-numerotations', label: 'Numérotations automatiques' },
        { id: 'settings-acts', label: 'Actes médicaux' },
        { id: 'settings-tariffs', label: 'Tarification des actes' },
        { id: 'settings-insurers', label: 'Gestion des assureurs' },
        { id: 'settings-subscribers', label: 'Gestion des souscripteurs' },
        { id: 'settings-insurance', label: 'Conventions assurance' },
        { id: 'settings-nomenclatures', label: 'Nomenclatures' }
      ]
    }
  ].filter(Boolean);

  // Filtrer la liste des menus et leurs sous-menus selon les rôles de l'utilisateur
  const isModuleAllowed = (moduleId) => {
    if (hasRole('SUPER_ADMIN')) {
      return moduleId === 'platform-admin-dashboard';
    }
    if (moduleId === 'platform-admin-dashboard') return false;

    // Full access roles
    if (hasRole('MANAGER_CLINIQUE') || hasRole('ADMIN')) {
      return true;
    }

    // Role-specific rules
    if (hasRole('MEDECIN') && (moduleId === 'prestations-medicales' || moduleId === 'hospitalisation')) {
      return true;
    }
    if (hasRole('RECEPTIONNISTE') && moduleId === 'accueil') {
      return true;
    }
    if ((hasRole('CAISSIER') || hasRole('COMPTABLE')) && moduleId === 'tresorerie') {
      return true;
    }
    if (hasRole('INFIRMIER') && (moduleId === 'infirmerie' || moduleId === 'hospitalisation')) {
      return true;
    }
    if (hasRole('LABORANTIN') && moduleId === 'labo') {
      return true;
    }
    if (hasRole('RH') && moduleId === 'rh') {
      return true;
    }

    return false;
  };

  const allowedMenuItems = menuItems
    .filter(item => isModuleAllowed(item.id))
    .map(item => {
      if (item.subs) {
        const filteredSubs = item.subs.filter(sub => {
          // Special restriction for CAISSIER on tresorerie submenus
          if (item.id === 'tresorerie' && hasRole('CAISSIER') && !hasRole('COMPTABLE') && !hasRole('ADMIN') && !hasRole('MANAGER_CLINIQUE')) {
            const allowed = ['ma-session', 'a-encaisser', 'encaissements', 'remboursements', 'depenses-diverses'];
            return allowed.includes(sub.id);
          }
          return true;
        });
        return { ...item, subs: filteredSubs };
      }
      return item;
    })
    .filter(item => !item.subs || item.subs.length > 0);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      {isMissingClinicContext() && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-sm text-center shadow">
          Votre compte n&apos;a pas de clinique associée dans Keycloak (clinic_id). Déconnectez-vous, demandez à l&apos;admin de resynchroniser votre accès (Paramétrage → Staff), puis reconnectez-vous.
        </div>
      )}
      <div className="w-72 h-screen bg-[#1e293b] text-slate-300 flex flex-col sticky top-0 shrink-0 overflow-y-auto shadow-2xl">
        <SidebarBrand />
        <nav className="flex-1 py-4 px-2 space-y-1">
          {allowedMenuItems.map((item) => (
            <SidebarItem key={item.id} item={item} activeTab={activeTab} setActiveTab={setActiveTab} expanded={expandedMenus.includes(item.id)} toggleExpand={toggleExpand} />
          ))}
        </nav>

        {/* Profile / Logout Footer */}
        <div className="p-4 border-t border-slate-700/60 bg-slate-900/20 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 font-bold text-sm shrink-0">
              {getUserProfile()?.name ? getUserProfile().name.charAt(0).toUpperCase() : (getUserProfile()?.username ? getUserProfile().username.charAt(0).toUpperCase() : 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{getUserProfile()?.name || getUserProfile()?.username || 'Utilisateur'}</p>
              <p className="text-[11px] text-slate-400 truncate">{getUserProfile()?.email || 'Membre AlphaCure'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-600 hover:text-white transition-all text-slate-400 border border-slate-700/50 cursor-pointer"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader setActiveTab={setActiveTab} />
        <main className="flex-1 p-10 bg-slate-50/50 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'platform-admin-dashboard' && <PlatformAdminDashboard showToast={showToast} />}
            {activeTab === 'dashboard' && <GeneralDashboard showToast={showToast} />}
            {activeTab === 'ma-session' && <MaSessionView showToast={showToast} initialTab="ma-session" />}
            {activeTab === 'a-encaisser' && <MaSessionView showToast={showToast} initialTab="a-encaisser" />}
            {activeTab === 'encaissements' && <MaSessionView showToast={showToast} initialTab="encaissements" />}
            {activeTab === 'remboursements' && <MaSessionView showToast={showToast} initialTab="remboursements" />}
            {activeTab === 'audit-caisses' && <AuditCaissesView showToast={showToast} />}
            {activeTab === 'depenses-diverses' && <DepensesDiversesView showToast={showToast} />}
            {activeTab === 'comptes-bancaires' && <ComptesBancairesView showToast={showToast} />}
            {activeTab === 'etats-periodiques' && <EtatsPeriodiquesView showToast={showToast} />}
            {activeTab === 'factures-assurance' && <FacturesAssuranceView showToast={showToast} />}
            {activeTab === 'prestations-patients' && <PrestationsView showToast={showToast} />}
            {activeTab === 'suivi-seances' && <SuiviSeancesView showToast={showToast} />}
            {activeTab === 'constantes-consultations' && <ConstantesConsultationsView showToast={showToast} />}
            {activeTab === 'prise-constantes' && <ConstantesConsultationsView showToast={showToast} />}
            {activeTab === 'file-attente-medecin' && <FileAttenteConsultationsView showToast={showToast} />}
            {activeTab === 'imagerie-consultations' && <ImagerieConsultationView showToast={showToast} />}
            {activeTab === 'file-attente-infirmerie' && <ConstantesConsultationsView showToast={showToast} />}
            {activeTab === 'historique-prestations-medecin' && <HistoriquePrestationsView showToast={showToast} />}
            {activeTab === 'dossiers-medicaux' && <DossiersMedicauxListView showToast={showToast} />}
            {activeTab === 'settings-ma-clinique' && <MaCliniqueView showToast={showToast} />}
            {activeTab === 'settings-numerotations' && <NumerotationsAutomatiquesView showToast={showToast} />}
            {activeTab === 'settings-acts' && <ActsManagement showToast={showToast} />}
            {activeTab === 'settings-tariffs' && <ActTariffsManagement showToast={showToast} />}
            {activeTab === 'settings-insurers' && <InsurersManagement showToast={showToast} />}
            {activeTab === 'settings-subscribers' && <SubscribersManagement showToast={showToast} />}
            {activeTab === 'personnel' && <StaffManagement showToast={showToast} />}
            {activeTab === 'calcul-paie-personnel' && <RemunerationCalculView showToast={showToast} initialTab="calcul" />}
            {activeTab === 'historique-remuneration' && <RemunerationCalculView showToast={showToast} initialTab="history" />}
            {activeTab === 'remuneration-personnel' && <RemunerationCalculView showToast={showToast} initialTab="history" />}
            {activeTab === 'settings-insurance' && <InsuranceConventions showToast={showToast} />}
            {activeTab === 'settings-nomenclatures' && <NomenclatureManagement showToast={showToast} />}
            {activeTab === 'patients-list' && (
              viewState === 'list' ? (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                    <Users size={28} className="text-sky-600" /> Dossiers Patients
                  </h2>
                  <DataTable
                    title="Registre des patients" columns={[
                      { label: 'Code', key: 'patientCode', render: (p) => <span className="font-mono text-[11px] text-sky-600 font-black">{p.patientCode}</span> },
                      { label: 'N° Dossier', key: 'dossierNumber', render: (p) => <span className="font-mono text-[11px] text-slate-500">{p.dossierNumber || '---'}</span> },
                      {
                        label: 'Nom & Prénom',
                        key: 'fullName',
                        render: (p) => {
                          const hasInsurance = !!p.insurer;
                          return (
                            <div className="flex flex-col">
                              <span className={`uppercase text-slate-700 ${hasInsurance ? 'font-black' : 'font-normal italic text-slate-500'}`}>
                                {p.fullName}
                              </span>
                              {hasInsurance && (
                                <span className="text-[10px] text-teal-600 font-bold mt-0.5">
                                  🛡️ Assuré : {p.insurer} {p.policyNumber ? `(n° ${p.policyNumber})` : ''} - {p.coverageRate || 0}%
                                </span>
                              )}
                            </div>
                          );
                        }
                      },
                      {
                        label: 'Sexe', key: 'gender', render: (p) => (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.gender === 'M' || p.gender === 'Masculin' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                            {p.gender === 'M' || p.gender === 'Masculin' ? 'Masculin' : 'Féminin'}
                          </span>
                        )
                      },
                      {
                        label: 'Téléphone',
                        key: 'phone1',
                        render: (p) => (
                          <span className="font-semibold text-slate-600 font-mono text-xs">
                            {[p.phone1, p.phone2].filter(Boolean).join(' / ') || '—'}
                          </span>
                        )
                      },
                      {
                        label: 'Date de Naissance',
                        key: 'birthDate',
                        render: (p) => {
                          const ageInfo = computeAgeAndTranche(p.birthDate);
                          return (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-600 uppercase text-xs">
                                {formatBirthDate(p.birthDate)}
                              </span>
                              {ageInfo && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">{ageInfo.ageLabel}</span>
                                  <span className={`px-1.5 py-0.25 rounded text-[8px] font-black uppercase tracking-wider ${ageInfo.badgeClass}`}>
                                    {ageInfo.tranche}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }
                      },
                      { label: 'Statut', key: 'isActive', render: () => <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[9px] font-black uppercase border border-emerald-200">Actif</span> }
                    ]} data={patients} loading={loading}
                    onSearch={(val) => { setSearch(val); loadPatients(val, 0); }}
                    onCreate={() => { setSelectedPatient(null); setViewState('create'); }}
                    onView={handleViewPatient}
                    onEdit={handleEditPatient}
                    onBill={handleBillPatient}
                    pagination={{
                      currentPage: page, totalPages, totalElements, pageSize,
                      onPageChange: handlePageChange, onPageSizeChange: handlePageSizeChange
                    }}
                  />
                </div>
              ) : viewState === 'billing' ? (
                patientForBilling && <BillingView patient={patientForBilling} onClose={() => setViewState('list')} showToast={showToast} />
              ) : (
                <PatientFormView
                  patient={selectedPatient}
                  isViewOnly={viewState === 'view'}
                  onBack={() => setViewState('list')}
                  onSave={() => loadPatients(search)}
                  showToast={showToast}
                  onAddInsurer={() => setShowInsurerModal(true)}
                  onAddSubscriber={() => setShowSubscriberModal(true)}
                  insurers={insurers}
                  subscribers={subscribers}
                />
              )
            )}
          </AnimatePresence>

          {/* --- Rapid Creation Modals --- */}
          <QuickModal title="Nouveau Assureur" isOpen={showInsurerModal} onClose={() => setShowInsurerModal(false)}>
            <div className="space-y-4">
              <input id="new-insurer-name" type="text" placeholder="Nom de l'assureur" className="w-full border border-slate-200 rounded p-3 text-sm outline-none focus:border-sky-500" />
              <select id="new-insurer-scope" className="w-full border border-slate-200 rounded p-3 text-sm outline-none focus:border-sky-500 bg-white">
                <option value="NATIONAL">Assurance Nationale</option>
                <option value="INTERNATIONAL">Assurance Internationale</option>
              </select>
              <button onClick={() => {
                const name = document.getElementById('new-insurer-name').value;
                const scope = document.getElementById('new-insurer-scope').value;
                if (name) {
                  insuranceService.create({
                    name: name,
                    type: scope
                  }).then(() => {
                    loadDynamicInsurersAndSubscribers();
                    setShowInsurerModal(false);
                    showToast("Assureur créé avec succès");
                  }).catch(err => {
                    console.error(err);
                    showToast("Erreur lors de la création de l'assureur", "error");
                  });
                }
              }} className="w-full bg-sky-700 text-white py-3 rounded font-black uppercase text-[10px] shadow-lg">Enregistrer Assureur</button>
            </div>
          </QuickModal>

          <QuickModal title="Nouveau Souscripteur" isOpen={showSubscriberModal} onClose={() => setShowSubscriberModal(false)}>
            <div className="space-y-4">
              <input id="new-sub-name" type="text" placeholder="Raison sociale / Nom" className="w-full border border-slate-200 rounded p-3 text-sm outline-none focus:border-sky-500" />
              <button onClick={() => {
                const name = document.getElementById('new-sub-name').value;
                if (name) {
                  const code = name.toUpperCase().replace(/\s+/g, '_');
                  nomenclatureService.create({
                    type: 'SOUSCRIPTEUR',
                    nature: 'FINANCES',
                    code: code,
                    string1: name,
                    int1: 1
                  }).then(() => {
                    loadDynamicInsurersAndSubscribers();
                    setShowSubscriberModal(false);
                    showToast("Souscripteur créé avec succès");
                  }).catch(err => {
                    console.error(err);
                    showToast("Erreur lors de la création du souscripteur", "error");
                  });
                }
              }} className="w-full bg-sky-700 text-white py-3 rounded font-black uppercase text-[10px] shadow-lg">Enregistrer Souscripteur</button>
            </div>
          </QuickModal>

          {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </main>
      </div>
    </div>
  );
};

const App = (props) => (
  <ClinicBrandingProvider>
    <AppShell {...props} />
  </ClinicBrandingProvider>
);

export default App;
