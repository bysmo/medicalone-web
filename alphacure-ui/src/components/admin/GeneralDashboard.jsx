import { useState, useEffect } from 'react';
import {
  Users, Activity, Stethoscope, Landmark, Briefcase, Calendar,
  Loader2, DollarSign, CreditCard, Sparkles
} from 'lucide-react';
import {
  patientService, prestationService, practitionerService,
  cashSessionService
} from '../../services/api';
import { hasRole } from '../../services/auth';

// Helper to format currency
const formatFCFA = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount).replace('XOF', 'FCFA');
};

// Helper to calculate age from birthDate
const calculateAge = (dobString) => {
  if (!dobString) return null;
  try {
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  } catch {
    return null;
  }
};

// Staff specialty parser matching StaffManagement.jsx
const parseStaffSpecialty = (specStr) => {
  const parts = (specStr || '').split('|');
  const type = parts[0] || 'MEDECIN';
  return {
    type,
    specialty: parts[1] || 'Médecine Générale',
    contractType: parts[2] || 'permanent',
    value: parts[3] || '0',
    lastName: parts[4] || '',
    firstName: parts[5] || '',
    dob: parts[6] || '',
    gender: parts[7] || 'M',
    address: parts[8] || '',
    cnib: parts[9] || '',
    studyLevel: parts[10] || 'Bac'
  };
};

