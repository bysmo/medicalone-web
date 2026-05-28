import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Filter, CheckCircle2, AlertCircle, Save, Loader2,
  TrendingUp, UserCheck, Wallet, Coins, Landmark, ChevronRight,
  Users, Check, X, Info, RefreshCw, DollarSign, Activity, FileText
} from 'lucide-react';
import {
  staffRemunerationService,
  clinicService,
  nomenclatureService,
  patientService,
  cashSessionService
} from '../../services/api';
import DataTable from '../ui/DataTable';
import { useClientTable } from '../../hooks/useClientTable';

const formatFCFA = (amount) => {
  if (amount === undefined || amount === null) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0
  }).format(amount).replace('XOF', 'FCFA');
};

const RemunerationCalculView = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);

  // Selection & Filters (Month, Role, Contract)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  });
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [contractFilter, setContractFilter] = useState('ALL');
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Stats / Activity data
  const [detailPrestations, setDetailPrestations] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [patientsMap, setPatientsMap] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form states for selected staff remuneration
  const [adjustedAmount, setAdjustedAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [selectedCaisseCode, setSelectedCaisseCode] = useState('');
  const [savingRemuneration, setSavingRemuneration] = useState(false);

  // Load configuration and data on mount
  useEffect(() => {
    loadPaymentConfigData();
    loadPatients();
    loadSessions();
  }, []);

  // Reload staff list when filters or month changes
  useEffect(() => {
    loadStaffList();
  }, [selectedMonth, roleFilter, contractFilter]);

  // Load details whenever selected staff changes
  useEffect(() => {
    if (selectedStaff) {
      loadSelectedStaffDetails(selectedStaff);
      setAdjustedAmount(selectedStaff.adjustedAmount || selectedStaff.calculatedAmount || 0);
      setNotes(selectedStaff.notes || '');
    } else {
      setDetailPrestations([]);
    }
  }, [selectedStaff?.staffId]);

  const loadStaffList = async () => {
    setLoading(true);
    try {
      const res = await staffRemunerationService.getStaffList(selectedMonth, roleFilter, contractFilter);
      const list = res.data || [];
      setStaffList(list);

      // Keep selection active if the staff member is still in the new filtered list
      if (selectedStaff) {
        const active = list.find(s => s.staffId === selectedStaff.staffId);
        if (active) {
          setSelectedStaff(active);
        } else {
          setSelectedStaff(null);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Impossible de charger la liste du personnel.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentConfigData = async () => {
    try {
      const [profileRes, caisseRes] = await Promise.all([
        clinicService.getMyProfile().catch(() => ({ data: {} })),
        nomenclatureService.search('CAISSES_TRESORERIE', 'FINANCES').catch(() => ({ data: [] }))
      ]);

      const accounts = profileRes.data?.bankAccounts || [];
      setBankAccounts(accounts);
      if (accounts.length > 0) {
        const primary = accounts.find(a => a.primary) || accounts[0];
        setSelectedBankAccountId(primary.id || '');
      }

      const caissesList = caisseRes.data || [];
      setCaisses(caissesList);
      if (caissesList.length > 0) {
        setSelectedCaisseCode(caissesList[0].code || '');
      }
    } catch (err) {
      console.error(err);
      showToast("Erreur lors du chargement des caisses/comptes.", "error");
    }
  };

  const loadPatients = async () => {
    try {
      const res = await patientService.search('', 0, 2000);
      const list = res.data?.content || [];
      setAllPatients(list);
      const map = {};
      list.forEach(p => {
        map[p.id] = p.fullName;
      });
      setPatientsMap(map);
    } catch (err) {
      console.error("Failed to load patients list", err);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await cashSessionService.getAll();
      setAllSessions(res.data || []);
    } catch (err) {
      console.error("Failed to load cash sessions list", err);
    }
  };

  const loadSelectedStaffDetails = async (staff) => {
    const isMedical = ['MEDECIN', 'PRATICIEN', 'LABORANTIN', 'INFIRMIER'].includes(staff.staffType.toUpperCase());
    if (isMedical) {
      setLoadingDetails(true);
      try {
        const res = await staffRemunerationService.getStaffPrestations(staff.staffId, selectedMonth);
        setDetailPrestations(res.data || []);
      } catch (err) {
        console.error(err);
        showToast("Impossible de charger les actes du praticien.", "error");
      } finally {
        setLoadingDetails(false);
      }
    } else {
      setDetailPrestations([]);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setSavingRemuneration(true);
    try {
      const payload = {
        staffId: selectedStaff.staffId,
        month: selectedMonth,
        adjustedAmount: adjustedAmount,
        notes: notes,
        bankAccountId: selectedStaff.paymentMethod === 'VIREMENT' ? selectedBankAccountId : null,
        caisseCode: null
      };

      const res = await staffRemunerationService.saveRemuneration(payload);
      showToast(`Rémunération de ${selectedStaff.staffName} enregistrée et validée avec succès !`, "success");

      // Reload lists
      await loadStaffList();
      await loadSessions();

      // Update selected staff to the newly saved status
      if (res.data) {
        setSelectedStaff({
          ...selectedStaff,
          id: res.data.id,
          calculatedAmount: res.data.calculatedAmount,
          adjustedAmount: res.data.adjustedAmount,
          notes: res.data.notes,
          statsJson: res.data.statsJson,
          paid: true
        });
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Erreur lors de l'enregistrement de la rémunération.";
      showToast(errMsg, "error");
    } finally {
      setSavingRemuneration(false);
    }
  };

  // Helper to resolve cashier/receptionist username
  const staffUsername = useMemo(() => {
    if (!selectedStaff) return '';
    if (selectedStaff.paymentDetails && selectedStaff.paymentDetails.includes('@')) {
      return selectedStaff.paymentDetails.split('@')[0];
    }
    // Fallback logic matching backend
    return selectedStaff.staffName ? selectedStaff.staffName.toLowerCase().replace(/\s+/g, '.') : '';
  }, [selectedStaff]);

  // Client-side calculations for stats DataTables
  const cashierSessions = useMemo(() => {
    if (!selectedStaff || selectedStaff.staffType.toUpperCase() !== 'CAISSIER') return [];
    return allSessions.filter(s => {
      const isUser = s.cashierUsername === staffUsername;
      const isMonth = s.openingDate && s.openingDate.startsWith(selectedMonth);
      return isUser && isMonth;
    });
  }, [allSessions, selectedStaff, staffUsername, selectedMonth]);

  const receptionistPatients = useMemo(() => {
    if (!selectedStaff || selectedStaff.staffType.toUpperCase() !== 'RECEPTIONNISTE') return [];
    return allPatients.filter(p => {
      const isUser = p.createdBy === staffUsername;
      const isMonth = p.createdAt && p.createdAt.startsWith(selectedMonth);
      return isUser && isMonth;
    });
  }, [allPatients, selectedStaff, staffUsername, selectedMonth]);

  // Client Table Hooks for pagination and search
  const { paginated: paginatedActs, pagination: actsPagination } = useClientTable(detailPrestations, {
    searchKeys: ['actName'],
    initialPageSize: 5
  });

  const { paginated: paginatedSessions, pagination: sessionsPagination } = useClientTable(cashierSessions, {
    searchKeys: ['sessionRef', 'caisseCode'],
    initialPageSize: 5
  });

  const { paginated: paginatedPatients, pagination: patientsPagination } = useClientTable(receptionistPatients, {
    searchKeys: ['patientCode', 'firstName', 'lastName'],
    initialPageSize: 5
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            <Coins size={28} className="text-sky-600" /> Rémunération du personnel
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Gerez individuellement la paie mensuelle, ajustez les montants finaux et validez la rémunération.
          </p>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

        {/* Left Column: Filters + Staff Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
              <Filter size={14} className="text-slate-400" /> Critères & Filtres
            </h3>
          </div>

          {/* Filters Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Mois de paie</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-sky-500 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Catégorie</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-sky-500 bg-slate-50"
              >
                <option value="ALL">Tous les postes</option>
                <option value="MEDECIN">Praticien / Médecin</option>
                <option value="INFIRMIER">Infirmier</option>
                <option value="LABORANTIN">Laborantin</option>
                <option value="CAISSIER">Caissier</option>
                <option value="RECEPTIONNISTE">Réceptionniste</option>
                <option value="AUTRES">Autres</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Type de Contrat</label>
              <select
                value={contractFilter}
                onChange={(e) => setContractFilter(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-sky-500 bg-slate-50"
              >
                <option value="ALL">Tous les contrats</option>
                <option value="permanent">Permanent (Fixe)</option>
                <option value="vacataire">Vacataire (Commissions)</option>
              </select>
            </div>
          </div>

          {/* Staff List */}
          <div className="pt-2">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Personnel ({staffList.length})</h4>

            {loading ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-sky-600 mb-2" size={24} />
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Chargement...</span>
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-10 text-center text-slate-400 italic text-xs">
                Aucun personnel trouvé.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
                {staffList.map((staff) => {
                  const isSelected = selectedStaff?.staffId === staff.staffId;
                  return (
                    <div
                      key={staff.staffId}
                      onClick={() => setSelectedStaff(staff)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 flex items-start gap-2.5 ${isSelected
                        ? 'bg-sky-50/60 border-sky-500 shadow-sm'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50/30'
                        }`}
                    >
                      {/* Avatar Initials */}
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                        {staff.staffName ? staff.staffName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 text-xs truncate leading-snug">{staff.staffName}</p>
                        <div className="flex flex-wrap gap-1 mt-1 items-center">
                          <span className="text-[8px] font-black uppercase px-1 py-0.5 bg-slate-100 text-slate-500 rounded tracking-wider">
                            {staff.staffType}
                          </span>
                          <span className="text-[9px] text-slate-400 capitalize">
                            {staff.contractType}
                          </span>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="text-right shrink-0">
                        {staff.paid ? (
                          <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black uppercase">
                            Validé
                          </span>
                        ) : (
                          <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-black uppercase">
                            À valider
                          </span>
                        )}
                        <span className="block text-[10px] font-black text-slate-800 mt-1">
                          {formatFCFA(staff.paid ? staff.adjustedAmount : staff.calculatedAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center & Bottom: Statistics & Payment Workspace */}
        <div className="lg:col-span-3 space-y-6">

          {!selectedStaff ? (
            /* EMPTY STATE PLACEHOLDER */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Users size={28} />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                  Sélectionnez un employé
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Cliquez sur un membre du personnel dans le panel de gauche pour visualiser ses statistiques d'activité détaillées pour le mois sélectionné ({selectedMonth}), ajuster sa rémunération finale et la valider.
                </p>
              </div>
            </div>
          ) : (
            /* ACTIVE WORKSPACE */
            <div className="space-y-6">

              {/* Selected Staff Info Card */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-lg shadow-inner">
                    {selectedStaff.staffName ? selectedStaff.staffName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'}
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider">{selectedStaff.staffName}</h3>
                    <div className="flex flex-wrap gap-2 mt-1.5 items-center text-xs">
                      <span className="px-2 py-0.5 bg-sky-500 text-white rounded font-black text-[9px] uppercase tracking-wide">
                        {selectedStaff.staffType}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-black text-[9px] uppercase tracking-wide">
                        {selectedStaff.contractType}
                      </span>
                      {selectedStaff.paymentDetails && (
                        <span className="text-slate-400 text-[10px] font-mono">
                          RIB/Num: {selectedStaff.paymentDetails}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Mode de Règlement</span>
                  <span className="text-sm font-black text-sky-400 uppercase tracking-wide">{selectedStaff.paymentMethod || 'ESPECES'}</span>
                </div>
              </div>

              {/* Dynamic Statistics DataTable in the Center */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <Activity size={15} className="text-sky-600" /> Indicateurs & statistiques d'activité ({selectedMonth})
                  </h4>
                </div>

                {/* Stat Cards Row */}
                {selectedStaff.staffType.toUpperCase() === 'CAISSIER' && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nombre de Sessions</span>
                      <span className="text-sm font-black text-slate-800">{cashierSessions.length}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/50 border border-emerald-100/60 rounded-xl">
                      <span className="block text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Total Encaissé</span>
                      <span className="text-sm font-black text-emerald-800">
                        {formatFCFA(cashierSessions.reduce((acc, s) => acc + (s.expectedAmount || 0) - (s.openingBalance || 0), 0))}
                      </span>
                    </div>
                    <div className="p-3 bg-rose-50/50 border border-rose-100/60 rounded-xl">
                      <span className="block text-[8px] font-bold text-rose-600 uppercase tracking-widest">Total Écarts</span>
                      <span className="text-sm font-black text-rose-800">
                        {formatFCFA(cashierSessions.reduce((acc, s) => acc + (s.discrepancy || 0), 0))}
                      </span>
                    </div>
                  </div>
                )}

                {selectedStaff.staffType.toUpperCase() === 'RECEPTIONNISTE' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Patients Enregistrés</span>
                      <span className="text-sm font-black text-slate-800">{receptionistPatients.length}</span>
                    </div>
                  </div>
                )}

                {['MEDECIN', 'PRATICIEN', 'LABORANTIN', 'INFIRMIER'].includes(selectedStaff.staffType.toUpperCase()) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Nombre d'Actes</span>
                      <span className="text-sm font-black text-slate-800">{detailPrestations.length}</span>
                    </div>
                    <div className="p-3 bg-sky-50 border border-sky-100/50 rounded-xl">
                      <span className="block text-[8px] font-bold text-sky-600 uppercase tracking-widest">Chiffre d'Affaires Actes</span>
                      <span className="text-sm font-black text-sky-800">
                        {formatFCFA(detailPrestations.reduce((acc, p) => acc + (p.totalPrice || (p.unitPrice * p.quantity)), 0))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Render the appropriate DataTable */}
                {/* 1. Practitioner Medical Acts DataTable */}
                {['MEDECIN', 'PRATICIEN', 'LABORANTIN', 'INFIRMIER'].includes(selectedStaff.staffType.toUpperCase()) && (
                  <DataTable
                    title={`Actes réalisés par ${selectedStaff.staffName}`}
                    data={paginatedActs}
                    loading={loadingDetails}
                    pagination={actsPagination}
                    columns={[
                      {
                        label: "Date",
                        key: "createdAt",
                        render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('fr-FR') + ' ' + new Date(row.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'
                      },
                      { label: "Désignation Acte", key: "actName" },
                      {
                        label: "Patient",
                        key: "patientId",
                        render: (row) => patientsMap[row.patientId] || 'Patient inconnu'
                      },
                      {
                        label: "Tarif",
                        key: "unitPrice",
                        render: (row) => formatFCFA(row.unitPrice)
                      },
                      {
                        label: "Quantité",
                        key: "quantity"
                      },
                      {
                        label: "Total Acte",
                        key: "totalPrice",
                        render: (row) => formatFCFA(row.totalPrice || (row.unitPrice * row.quantity))
                      }
                    ]}
                  />
                )}

                {/* 2. Cashier Cash Sessions DataTable */}
                {selectedStaff.staffType.toUpperCase() === 'CAISSIER' && (
                  <DataTable
                    title={`Sessions de caisse de ${selectedStaff.staffName}`}
                    data={paginatedSessions}
                    pagination={sessionsPagination}
                    columns={[
                      { label: "Référence", key: "sessionRef" },
                      { label: "Caisse", key: "caisseCode" },
                      {
                        label: "Date Ouverture",
                        key: "openingDate",
                        render: (row) => row.openingDate ? new Date(row.openingDate).toLocaleString('fr-FR') : '—'
                      },
                      {
                        label: "Date Clôture",
                        key: "closingDate",
                        render: (row) => row.closingDate ? new Date(row.closingDate).toLocaleString('fr-FR') : '—'
                      },
                      {
                        label: "Attendu machine",
                        key: "expectedAmount",
                        render: (row) => formatFCFA(row.expectedAmount)
                      },
                      {
                        label: "Écart constaté",
                        key: "discrepancy",
                        render: (row) => (
                          <span className={`font-black ${row.discrepancy && Number(row.discrepancy) !== 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatFCFA(row.discrepancy || 0)}
                          </span>
                        )
                      }
                    ]}
                  />
                )}

                {/* 3. Receptionist Patient Registrations DataTable */}
                {selectedStaff.staffType.toUpperCase() === 'RECEPTIONNISTE' && (
                  <DataTable
                    title={`Patients créés par ${selectedStaff.staffName}`}
                    data={paginatedPatients}
                    pagination={patientsPagination}
                    columns={[
                      {
                        label: "Date d'enregistrement",
                        key: "createdAt",
                        render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString('fr-FR') : '—'
                      },
                      { label: "Code Patient", key: "patientCode" },
                      { label: "Nom & Prénom", key: "fullName", render: (row) => `${row.firstName} ${row.lastName}` },
                      { label: "Téléphone", key: "phone1" },
                      { label: "Adresse", key: "address" }
                    ]}
                  />
                )}

                {/* 4. Others / Unhandled types */}
                {!['MEDECIN', 'PRATICIEN', 'LABORANTIN', 'INFIRMIER', 'CAISSIER', 'RECEPTIONNISTE'].includes(selectedStaff.staffType.toUpperCase()) && (
                  <div className="p-6 text-center border border-slate-200 border-dashed rounded-xl text-slate-400 italic text-xs bg-slate-50">
                    Aucun log d'activité spécifique requis pour ce profil (Autres).
                  </div>
                )}
              </div>

              {/* Bottom Area: Adjustment and Payment Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                    <Wallet size={15} className="text-sky-600" /> Renseigner ou ajuster le montant du salaire final
                  </h4>
                </div>

                {selectedStaff.paid ? (
                  /* ALREADY PAID NOTICE */
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span>Rémunération déjà validée pour ce mois.</span>
                    </div>
                    <div className="text-slate-600 text-xs font-semibold pl-6 space-y-1">
                      <p>Montant théorique : {formatFCFA(selectedStaff.calculatedAmount)}</p>
                      <p>Montant validé final : <span className="font-bold text-emerald-950">{formatFCFA(selectedStaff.adjustedAmount)}</span></p>
                      {selectedStaff.notes && <p className="italic text-slate-500">Note : "{selectedStaff.notes}"</p>}
                    </div>
                  </div>
                ) : (
                  /* UNPAID INPUT FORM */
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

                      {/* Theoretical base info */}
                      <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl h-[70px] flex flex-col justify-center">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Montant Théorique</span>
                        <span className="text-xs font-black text-slate-600">{formatFCFA(selectedStaff.calculatedAmount)}</span>
                      </div>

                      {/* Adjusted final salary input */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Montant Final à Payer *</label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="0"
                            value={adjustedAmount}
                            onChange={(e) => setAdjustedAmount(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs font-black text-slate-800 outline-none focus:border-sky-500 h-[38px] pr-12 bg-white"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">FCFA</span>
                        </div>
                      </div>

                      {/* Notes / Justification */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes & Explications</label>
                        <input
                          type="text"
                          placeholder="Ajustement, bonus, retenue..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-sky-500 h-[38px] bg-white"
                        />
                      </div>

                      {/* Payment Debit Source selector */}
                      {selectedStaff.paymentMethod === 'VIREMENT' ? (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Banque de Règlement *</label>
                          <select
                            required
                            value={selectedBankAccountId}
                            onChange={(e) => setSelectedBankAccountId(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-sky-500 h-[38px] bg-white"
                          >
                            <option value="">Compte à débiter</option>
                            {bankAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.bankName} - {acc.rib} {acc.primary ? '(Principal)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Caisse de Règlement</label>
                          <div className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-black text-teal-600 bg-slate-50 h-[38px] flex items-center">
                            🏢 Caisse Principale (CAISSE_PRINCIPALE)
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Form submission controls */}
                    <div className="flex justify-end pt-2 border-t border-slate-100">
                      <button
                        type="submit"
                        disabled={savingRemuneration}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase flex items-center gap-2 transition-all shadow-md hover:scale-[1.02] active:scale-95 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingRemuneration ? (
                          <>
                            <Loader2 className="animate-spin" size={14} /> Traitement...
                          </>
                        ) : (
                          <>
                            <Check size={14} /> Valider & Enregistrer la Rémunération
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default RemunerationCalculView;
