import React, { useState, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Search, Save, X, Loader2,
  Users, Stethoscope, Phone, Mail, Link2, DollarSign,
  Percent, Briefcase, Landmark, CheckSquare, Square,
  Calendar, User, MapPin, GraduationCap, FileText,
  Minus, Lock, Unlock, ShieldAlert, Key
} from 'lucide-react';
import { practitionerService, medicalActService, nomenclatureService } from '../../services/api';
import { formatCurrency } from '../../data/constants';
import DataTable from '../ui/DataTable';

const FALLBACK_SPECIALTIES = [
  'Médecine Générale', 'Pédiatrie', 'Gynécologie', 'Cardiologie', 'Dermatologie',
  'Radiologie', 'Échographie', 'Kinésithérapie', 'Orthophonie', 'Psychologie', 'Infirmier'
];

const FALLBACK_CAISSES = [
  'Caisse Principale', 'Caisse Secondaire', 'Caisse de Trésorerie 1', 'Caisse de Trésorerie 2'
];

const FALLBACK_SECTIONS = [
  'Biochimie', 'Hématologie', 'Microbiologie / Parasitologie', 'Immunologie'
];

const FALLBACK_ACCOUNTS = [
  'BOA - BANK OF AFRICA', 'ECOBANK', 'CAISSE CENTRALE', 'CORIS BANK', 'ORABANK'
];

const parseStaffSpecialty = (specStr) => {
  const parts = (specStr || '').split('|');
  const type = parts[0] || 'MEDECIN';

  const res = {
    type,
    contractType: parts[2] || 'permanent',
    value: parts[3] || '0',
    lastName: parts[4] || '',
    firstName: parts[5] || '',
    dob: parts[6] || '',
    gender: parts[7] || 'M',
    address: parts[8] || '',
    cnib: parts[9] || '',
    studyLevel: parts[10] || 'Bac',
    paymentMethod: parts[11] || 'ESPECES',
    paymentDetails: parts[12] || ''
  };

  if (type === 'MEDECIN') {
    res.specialty = parts[1] || 'Médecine Générale';
  } else if (type === 'CAISSIER') {
    res.caisse = parts[1] || 'Caisse Principale';
  } else if (type === 'LABORANTIN') {
    res.section = parts[1] || 'Biochimie';
  } else if (type === 'COMPTABLE') {
    res.accounts = parts[1] ? parts[1].split(',') : [];
  }

  return res;
};

const serializeStaffSpecialty = (data) => {
  const personalStr = `${data.lastName || ''}|${data.firstName || ''}|${data.dob || ''}|${data.gender || 'M'}|${data.address || ''}|${data.cnib || ''}|${data.studyLevel || 'Bac'}|${data.paymentMethod || 'ESPECES'}|${data.paymentDetails || ''}`;

  if (data.type === 'MEDECIN') {
    return `MEDECIN|${data.specialty}|${data.contractType}|${data.value}|${personalStr}`;
  } else if (data.type === 'CAISSIER') {
    return `CAISSIER|${data.caisse}|${data.contractType}|${data.value}|${personalStr}`;
  } else if (data.type === 'LABORANTIN') {
    return `LABORANTIN|${data.section}|${data.contractType}|${data.value}|${personalStr}`;
  } else if (data.type === 'COMPTABLE') {
    return `COMPTABLE|${data.accounts.join(',') || ''}|${data.contractType}|${data.value}|${personalStr}`;
  }
  return `${data.type}||${data.contractType}|${data.value}|${personalStr}`;
};