const GeneralDashboard = ({ showToast }) => {
  const canViewFinancials = hasRole('ADMIN') || hasRole('MANAGER_CLINIQUE');

  // Date Range States - Default to first day of current month to today
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  // Raw Database Datasets
  const [patients, setPatients] = useState([]);
  const [prestations, setPrestations] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [transactions, setTransactions] = useState([]);

  // Computed Aggregated States
  const [stats, setStats] = useState({
    totalPatients: 0,
    newPatientsOnPeriod: 0,
    insuredPatientsCount: 0,
    uninsuredPatientsCount: 0,
    malePatientsCount: 0,
    femalePatientsCount: 0,
    ageGroups: { children: 0, youth: 0, adults: 0, seniors: 0 },
    
    totalPrestationsOnPeriod: 0,
    prestationsByStatus: { EN_ATTENTE: 0, REGLEE: 0, TERMINEE: 0, ANNULEE: 0, REMBOURSEE: 0, ABANDONNEE: 0 },
    actsBySpecialty: {},
    
    totalInflow: 0,  // ENCAISSEMENT
    totalOutflow: 0, // DECAISSEMENT
    totalExpenses: 0, // DECAISSEMENT without "Remboursement"
    totalRefunds: 0, // DECAISSEMENT with "Remboursement"
    financialHistory: [], // Day by day trend
    
    staffByType: {},
    doctorsBySpecialty: {}
  });

  // Asynchronously load transactions for cash sessions overlapping with the date range
  const loadTransactionsForPeriod = async (allSessions, start, end) => {
    setTxLoading(true);
    try {
      const filterStart = new Date(start + 'T00:00:00');
      const filterEnd = new Date(end + 'T23:59:59');

      // Filter sessions that overlap with date range
      const overlappingSessions = allSessions.filter(s => {
        const opening = new Date(s.openingDate);
        const closing = s.closingDate ? new Date(s.closingDate) : new Date();
        return (opening <= filterEnd && closing >= filterStart);
      });

      // Load transactions for each session in parallel
      const txPromises = overlappingSessions.map(s =>
        cashSessionService.getTransactions(s.id).catch(() => ({ data: [] }))
      );
      const txResList = await Promise.all(txPromises);
      const allTx = txResList.flatMap(res => res.data || []);

      setTransactions(allTx);
    } catch (err) {
      console.error("Error loading session transactions", err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        const promises = [
          patientService.search('', 0, 10000).catch(() => ({ data: { content: [] } })),
          prestationService.getAll().catch(() => ({ data: [] })),
          practitionerService.getAll().catch(() => ({ data: [] }))
        ];
        if (canViewFinancials) {
          promises.push(cashSessionService.getAll().catch(() => ({ data: [] })));
        }

        const results = await Promise.all(promises);

        const pats = results[0].data?.content || [];
        const prests = results[1].data || [];
        const practs = results[2].data || [];
        const sess = canViewFinancials ? (results[3]?.data || []) : [];

        setPatients(pats);
        setPrestations(prests);
        setPractitioners(practs);

        if (canViewFinancials) {
          setSessions(sess);
          // Once base data is set, fetch transaction details for sessions within the selected range
          await loadTransactionsForPeriod(sess, startDate, endDate);
        }

      } catch (err) {
        console.error("Error loading dashboard raw datasets", err);
        showToast("Erreur lors de la récupération des données de base.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute metrics whenever datasets, start, or end dates change
  useEffect(() => {
    const computeAggregations = () => {
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');

      // 1. Patient Demographics & Growth
      let totalPats = patients.length;
      let newPats = 0;
      let insuredCount = 0;
      let uninsuredCount = 0;
      let maleCount = 0;
      let femaleCount = 0;
      const ageGrps = { children: 0, youth: 0, adults: 0, seniors: 0 };

      patients.forEach(p => {
        // Insurance status
        if (p.insurer) {
          insuredCount++;
        } else {
          uninsuredCount++;
        }

        // Gender status
        const g = (p.gender || 'M').toUpperCase();
        if (g.startsWith('F')) {
          femaleCount++;
        } else {
          maleCount++;
        }

        // Registration period
        if (p.createdAt) {
          const cDate = new Date(p.createdAt);
          if (cDate >= start && cDate <= end) {
            newPats++;
          }
        }

        // Age distribution
        const age = calculateAge(p.birthDate);
        if (age !== null) {
          if (age < 15) ageGrps.children++;
          else if (age < 25) ageGrps.youth++;
          else if (age < 60) ageGrps.adults++;
          else ageGrps.seniors++;
        }
      });

      // 2. Prestations & Acts
      let filteredPrestations = prestations.filter(p => {
        if (!p.createdAt) return false;
        const cDate = new Date(p.createdAt);
        return cDate >= start && cDate <= end;
      });

      const statusCounts = { EN_ATTENTE: 0, REGLEE: 0, TERMINEE: 0, ANNULEE: 0, REMBOURSEE: 0, ABANDONNEE: 0 };
      const actSpecialtyCounts = {};

      filteredPrestations.forEach(p => {
        // Prestation status
        if (statusCounts[p.status] !== undefined) {
          statusCounts[p.status]++;
        }

        // Act specialty matching
        // Find the practitioner's specialty from practitioner list
        const doc = practitioners.find(pr => pr.id === p.practitionerId);
        let specialtyName = 'Médecine Générale';
        if (doc) {
          const parsedDoc = parseStaffSpecialty(doc.specialty);
          specialtyName = parsedDoc.specialty || 'Médecine Générale';
        } else {
          // Fallback to prestation nature configuration
          if (p.nature === 'EXAMENS') specialtyName = 'Laboratoire';
          else if (p.nature === 'SEANCES') specialtyName = 'Kinésithérapie';
          else if (p.nature === 'SOINS_INFIRMIERS') specialtyName = 'Soins Infirmiers';
        }

        actSpecialtyCounts[specialtyName] = (actSpecialtyCounts[specialtyName] || 0) + 1;
      });

      // 3. Treasury & Financial transactions
      let inflow = 0;
      let outflow = 0;
      let expenses = 0;
      let refunds = 0;

      // Daily aggregation for the trend chart
      const dailyData = {};
      // Pre-populate date range keys to draw continuous chart
      let curr = new Date(start);
      while (curr <= end) {
        const dStr = curr.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
        dailyData[dStr] = { date: dStr, encaissements: 0, decaissements: 0 };
        curr.setDate(curr.getDate() + 1);
      }

      const filteredTransactions = transactions.filter(t => {
        if (!t.createdAt) return false;
        const cDate = new Date(t.createdAt);
        return cDate >= start && cDate <= end;
      });

      filteredTransactions.forEach(t => {
        const amount = Number(t.amount || 0);
        const labelLower = (t.label || '').toLowerCase();
        const dateKey = new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

        if (t.type === 'ENCAISSEMENT') {
          inflow += amount;
          if (dailyData[dateKey]) dailyData[dateKey].encaissements += amount;
        } else if (t.type === 'DECAISSEMENT') {
          outflow += amount;
          if (dailyData[dateKey]) dailyData[dateKey].decaissements += amount;

          // Categorize into refunds vs general operational expenses
          if (labelLower.includes('remboursement') || labelLower.includes('annulation')) {
            refunds += amount;
          } else {
            expenses += amount;
          }
        }
      });

      // Convert daily trend object to ordered list for SVG chart
      const financialHistory = Object.values(dailyData);

      // 4. HR & Staff directories
      const staffTypeCounts = {};
      const doctorSpecialtyCounts = {};

      practitioners.forEach(pr => {
        const parsed = parseStaffSpecialty(pr.specialty);
        const role = parsed.type;
        staffTypeCounts[role] = (staffTypeCounts[role] || 0) + 1;

        if (role === 'MEDECIN') {
          const spec = parsed.specialty || 'Médecine Générale';
          doctorSpecialtyCounts[spec] = (doctorSpecialtyCounts[spec] || 0) + 1;
        }
      });

      setStats({
        totalPatients: totalPats,
        newPatientsOnPeriod: newPats,
        insuredPatientsCount: insuredCount,
        uninsuredPatientsCount: uninsuredCount,
        malePatientsCount: maleCount,
        femalePatientsCount: femaleCount,
        ageGroups: ageGrps,
        
        totalPrestationsOnPeriod: filteredPrestations.length,
        prestationsByStatus: statusCounts,
        actsBySpecialty: actSpecialtyCounts,
        
        totalInflow: inflow,
        totalOutflow: outflow,
        totalExpenses: expenses,
        totalRefunds: refunds,
        financialHistory,
        
        staffByType: staffTypeCounts,
        doctorsBySpecialty: doctorSpecialtyCounts
      });
    };

    computeAggregations();
  }, [patients, prestations, practitioners, transactions, startDate, endDate]);

  // Quick Preset Helper
  const applyPreset = (presetName) => {
    const now = new Date();
    let startStr;
    let endStr = now.toISOString().split('T')[0];

    switch (presetName) {
      case 'TODAY': {
        startStr = endStr;
        break;
      }
      case 'WEEK': {
        const currentDay = now.getDay();
        const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
        const monday = new Date(now);
        monday.setDate(now.getDate() - distanceToMonday);
        startStr = monday.toISOString().split('T')[0];
        break;
      }
      case 'MONTH': {
        startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        break;
      }
      case '3MONTHS': {
        startStr = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
        break;
      }
      case 'YEAR': {
        startStr = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      }
      default:
        return;
    }

    setStartDate(startStr);
    setEndDate(endStr);
    if (canViewFinancials) {
      loadTransactionsForPeriod(sessions, startStr, endStr);
    }
    showToast("Filtre appliqué avec succès", "success");
  };

  const handleDateChange = (type, val) => {
    let start = startDate;
    let end = endDate;
    if (type === 'start') {
      start = val;
      setStartDate(val);
    } else {
      end = val;
      setEndDate(val);
    }
    if (canViewFinancials) {
      loadTransactionsForPeriod(sessions, start, end);
    }
  };

  // Helper to render SVG financial trend area graph
  const renderFinancialChart = () => {
    const history = stats.financialHistory;
    if (history.length === 0) return null;

    const width = 600;
    const height = 150;
    const padding = 25;

    // Find max value to scale chart appropriately
    const maxVal = Math.max(
      ...history.map(d => Math.max(d.encaissements, d.decaissements)),
      10000 // default minimum baseline height
    );

    const xStep = (width - padding * 2) / Math.max(history.length - 1, 1);
    const yScale = (height - padding * 2) / maxVal;

    // Calculate coordinates
    const encPoints = history.map((d, i) => {
      const x = padding + i * xStep;
      const y = height - padding - d.encaissements * yScale;
      return { x, y };
    });

    const decPoints = history.map((d, i) => {
      const x = padding + i * xStep;
      const y = height - padding - d.decaissements * yScale;
      return { x, y };
    });

    const makePath = (points) => {
      if (points.length === 0) return '';
      return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    };

    const makeAreaPath = (points) => {
      if (points.length === 0) return '';
      return `${makePath(points)} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
    };

    // Pick 5 date markers to show on bottom axis
    const axisIndexes = [];
    if (history.length > 1) {
      const step = Math.ceil(history.length / 5);
      for (let i = 0; i < history.length; i += step) {
        axisIndexes.push(i);
      }
      if (!axisIndexes.includes(history.length - 1)) {
        axisIndexes.push(history.length - 1);
      }
    } else {
      axisIndexes.push(0);
    }

    return (
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => (
          <line
            key={idx}
            x1={padding}
            y1={padding + r * (height - padding * 2)}
            x2={width - padding}
            y2={padding + r * (height - padding * 2)}
            stroke="#f1f5f9"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        ))}

        {/* Inflow Area & Line */}
        {encPoints.length > 0 && (
          <>
            <path d={makeAreaPath(encPoints)} fill="url(#inflowGrad)" />
            <path d={makePath(encPoints)} fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Outflow Area & Line */}
        {decPoints.length > 0 && (
          <>
            <path d={makeAreaPath(decPoints)} fill="url(#outflowGrad)" />
            <path d={makePath(decPoints)} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        {/* Bottom date axis label line */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Axis labels */}
        {axisIndexes.map((idx) => {
          const pt = encPoints[idx];
          if (!pt) return null;
          return (
            <g key={idx} transform={`translate(${pt.x}, ${height - 8})`}>
              <text textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold">
                {history[idx].date}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-sky-600" size={36} />
        <p className="text-slate-500 font-black uppercase text-xs tracking-widest animate-pulse">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl text-sky-400 shadow-inner">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">
              Tableau de bord de la clinique
            </h2>
            <p className="text-xs text-sky-200/80 mt-1 font-medium">
              Supervision des effectifs, de la trésorerie et de l'activité médicale en temps réel.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Date Range Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-sky-600" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Période d'analyse</h3>
          </div>
          
          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-100 rounded-xl p-1 shrink-0">
            {[
              { id: 'TODAY', label: "Aujourd'hui" },
              { id: 'WEEK', label: "Cette semaine" },
              { id: 'MONTH', label: "Ce mois" },
              { id: '3MONTHS', label: "3 derniers mois" },
              { id: 'YEAR', label: "Année" },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={e => handleDateChange('start', e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Date de fin</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => handleDateChange('end', e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-50 border border-slate-200/50 rounded-xl p-3 h-10">
            {txLoading ? (
              <Loader2 size={13} className="animate-spin text-sky-600" />
            ) : (
              <Activity size={13} className="text-emerald-500" />
            )}
            <span className="font-bold">
              {txLoading ? "Chargement des transactions..." : "Flux de données temps réel actif"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. KPI Stats Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${canViewFinancials ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4`}>
        {/* KPI 1: Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-sky-300 transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Patients</p>
            <p className="text-2xl font-black text-slate-800">{stats.totalPatients}</p>
            <p className="text-[9px] font-bold text-sky-600">
              +{stats.newPatientsOnPeriod} sur la période
            </p>
          </div>
          <div className="p-3.5 bg-sky-50 rounded-xl text-sky-600 group-hover:scale-110 transition-transform"><Users size={22} /></div>
        </div>

        {/* KPI 2: Prestations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-emerald-300 transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Actes & Prestations</p>
            <p className="text-2xl font-black text-slate-800">{stats.totalPrestationsOnPeriod}</p>
            <p className="text-[9px] font-bold text-emerald-600">
              {stats.prestationsByStatus.TERMINEE} actes terminés
            </p>
          </div>
          <div className="p-3.5 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform"><Activity size={22} /></div>
        </div>

        {canViewFinancials && (
          <>
            {/* KPI 3: Encaissements */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-teal-300 transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Encaissements</p>
                <p className="text-2xl font-black text-slate-800 font-mono text-[20px]">{formatFCFA(stats.totalInflow)}</p>
                <p className="text-[9px] font-bold text-teal-600">Entrées de caisse réelles</p>
              </div>
              <div className="p-3.5 bg-teal-50 rounded-xl text-teal-600 group-hover:scale-110 transition-transform"><DollarSign size={22} /></div>
            </div>

            {/* KPI 4: Decaissements & Dépenses */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-rose-300 transition-all hover:shadow-md">
              <div className="space-y-1">
                <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Décaissements & Dépenses</p>
                <p className="text-2xl font-black text-rose-600 font-mono text-[20px]">{formatFCFA(stats.totalOutflow)}</p>
                <p className="text-[9px] font-bold text-rose-500">
                  {formatFCFA(stats.totalExpenses)} d'opérations
                </p>
              </div>
              <div className="p-3.5 bg-rose-50 rounded-xl text-rose-600 group-hover:scale-110 transition-transform"><CreditCard size={22} /></div>
            </div>
          </>
        )}
      </div>

      {/* 4. Demographics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insurance & Gender ratios */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Users size={16} className="text-sky-600" />
            <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Démographie Patients</h4>
          </div>

          <div className="space-y-5">
            {/* Assured Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>Couverture d'Assurance</span>
                <span>
                  {stats.totalPatients > 0 ? Math.round((stats.insuredPatientsCount / stats.totalPatients) * 100) : 0}% Assurés
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${stats.totalPatients > 0 ? (stats.insuredPatientsCount / stats.totalPatients) * 100 : 0}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>{stats.insuredPatientsCount} assurés</span>
                <span>{stats.uninsuredPatientsCount} payant direct (100% Cash)</span>
              </div>
            </div>

            {/* Gender Ratio */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-700">
                <span>Répartition par Sexe</span>
                <span>
                  {stats.totalPatients > 0 ? Math.round((stats.femalePatientsCount / stats.totalPatients) * 100) : 0}% Femmes
                </span>
              </div>
              <div className="h-2.5 w-full bg-sky-500 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${stats.totalPatients > 0 ? (stats.femalePatientsCount / stats.totalPatients) * 100 : 0}%` }}
                  className="h-full bg-pink-500"
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-sky-600">{stats.malePatientsCount} Hommes ({stats.totalPatients > 0 ? Math.round((stats.malePatientsCount / stats.totalPatients) * 100) : 0}%)</span>
                <span className="text-pink-600">{stats.femalePatientsCount} Femmes ({stats.totalPatients > 0 ? Math.round((stats.femalePatientsCount / stats.totalPatients) * 100) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Age Groups distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Activity size={16} className="text-sky-600" />
            <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Tranches d'âge des Patients</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Enfants (0-14)', count: stats.ageGroups.children, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              { label: 'Jeunes (15-24)', count: stats.ageGroups.youth, color: 'bg-sky-50 text-sky-700 border-sky-100' },
              { label: 'Adultes (25-59)', count: stats.ageGroups.adults, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
              { label: 'Seniors (60+)', count: stats.ageGroups.seniors, color: 'bg-amber-50 text-amber-700 border-amber-100' }
            ].map((grp, idx) => (
              <div key={idx} className={`p-4 rounded-xl border text-center ${grp.color} flex flex-col justify-between`}>
                <div className="text-[9px] font-black uppercase tracking-wider">{grp.label}</div>
                <div className="text-2xl font-black mt-2">{grp.count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Activity & Prestations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Acts by Specialty */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Stethoscope size={16} className="text-sky-600" />
            <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Volume d'Actes par Spécialité</h4>
          </div>

          {Object.keys(stats.actsBySpecialty).length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-bold text-xs">Aucun acte médical enregistré sur cette période</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(stats.actsBySpecialty).map(([spec, count]) => {
                const total = stats.totalPrestationsOnPeriod || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={spec} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span className="uppercase text-[11px] tracking-wide">{spec}</span>
                      <span>{count} acte{count > 1 ? 's' : ''} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className="h-full bg-sky-600 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prestations by Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Briefcase size={16} className="text-sky-600" />
            <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Statuts des Prestations</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'En attente', count: stats.prestationsByStatus.EN_ATTENTE, border: 'border-amber-200', text: 'text-amber-700', bg: 'bg-amber-50' },
              { label: 'Réglées', count: stats.prestationsByStatus.REGLEE, border: 'border-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Terminées', count: stats.prestationsByStatus.TERMINEE, border: 'border-sky-200', text: 'text-sky-700', bg: 'bg-sky-50' },
              { label: 'Annulées', count: stats.prestationsByStatus.ANNULEE, border: 'border-rose-200', text: 'text-rose-700', bg: 'bg-rose-50' },
              { label: 'Remboursées', count: stats.prestationsByStatus.REMBOURSEE, border: 'border-purple-200', text: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'Abandonnées', count: stats.prestationsByStatus.ABANDONNEE, border: 'border-slate-300', text: 'text-slate-700', bg: 'bg-slate-50' },
            ].map((st, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${st.border} ${st.bg} flex flex-col justify-between`}>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{st.label}</span>
                <span className={`text-xl font-black mt-1 ${st.text}`}>{st.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. Financial Trends Section */}
      {canViewFinancials && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Landmark size={18} className="text-sky-600" />
              <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Évolution Financière (Flux de trésorerie)</h4>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-teal-600 block" /> Encaissements</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500 block" /> Décaissements</div>
            </div>
          </div>

          {/* Detailed treasury stats summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
            <div className="space-y-0.5">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Entrées Réelles (Inflow)</span>
              <span className="text-lg font-black text-teal-700 font-mono">{formatFCFA(stats.totalInflow)}</span>
            </div>
            <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Dépenses Exploitation</span>
              <span className="text-lg font-black text-rose-600 font-mono">{formatFCFA(stats.totalExpenses)}</span>
            </div>
            <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block">Remboursements Validés</span>
              <span className="text-lg font-black text-amber-600 font-mono">{formatFCFA(stats.totalRefunds)}</span>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="h-44 w-full relative">
            {stats.financialHistory.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-xs">Aucun mouvement de trésorerie sur cette période</div>
            ) : (
              renderFinancialChart()
            )}
          </div>
        </div>
      )}

      {/* 7. Human Resources Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
          <Users size={16} className="text-sky-600" />
          <h4 className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Effectifs & Répartition RH</h4>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff by Type */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 lg:col-span-1">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Catégories de Personnel</h5>
            {Object.keys(stats.staffByType).length === 0 ? (
              <div className="text-slate-400 text-xs font-bold py-6 text-center">Aucun personnel enregistré</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.staffByType).map(([role, count]) => (
                  <div key={role} className="flex justify-between items-center text-xs bg-white border border-slate-200/50 rounded-lg p-2 font-bold text-slate-700">
                    <span className="text-[10px] uppercase font-black text-slate-600">{role}</span>
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Doctors by Specialty */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 lg:col-span-1">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Médecins par Spécialité</h5>
            {Object.keys(stats.doctorsBySpecialty).length === 0 ? (
              <div className="text-slate-400 text-xs font-bold py-6 text-center">Aucun médecin enregistré</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats.doctorsBySpecialty).map(([spec, count]) => (
                  <div key={spec} className="flex justify-between items-center text-xs bg-white border border-slate-200/50 rounded-lg p-2 font-bold text-slate-700">
                    <span className="text-[10px] uppercase font-black text-slate-600">{spec}</span>
                    <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-[10px]">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Staff directory summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 lg:col-span-1">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Résumé du Staff Actif</h5>
            <div className="space-y-2 overflow-y-auto max-h-48 pr-1">
              {practitioners.length === 0 ? (
                <div className="text-slate-400 text-xs font-bold py-6 text-center">Aucun membre dans la liste</div>
              ) : (
                practitioners.map(pr => {
                  const parsed = parseStaffSpecialty(pr.specialty);
                  return (
                    <div key={pr.id} className="flex justify-between items-center text-xs bg-white border border-slate-200/50 rounded-lg p-2.5 shadow-sm">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate leading-tight uppercase text-[11px]">{pr.fullName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{parsed.type} • {parsed.type === 'MEDECIN' ? parsed.specialty : (parsed.type === 'CAISSIER' ? parsed.caisse : parsed.contractType)}</p>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${pr.isActive ? 'bg-emerald-400 shadow-sm shadow-emerald-200' : 'bg-slate-300'}`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default GeneralDashboard;