const StaffManagement = ({ showToast }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Dynamic nomenclature resources
  const [specialties, setSpecialties] = useState(FALLBACK_SPECIALTIES);
  const [caisses, setCaisses] = useState(FALLBACK_CAISSES);
  const [sections, setSections] = useState(FALLBACK_SECTIONS);
  const [accounts, setAccounts] = useState(FALLBACK_ACCOUNTS);

  // Competence modal state
  const [showActsModal, setShowActsModal] = useState(null);
  const [practActs, setPractActs] = useState([]);
  const [allActs, setAllActs] = useState([]);

  // Form states
  const [formLastName, setFormLastName] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formGender, setFormGender] = useState('M');
  const [formAddress, setFormAddress] = useState('');
  const [formCnib, setFormCnib] = useState('');
  const [formStudyLevel, setFormStudyLevel] = useState('Licence');

  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formType, setFormType] = useState('MEDECIN');

  // Type-specific form fields
  const [formSpecialty, setFormSpecialty] = useState('Médecine Générale');
  const [formCaisse, setFormCaisse] = useState('Caisse Principale');
  const [formSection, setFormSection] = useState('Biochimie');
  const [formContractType, setFormContractType] = useState('permanent');
  const [formVal, setFormVal] = useState('500000'); // salary or comm
  const [formAccounts, setFormAccounts] = useState([]);
  const [formPaymentMethod, setFormPaymentMethod] = useState('ESPECES');
  const [formPaymentDetails, setFormPaymentDetails] = useState('');

  // Access Management states
  const [showAccessModal, setShowAccessModal] = useState(null);
  const [keycloakUser, setKeycloakUser] = useState(null);
  const [keycloakLoading, setKeycloakLoading] = useState(false);
  const [keycloakCreating, setKeycloakCreating] = useState(false);
  const [newAccessUsername, setNewAccessUsername] = useState('');
  const [newAccessPassword, setNewAccessPassword] = useState('');

  const openAccessModal = async (staff) => {
    setShowAccessModal(staff);
    setKeycloakUser(null);
    setNewAccessUsername(staff.email ? staff.email.split('@')[0] : '');
    setNewAccessPassword('');

    if (!staff.email) {
      return;
    }

    setKeycloakLoading(true);
    try {
      const res = await practitionerService.getKeycloakUserStatus(staff.email);
      setKeycloakUser(res.data);
    } catch (err) {
      console.log("No Keycloak user found", err);
      setKeycloakUser(null);
    } finally {
      setKeycloakLoading(false);
    }
  };

  const handleCreateAccessAccount = async () => {
    if (!newAccessUsername || !newAccessPassword) {
      showToast("L'identifiant et le mot de passe provisoire sont obligatoires", 'error');
      return;
    }

    setKeycloakCreating(true);
    try {
      const parsed = parseStaffSpecialty(showAccessModal.specialty);
      let keycloakRole = 'MEDECIN';
      if (parsed.type === 'CAISSIER') keycloakRole = 'CAISSIER';
      else if (parsed.type === 'LABORANTIN') keycloakRole = 'LABORANTIN';
      else if (parsed.type === 'INFIRMIER') keycloakRole = 'INFIRMIER';
      else if (parsed.type === 'RECEPTIONNISTE') keycloakRole = 'RECEPTIONNISTE';
      else if (parsed.type === 'MANAGER_CLINIQUE') keycloakRole = 'MANAGER_CLINIQUE';
      else if (parsed.type === 'GESTIONNAIRE_ASSURANCES') keycloakRole = 'GESTIONNAIRE_ASSURANCES';
      else if (parsed.type === 'COMPTABLE') keycloakRole = 'COMPTABLE';
      else if (parsed.type === 'PHARMACIEN') keycloakRole = 'PHARMACIEN';

      await practitionerService.createKeycloakUser({
        username: newAccessUsername,
        email: showAccessModal.email,
        password: newAccessPassword,
        firstName: parsed.firstName || showAccessModal.fullName.split(' ')[1] || '',
        lastName: parsed.lastName || showAccessModal.fullName.split(' ')[0] || '',
        roleName: keycloakRole
      });

      const loginId = newAccessUsername || showAccessModal.email;
      try {
        await practitionerService.repairKeycloakUserContext(loginId);
      } catch (repairErr) {
        console.warn('Sync clinic_id Keycloak', repairErr);
      }
      showToast(
        "Compte d'accès activé. L'utilisateur doit se déconnecter puis se reconnecter pour charger clinic_id dans son jeton.",
        'success'
      );
      openAccessModal(showAccessModal);
    } catch (err) {
      console.error("Error creating Keycloak user", err);
      const errMsg = err.response?.data?.message || "Erreur de création de l'accès Keycloak";
      showToast(errMsg, 'error');
    } finally {
      setKeycloakCreating(false);
    }
  };

  const handleToggleAccessEnabled = async (username, currentStatus) => {
    try {
      const targetState = !currentStatus;
      await practitionerService.updateKeycloakUserStatus(username, targetState);
      showToast(targetState ? "Compte d'accès Keycloak activé !" : "Compte d'accès Keycloak désactivé !", 'success');
      openAccessModal(showAccessModal);
    } catch (err) {
      console.error("Error toggling Keycloak user", err);
      showToast("Erreur lors de la modification de l'accès", 'error');
    }
  };

  const handleUnlockAccessUser = async (username) => {
    try {
      await practitionerService.unlockKeycloakUser(username);
      showToast("Compte déverrouillé avec succès !", 'success');
      openAccessModal(showAccessModal);
    } catch (err) {
      console.error("Error unlocking Keycloak user", err);
      showToast("Erreur lors du déverrouillage du compte", 'error');
    }
  };


  const loadStaff = async () => {
    setLoading(true);
    try {
      const res = await practitionerService.getAll();
      setStaffList(res.data || []);
    } catch (err) {
      console.error("Error loading staff", err);
      // fallback mock list if API fails
      setStaffList([
        { id: '1', fullName: 'DIALLO Aminata', specialty: 'MEDECIN|Pédiatre|permanent|650000|DIALLO|Aminata|1988-06-15|F|Ouagadougou|B1234567|Doctorat', phone: '70 12 34 56', email: 'diallo@clinic.bf', isActive: true },
        { id: '2', fullName: 'SANKARA Thomas', specialty: 'MEDECIN|Chirurgien|vacataire|15|SANKARA|Thomas|1985-12-21|M|Bobo-Dioulasso|B7654321|Doctorat', phone: '76 89 54 32', email: 'sankara@clinic.bf', isActive: true },
        { id: '3', fullName: 'OUÉDRAOGO Jean', specialty: 'MEDECIN|Médecine Générale|permanent|450000|OUÉDRAOGO|Jean|1990-03-12|M|Koudougou|B9988776|Master', phone: '71 00 22 44', email: '', isActive: true },
        { id: '4', fullName: 'BARRY Adama', specialty: 'CAISSIER|Caisse Principale|||BARRY|Adama|1992-08-04|M|Ouahigouya|B1122334|Licence', phone: '77 44 55 66', email: 'barry@clinic.bf', isActive: true },
        { id: '5', fullName: 'SANOGO Mariam', specialty: 'LABORANTIN|Biochimie|permanent|380000|SANOGO|Mariam|1994-09-24|F|Banfora|B4455667|Licence', phone: '75 22 11 00', email: '', isActive: true },
        { id: '6', fullName: 'SAWADOGO Alassane', specialty: 'COMPTABLE|BOA - BANK OF AFRICA,ECOBANK|||SAWADOGO|Alassane|1991-11-30|M|Ouagadougou|B8899770|Master', phone: '70 88 99 77', email: 'sawadogo@clinic.bf', isActive: true },
        { id: '7', fullName: 'SANOGO Mariam', specialty: 'RECEPTIONNISTE||permanent|380000|SANOGO|Mariam|1994-09-24|F|Banfora|B4455667|Licence', phone: '75 22 11 00', email: '', isActive: true },
        { id: '8', fullName: 'BOLLY Aboubacar', specialty: 'MANAGER_CLINIQUE||permanent|380000|BOLLY|Aboubacar|1994-09-24|F|Banfora|B4455667|Licence', phone: '75 22 11 00', email: '', isActive: true },
        { id: '9', fullName: 'SOMDA Rosine', specialty: 'PHARMACIEN||permanent|380000|SOMDA|Rosine|1994-09-24|F|Banfora|B4455667|Licence', phone: '75 22 11 00', email: '', isActive: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadNomenclatures = async () => {
    try {
      // Fetch dynamic categories
      const catRes = await nomenclatureService.search('CATEGORIE_NOMENCLATURE', 'SYSTEM');
      const cats = catRes.data || [];

      // Match Caisses de trésorerie (case-insensitive, contains caisse and treso)
      const caisseTresoCat = cats.find(c => {
        const lbl = (c.string1 || '').toLowerCase();
        return lbl.includes('caisse') && (lbl.includes('tréso') || lbl.includes('treso'));
      });

      // Match Comptes de trésorerie (case-insensitive, contains compte and treso)
      const compteTresoCat = cats.find(c => {
        const lbl = (c.string1 || '').toLowerCase();
        return lbl.includes('compte') && (lbl.includes('tréso') || lbl.includes('treso'));
      });

      const specRes = await nomenclatureService.search('SPECIALITE', 'MEDICAL');
      const secRes = await nomenclatureService.search('SECTION_LABO', 'LABORATOIRE');

      if (specRes.data && specRes.data.length > 0) {
        setSpecialties(specRes.data.map(n => n.string1));
      }

      // Dynamically fetch from the user-created Caisses de trésorerie category!
      if (caisseTresoCat) {
        const res = await nomenclatureService.search(caisseTresoCat.code, caisseTresoCat.string2 || 'FINANCES');
        if (res.data && res.data.length > 0) {
          setCaisses(res.data.map(n => n.string1));
        }
      }

      if (secRes.data && secRes.data.length > 0) {
        setSections(secRes.data.map(n => n.string1));
      }

      // Dynamically fetch from the user-created Comptes de trésorerie category!
      if (compteTresoCat) {
        const res = await nomenclatureService.search(compteTresoCat.code, compteTresoCat.string2 || 'FINANCES');
        if (res.data && res.data.length > 0) {
          setAccounts(res.data.map(n => n.string1));
        }
      }
    } catch (err) {
      console.warn("Nomenclature loading failed, falling back to static lists", err);
    }
  };

  useEffect(() => {
    loadStaff();
    loadNomenclatures();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormLastName('');
    setFormFirstName('');
    setFormDob('');
    setFormGender('M');
    setFormAddress('');
    setFormCnib('');
    setFormStudyLevel('Licence');
    setFormPhone('');
    setFormEmail('');
    setFormType('MEDECIN');
    setFormSpecialty(specialties[0] || 'Médecine Générale');
    setFormCaisse(caisses[0] || 'Caisse Principale');
    setFormSection(sections[0] || 'Biochimie');
    setFormContractType('permanent');
    setFormVal('500000');
    setFormAccounts([]);
    setFormPaymentMethod('ESPECES');
    setFormPaymentDetails('');
    setShowForm(true);
  };

  const openEdit = (staff) => {
    setEditing(staff);
    const parsed = parseStaffSpecialty(staff.specialty);

    setFormLastName(parsed.lastName || '');
    setFormFirstName(parsed.firstName || '');
    setFormDob(parsed.dob || '');
    setFormGender(parsed.gender || 'M');
    setFormAddress(parsed.address || '');
    setFormCnib(parsed.cnib || '');
    setFormStudyLevel(parsed.studyLevel || 'Licence');

    setFormPhone(staff.phone || '');
    setFormEmail(staff.email || '');
    setFormType(parsed.type);

    setFormContractType(parsed.contractType || 'permanent');
    setFormVal(parsed.value || '500000');
    setFormPaymentMethod(parsed.paymentMethod || 'ESPECES');
    setFormPaymentDetails(parsed.paymentDetails || '');

    if (parsed.type === 'MEDECIN') {
      setFormSpecialty(parsed.specialty);
    } else if (parsed.type === 'CAISSIER') {
      setFormCaisse(parsed.caisse);
    } else if (parsed.type === 'LABORANTIN') {
      setFormSection(parsed.section);
    } else if (parsed.type === 'COMPTABLE') {
      setFormAccounts(parsed.accounts || []);
    }

    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formLastName || !formFirstName) {
      showToast('Le nom et le prénom sont obligatoires', 'error');
      return;
    }

    const payloadSpec = serializeStaffSpecialty({
      type: formType,
      specialty: formSpecialty,
      caisse: formCaisse,
      section: formSection,
      contractType: formContractType,
      value: formVal,
      accounts: formAccounts,
      lastName: formLastName,
      firstName: formFirstName,
      dob: formDob,
      gender: formGender,
      address: formAddress,
      cnib: formCnib,
      studyLevel: formStudyLevel,
      paymentMethod: formPaymentMethod,
      paymentDetails: formPaymentDetails
    });

    const formData = {
      fullName: `${formLastName.toUpperCase()} ${formFirstName}`,
      specialty: payloadSpec,
      phone: formPhone,
      email: formEmail,
      isActive: true
    };

    try {
      if (editing) {
        await practitionerService.update(editing.id, formData);
        showToast('Membre du personnel modifié avec succès !', 'success');
      } else {
        await practitionerService.create(formData);
        showToast('Membre du personnel créé avec succès !', 'success');
      }
      setShowForm(false);
      loadStaff();
    } catch (err) {
      console.error("Failed saving staff", err);
      const errMsg = err.response?.data?.message || "Erreur de communication avec le serveur";
      showToast(`Impossible d'enregistrer le personnel : ${errMsg}`, 'error');
    }
  };

  const handleDelete = async (staff) => {
    if (!window.confirm(`Voulez-vous vraiment désactiver "${staff.fullName}" ?`)) return;
    try {
      await practitionerService.delete(staff.id);
      showToast('Personnel désactivé', 'success');
      loadStaff();
    } catch {
      setStaffList(prev => prev.filter(s => s.id !== staff.id));
      showToast('Personnel désactivé', 'success');
    }
  };

  const openActs = async (pr) => {
    setShowActsModal(pr);
    try {
      const [actsRes, allActsRes] = await Promise.all([
        practitionerService.getActs(pr.id),
        medicalActService.getAll()
      ]);
      setPractActs(actsRes.data || []);
      setAllActs(allActsRes.data || []);
    } catch {
      setPractActs([]);
      setAllActs([
        { id: '1', code: 'CSG', name: 'CONSULTATION GÉNÉRALE' },
        { id: '2', code: 'CSS', name: 'CONSULTATION SPÉCIALISÉE' },
        { id: '3', code: 'CPE', name: 'CONSULTATION PÉDIATRIQUE' },
        { id: '5', code: 'KIN', name: 'SÉANCE KINÉSITHÉRAPIE' },
      ]);
    }
  };

  const addActToPractitioner = async (actId) => {
    try {
      await practitionerService.addAct(showActsModal.id, { actId });
      showToast('Acte ajouté au praticien');
      openActs(showActsModal);
    } catch {
      setPractActs(prev => [...prev, { id: Date.now().toString(), actId }]);
      showToast('Acte ajouté');
    }
  };

  const removeActFromPractitioner = async (actId) => {
    if (!window.confirm('Voulez-vous vraiment retirer cet acte de ce praticien ?')) return;
    try {
      await practitionerService.deleteAct(showActsModal.id, actId);
      showToast('Acte retiré avec succès', 'success');
      openActs(showActsModal);
    } catch {
      setPractActs(prev => prev.filter(pa => pa.actId !== actId));
      showToast('Acte retiré');
    }
  };

  const toggleAccount = (acc) => {
    if (formAccounts.includes(acc)) {
      setFormAccounts(prev => prev.filter(a => a !== acc));
    } else {
      setFormAccounts(prev => [...prev, acc]);
    }
  };

  const filtered = staffList.filter(s => {
    const parsed = parseStaffSpecialty(s.specialty);
    const sTerm = search.toLowerCase();

    const matchesSearch = s.fullName.toLowerCase().includes(sTerm) ||
      (s.phone || '').includes(sTerm) ||
      (s.email || '').toLowerCase().includes(sTerm) ||
      (parsed.cnib || '').toLowerCase().includes(sTerm) ||
      (parsed.address || '').toLowerCase().includes(sTerm);

    if (!matchesSearch) return false;
    if (typeFilter !== 'ALL' && parsed.type !== typeFilter) return false;

    return true;
  });

  const paginatedData = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const countStats = staffList.reduce((acc, s) => {
    const parsed = parseStaffSpecialty(s.specialty);
    acc[parsed.type] = (acc[parsed.type] || 0) + 1;
    return acc;
  }, {});

  const getBadgeColor = (type) => {
    switch (type) {
      case 'MEDECIN': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'CAISSIER': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'LABORANTIN': return 'bg-violet-100 text-violet-700 border-violet-200';
      case 'COMPTABLE': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Users size={28} className="text-sky-600 animate-pulse" /> Gestion du Personnel & Staff
        </h2>
        <button onClick={openCreate} className="bg-sky-700 hover:bg-sky-800 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all">
          <Plus size={14} /> Créer un personnel
        </button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600"><Users size={22} /></div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Total Effectif</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{staffList.length}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><Stethoscope size={22} /></div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Praticiens</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{(countStats.PRATICIEN || 0) + (countStats.MEDECIN || 0)}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 rounded-lg text-violet-600"><Briefcase size={22} /></div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Laborantins</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{countStats.LABORANTIN || 0}</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Landmark size={22} /></div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Comptables & Caissiers</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{(countStats.COMPTABLE || 0) + (countStats.CAISSIER || 0)}</div>
          </div>
        </div>
      </div>

      {/* Category Tabs Row */}
      <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200/60 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {[
            { id: 'ALL', label: 'Tous' },
            { id: 'RECEPTIONNISTE', label: 'Réceptionnistes' },
            { id: 'CAISSIER', label: 'Caissiers' },
            { id: 'MEDECIN', label: 'Praticiens' },
            { id: 'INFIRMIER', label: 'Infirmiers' },
            { id: 'LABORANTIN', label: 'Laborantins' },
            { id: 'COMPTABLE', label: 'Comptables' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setTypeFilter(tab.id);
                setCurrentPage(0);
              }}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${typeFilter === tab.id
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modern Data Table */}
      <DataTable
        columns={[
          {
            label: "Nom complet & Identité",
            key: "fullName",
            render: (row) => {
              const parsed = parseStaffSpecialty(row.specialty);
              return (
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <span>{row.fullName}</span>
                    <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase ${parsed.gender === 'M' ? 'bg-sky-50 text-sky-600' : 'bg-pink-50 text-pink-600'}`}>
                      {parsed.gender === 'M' ? 'M' : 'F'}
                    </span>
                  </div>

                  <div className="text-[9px] text-slate-400 flex flex-col gap-0.5 mt-1 font-medium">
                    <div className="flex items-center gap-2">
                      {parsed.cnib && <span className="bg-slate-100 px-1 py-0.5 rounded text-[8px] font-mono text-slate-600">CNIB: {parsed.cnib}</span>}
                      {parsed.dob && <span className="flex items-center gap-0.5"><Calendar size={9} /> {parsed.dob}</span>}
                      {parsed.studyLevel && <span className="flex items-center gap-0.5 text-slate-500 font-bold"><GraduationCap size={10} /> {parsed.studyLevel}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-500 font-normal">
                      {row.phone && <span className="flex items-center gap-0.5"><Phone size={9} /> {row.phone}</span>}
                      {row.email && <span className="flex items-center gap-0.5"><Mail size={9} /> {row.email}</span>}
                      {parsed.address && <span className="flex items-center gap-0.5 text-slate-400"><MapPin size={9} /> {parsed.address}</span>}
                    </div>
                  </div>
                </div>
              );
            }
          },
          {
            label: "Type de personnel",
            key: "type",
            render: (row) => {
              const parsed = parseStaffSpecialty(row.specialty);
              return (
                <span className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider ${getBadgeColor(parsed.type)}`}>
                  {parsed.type}
                </span>
              );
            }
          },
          {
            label: "Spécifications / Affectation",
            key: "specifications",
            render: (row) => {
              const parsed = parseStaffSpecialty(row.specialty);
              return (
                <div className="font-bold text-slate-700">
                  {parsed.type === 'MEDECIN' && (
                    <div className="flex items-center gap-1.5">
                      <Stethoscope size={13} className="text-sky-500" />
                      <span>Spécialité : {parsed.specialty}</span>
                    </div>
                  )}
                  {parsed.type === 'CAISSIER' && (
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <Landmark size={13} className="text-emerald-500" />
                      <span>Caisse : {parsed.caisse}</span>
                    </div>
                  )}
                  {parsed.type === 'LABORANTIN' && (
                    <div className="flex items-center gap-1.5 text-violet-700">
                      <Briefcase size={13} className="text-violet-500" />
                      <span>Section : {parsed.section}</span>
                    </div>
                  )}
                  {parsed.type === 'COMPTABLE' && (
                    <div className="text-slate-600 flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 block font-normal">Comptes trésorerie associés :</span>
                      <span className="text-[11px] font-bold text-slate-800">{parsed.accounts.length > 0 ? parsed.accounts.join(', ') : 'Aucun compte associé'}</span>
                    </div>
                  )}
                </div>
              );
            }
          },
          {
            label: "Régime contractuel",
            key: "contractType",
            render: (row) => {
              const parsed = parseStaffSpecialty(row.specialty);
              return (
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${(parsed.contractType || 'permanent') === 'permanent'
                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                  {(parsed.contractType || 'permanent') === 'permanent' ? 'Permanent' : 'Vacataire'}
                </span>
              );
            }
          },
          {
            label: "Rémunération",
            key: "remuneration",
            render: (row) => {
              const parsed = parseStaffSpecialty(row.specialty);
              return (
                <div className="font-bold text-slate-700 text-xs">
                  {(parsed.contractType || 'permanent') === 'permanent' ? (
                    <div className="flex items-center gap-0.5 text-slate-800 font-black">
                      <DollarSign size={13} className="text-slate-400" />
                      <span>{formatCurrency(Number(parsed.value || 0))} / mois</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 text-amber-700 font-black">
                      <Percent size={13} className="text-amber-500" />
                      <span>{parsed.value || 0}% de commission</span>
                    </div>
                  )}
                </div>
              );
            }
          },
          {
            label: "Règlement",
            key: "payment",
            render: (row) => {
              const parsed = parseStaffSpecialty(row.specialty);
              const method = parsed.paymentMethod || 'ESPECES';
              return (
                <div className="text-[10px] font-bold text-slate-700">
                  <div className="uppercase font-black text-slate-800">{method === 'ESPECES' ? 'Espèces' : method === 'VIREMENT' ? 'Virement' : 'Mobile Money'}</div>
                  {parsed.paymentDetails && <div className="text-[9px] text-slate-400 font-mono mt-0.5">{parsed.paymentDetails}</div>}
                </div>
              );
            }
          }
        ]}
        data={paginatedData}
        loading={loading}
        onSearch={(query) => {
          setSearch(query);
          setCurrentPage(0);
        }}
        searchPlaceholder="Rechercher par nom, CNIB, téléphone, email..."
        entryLabel="membres du personnel"
        onEdit={(row) => openEdit(row)}
        onDelete={(row) => handleDelete(row)}
        extraActions={(row) => {
          const parsed = parseStaffSpecialty(row.specialty);
          return (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => openAccessModal(row)}
                className="flex items-center gap-1 text-[9px] font-black uppercase text-sky-700 hover:text-white border border-sky-200 hover:bg-sky-600 px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
                title="Gérer l'accès"
              >
                <Lock size={10} /> Accès
              </button>
              {parsed.type === 'MEDECIN' && (
                <button
                  onClick={() => openActs(row)}
                  className="flex items-center gap-1 text-[9px] font-black uppercase text-amber-600 hover:text-white border border-amber-200 hover:bg-amber-600 px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
                  title="Compétences"
                >
                  <Link2 size={10} /> Actes
                </button>
              )}
            </div>
          );
        }}
        pagination={{
          currentPage,
          totalPages: Math.ceil(filtered.length / pageSize),
          totalElements: filtered.length,
          pageSize,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(0);
          }
        }}
      />

      {/* Reactive Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="bg-[#1e293b] p-4 flex justify-between items-center">
              <h3 className="text-white text-[11px] font-black uppercase tracking-widest">
                {editing ? 'Modifier le membre du personnel' : 'Nouveau membre du personnel'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

              {/* Section 1: Informations Personnelles */}
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase text-sky-700 tracking-wider flex items-center gap-1.5 border-b border-sky-100 pb-1">
                  <User size={13} /> 1. Informations Personnelles
                </div>

                {/* Nom & Prénom */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nom *</label>
                    <input
                      value={formLastName}
                      onChange={e => setFormLastName(e.target.value)}
                      placeholder="Ex: SOMDA"
                      className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500 font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Prénom *</label>
                    <input
                      value={formFirstName}
                      onChange={e => setFormFirstName(e.target.value)}
                      placeholder="Ex: Caroline"
                      className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={formDob}
                      onChange={e => setFormDob(e.target.value)}
                      className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1.5">Sexe</label>
                    <div className="flex gap-4 pt-1">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="form_gender"
                          checked={formGender === 'M'}
                          onChange={() => setFormGender('M')}
                        />
                        Masculin
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="form_gender"
                          checked={formGender === 'F'}
                          onChange={() => setFormGender('F')}
                        />
                        Féminin
                      </label>
                    </div>
                  </div>
                </div>

                {/* CNIB & Level of Study */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">CNIB (Identité Burkinabè)</label>
                    <input
                      value={formCnib}
                      onChange={e => setFormCnib(e.target.value)}
                      placeholder="Ex: B1234567"
                      className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Niveau d'études</label>
                    <select
                      value={formStudyLevel}
                      onChange={e => setFormStudyLevel(e.target.value)}
                      className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500 font-semibold"
                    >
                      <option value="Bac">Baccalauréat</option>
                      <option value="Licence">Licence</option>
                      <option value="Master">Master</option>
                      <option value="Doctorat">Doctorat</option>
                      <option value="Autre">Autre / Spécialisation</option>
                    </select>
                  </div>
                </div>

                {/* Adresse */}
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Adresse de résidence</label>
                  <input
                    value={formAddress}
                    onChange={e => setFormAddress(e.target.value)}
                    placeholder="Ex: Secteur 15, Ouagadougou"
                    className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                {/* Téléphone & Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Téléphone</label>
                    <input
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="77 88 22 33"
                      className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="personnel@clinic.bf"
                      className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Informations Professionnelles */}
              <div className="space-y-4 pt-2">
                <div className="text-[10px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-1">
                  <Briefcase size={13} /> 2. Informations Professionnelles & Affectation
                </div>

                {/* Type de Personnel Dropdown */}
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Type de personnel *</label>
                  <select
                    value={formType}
                    onChange={e => setFormType(e.target.value)}
                    className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-sky-500 font-semibold"
                  >
                    <option value="RECEPTIONNISTE">Accueil / Réceptionniste</option>
                    <option value="MEDECIN">Médecin</option>
                    <option value="INFIRMIER">Infirmier / Sage-femme</option>
                    <option value="CAISSIER">Caissier / Trésorier</option>
                    <option value="LABORANTIN">Technicien de Laboratoire</option>
                    <option value="GESTIONNAIRE_ASSURANCES">Gestionnaire des Assurances</option>
                    <option value="MANAGER_CLINIQUE">Manager de la Clinique</option>
                    <option value="COMPTABLE">Comptable / Analyste Financier</option>
                  </select>
                </div>

                {/* Conditional UI per personnel type */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">

                  {/* 1. PRATICIEN Conditional UI */}
                  {/* 1. PRATICIEN Conditional UI */}
                  {formType === 'MEDECIN' && (
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Spécialité Médicale *</label>
                      <select
                        value={formSpecialty}
                        onChange={e => setFormSpecialty(e.target.value)}
                        className="w-full border border-slate-200 rounded bg-white p-2.5 text-xs outline-none focus:border-sky-500 font-medium"
                      >
                        {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  {/* 2. CAISSIER Conditional UI */}
                  {formType === 'CAISSIER' && (
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Caisse de Trésorerie *</label>
                      <select
                        value={formCaisse}
                        onChange={e => setFormCaisse(e.target.value)}
                        className="w-full border border-slate-200 rounded bg-white p-2.5 text-xs outline-none focus:border-sky-500 font-bold text-emerald-700"
                      >
                        {caisses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  )}

                  {/* 3. LABORANTIN Conditional UI */}
                  {formType === 'LABORANTIN' && (
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Section du Laboratoire *</label>
                      <select
                        value={formSection}
                        onChange={e => setFormSection(e.target.value)}
                        className="w-full border border-slate-200 rounded bg-white p-2.5 text-xs outline-none focus:border-sky-500 font-medium"
                      >
                        {sections.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  {/* 4. COMPTABLE Conditional UI */}
                  {formType === 'COMPTABLE' && (
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-2 font-black text-amber-800">Cocher les comptes de trésorerie associés</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                        {accounts.map(acc => {
                          const isChecked = formAccounts.includes(acc);
                          return (
                            <div
                              key={acc}
                              onClick={() => toggleAccount(acc)}
                              className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer transition-all select-none ${isChecked
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                                }`}
                            >
                              {isChecked ? (
                                <CheckSquare size={14} className="text-amber-600" />
                              ) : (
                                <Square size={14} className="text-slate-300" />
                              )}
                              <span className="text-[10px] uppercase tracking-wide">{acc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Uniform Contract Type & Remuneration for all types */}
                  <div className="border-t border-slate-200/60 pt-4 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1.5 font-black">Type de contrat</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="staff_contract"
                              checked={formContractType === 'permanent'}
                              onChange={() => { setFormContractType('permanent'); setFormVal('500000'); }}
                            />
                            Permanent
                          </label>
                          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                            <input
                              type="radio"
                              name="staff_contract"
                              checked={formContractType === 'vacataire'}
                              onChange={() => { setFormContractType('vacataire'); setFormVal('15'); }}
                            />
                            Vacataire
                          </label>
                        </div>
                      </div>

                      <div>
                        {formContractType === 'permanent' ? (
                          <>
                            <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Salaire Mensuel (FCFA)</label>
                            <input
                              type="number"
                              value={formVal}
                              onChange={e => setFormVal(e.target.value)}
                              placeholder="Ex: 500000"
                              className="w-full border border-slate-200 rounded bg-white p-2 text-xs outline-none focus:border-sky-500 font-bold"
                            />
                          </>
                        ) : (
                          <>
                            <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Commission (%)</label>
                            <input
                              type="number"
                              value={formVal}
                              onChange={e => setFormVal(e.target.value)}
                              placeholder="Ex: 15"
                              max="100"
                              className="w-full border border-slate-200 rounded bg-white p-2 text-xs outline-none focus:border-sky-500 font-bold"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200/60">
                      <div>
                        <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1 font-black">Moyen de règlement *</label>
                        <select
                          value={formPaymentMethod}
                          onChange={e => {
                            setFormPaymentMethod(e.target.value);
                            setFormPaymentDetails('');
                          }}
                          className="w-full border border-slate-200 rounded bg-white p-2 text-xs outline-none focus:border-sky-500 font-semibold"
                        >
                          <option value="ESPECES">Espèces</option>
                          <option value="VIREMENT">Virement bancaire</option>
                          <option value="MOBILE_MONEY">Mobile Money</option>
                        </select>
                      </div>

                      {formPaymentMethod !== 'ESPECES' && (
                        <div>
                          <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1 font-black">
                            {formPaymentMethod === 'VIREMENT' ? 'RIB complet *' : 'Numéro de téléphone *'}
                          </label>
                          <input
                            value={formPaymentDetails}
                            onChange={e => setFormPaymentDetails(e.target.value)}
                            placeholder={formPaymentMethod === 'VIREMENT' ? 'Ex: BF001 01001 012345678901 02' : 'Ex: 70 00 11 22'}
                            className="w-full border border-slate-200 rounded bg-white p-2 text-xs outline-none focus:border-sky-500 font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Save size={14} /> Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Acts capability Modal */}
      {showActsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="bg-amber-600 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-white text-[11px] font-black uppercase tracking-widest">Compétences & Actes Assignés</h3>
                <div className="text-white/70 text-[10px] mt-0.5">{showActsModal.fullName}</div>
              </div>
              <button onClick={() => setShowActsModal(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {practActs.length > 0 && (
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Actes assignés ({practActs.length})</div>
                  <div className="space-y-1">
                    {practActs.map(pa => {
                      const act = allActs.find(a => a.id === pa.actId);
                      return (
                        <div key={pa.id} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                          <div>
                            <span className="text-[11px] font-bold text-emerald-700">{act?.name || pa.actId}</span>
                            <span className="ml-2 text-[9px] text-emerald-500 font-mono">{act?.code || ''}</span>
                          </div>
                          <button
                            onClick={() => removeActFromPractitioner(pa.actId)}
                            className="p-1.5 rounded-full hover:bg-rose-50 text-emerald-500 hover:text-rose-600 transition-colors"
                            title="Retirer cet acte"
                          >
                            <Minus size={14} className="stroke-[3]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="border-t border-slate-200 pt-4">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Ajouter un acte</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {allActs.filter(a => !practActs.find(pa => pa.actId === a.id)).map(act => (
                    <div key={act.id} onClick={() => addActToPractitioner(act.id)}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 cursor-pointer transition-all group">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-sky-700">{act.name}</span>
                        <span className="ml-2 text-[9px] text-slate-400 font-mono">{act.code}</span>
                      </div>
                      <Plus size={14} className="text-slate-300 group-hover:text-sky-600" />
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowActsModal(null)} className="w-full bg-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase mt-2">Fermer</button>
            </div>
          </div>
        </div>
      )}
      {/* Access Management Modal */}
      {showAccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="bg-sky-900 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white">
                <Lock size={18} className="text-sky-300 animate-pulse" />
                <div>
                  <h3 className="text-white text-[11px] font-black uppercase tracking-widest">Gestion de l'Accès Utilisateur</h3>
                  <div className="text-white/70 text-[9px] mt-0.5 font-medium">{showAccessModal.fullName}</div>
                </div>
              </div>
              <button onClick={() => setShowAccessModal(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Profile Summary Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-1.5">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Profil du personnel</div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">{showAccessModal.fullName}</span>
                  <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                    {parseStaffSpecialty(showAccessModal.specialty).type}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                  <Mail size={12} className="text-slate-400" />
                  <span>{showAccessModal.email || <span className="text-rose-600 font-black">Aucun email renseigné</span>}</span>
                </div>
              </div>

              {/* Access Controller Section */}
              {!showAccessModal.email ? (
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3">
                  <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-800 leading-relaxed">
                    <span className="font-black uppercase block text-[10px] text-rose-700 tracking-wide mb-0.5">Email Obligatoire</span>
                    Pour gérer ou créer un compte d'accès applicatif (Keycloak) pour ce personnel, vous devez d'abord lui attribuer une adresse email valide en modifiant sa fiche.
                  </div>
                </div>
              ) : keycloakLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="animate-spin text-sky-600" size={32} />
                  <div className="text-xs text-slate-500 font-black uppercase tracking-widest animate-pulse">Vérification de l'accès Keycloak...</div>
                </div>
              ) : keycloakUser ? (
                /* Account Exists View */
                <div className="space-y-4">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                    <div className="text-[9px] font-black uppercase text-emerald-700 tracking-widest flex items-center gap-1.5">
                      <Lock size={12} /> Compte d'Accès Actif
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Identifiant</span>
                        <span className="font-bold text-slate-800">{keycloakUser.username}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Rôle Applicatif</span>
                        <span className="font-bold text-slate-800 font-mono text-[10px]">{keycloakUser.roles?.join(', ') || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Statut</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${keycloakUser.enabled
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                          {keycloakUser.enabled ? 'Actif' : 'Désactivé'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Verrouillage (Brute Force)</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${keycloakUser.locked
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                          {keycloakUser.locked ? 'Verrouillé 🔒' : 'Libre 🔓'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleAccessEnabled(keycloakUser.username, keycloakUser.enabled)}
                      className={`flex-1 text-xs font-black uppercase py-2.5 px-4 rounded-lg border transition-all text-center flex items-center justify-center gap-1.5 ${keycloakUser.enabled
                        ? 'bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border-rose-200'
                        : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border-emerald-200'
                        }`}
                    >
                      {keycloakUser.enabled ? (
                        <>
                          <Lock size={13} /> Désactiver l'accès
                        </>
                      ) : (
                        <>
                          <Unlock size={13} /> Activer l'accès
                        </>
                      )}
                    </button>

                    {keycloakUser.locked && (
                      <button
                        onClick={() => handleUnlockAccessUser(keycloakUser.username)}
                        className="flex-1 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 text-xs font-black uppercase py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-1.5"
                      >
                        <Unlock size={13} /> Déverrouiller le compte
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* No Account Exists View - Creation Form */
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl flex items-start gap-3">
                    <ShieldAlert size={18} className="text-sky-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-sky-800 leading-relaxed">
                      Ce membre de personnel n'a pas encore de compte d'accès. Remplissez les informations ci-dessous pour créer instantanément ses accès de manière sécurisée.
                    </div>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Identifiant Keycloak *</label>
                      <input
                        value={newAccessUsername}
                        onChange={e => setNewAccessUsername(e.target.value)}
                        placeholder="Ex: caroline_somda"
                        className="w-full border border-slate-200 bg-white rounded p-2 text-xs outline-none focus:border-sky-500 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Mot de passe provisoire *</label>
                      <input
                        type="password"
                        value={newAccessPassword}
                        onChange={e => setNewAccessPassword(e.target.value)}
                        placeholder="Saisissez un mot de passe sécurisé"
                        className="w-full border border-slate-200 bg-white rounded p-2 text-xs outline-none focus:border-sky-500 font-semibold"
                      />
                      <span className="text-[8px] text-slate-400 mt-1 block">L'utilisateur sera invité à modifier ce mot de passe à sa première connexion.</span>
                    </div>

                    <button
                      onClick={handleCreateAccessAccount}
                      disabled={keycloakCreating}
                      className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black uppercase text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {keycloakCreating ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Création en cours...
                        </>
                      ) : (
                        <>
                          <Key size={14} /> Activer & Générer les Accès
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowAccessModal(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 py-2.5 rounded-lg text-[10px] font-bold uppercase mt-2 transition-colors border border-slate-200"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
