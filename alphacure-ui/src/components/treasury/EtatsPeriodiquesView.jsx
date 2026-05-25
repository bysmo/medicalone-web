import { useState, useEffect } from 'react';
import {
  Loader2, DollarSign, ArrowUpRight, ArrowDownRight,
  TrendingUp, Activity, Landmark, FileText
} from 'lucide-react';
import {
  prestationService, practitionerService, cashSessionService
} from '../../services/api';
import DataTable from '../ui/DataTable';
import { useClientTable } from '../../hooks/useClientTable';

const formatFCFA = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0
  }).format(amount || 0).replace('XOF', 'FCFA');
};

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

const EtatsPeriodiquesView = ({ showToast }) => {
  const [activeSubTab, setActiveSubTab] = useState('synthese'); // 'synthese' / 'details'

  // Global Date Range (default: today)
  const [startDate, setStartDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Data states
  const [prestations, setPrestations] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  // Detailed view filters
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [searchText, setSearchText] = useState('');

  // Fetch static resources (practitioners, prestations, sessions)
  useEffect(() => {
    async function loadBaseData() {
      setLoading(true);
      try {
        const [prestRes, practRes, sessRes] = await Promise.all([
          prestationService.getAll().catch(() => ({ data: [] })),
          practitionerService.getAll().catch(() => ({ data: [] })),
          cashSessionService.getAll().catch(() => ({ data: [] }))
        ]);

        setPrestations(prestRes.data || []);
        setPractitioners(practRes.data || []);
        setSessions(sessRes.data || []);
      } catch (err) {
        console.error("Error loading periodic statements base data", err);
        showToast("Erreur lors du chargement des données de base.", "error");
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(() => {
      loadBaseData();
    }, 0);
    return () => clearTimeout(timer);
  }, [showToast]);

  // Fetch transactions dynamically when date range or sessions change
  const loadTransactionsForPeriod = async (allSessions, start, end) => {
    setTxLoading(true);
    try {
      const filterStart = new Date(start + 'T00:00:00');
      const filterEnd = new Date(end + 'T23:59:59');

      // Filter sessions overlapping with the date range
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
      console.error("Error loading transactions for period", err);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (sessions.length > 0) {
      const timer = setTimeout(() => {
        loadTransactionsForPeriod(sessions, startDate, endDate);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [sessions, startDate, endDate]);

  // Helper to map practitioner ID to details
  const getPractitionerDetails = (pratId) => {
    if (!pratId) return { name: 'Non assigné', specialty: 'Médecine Générale' };
    const p = practitioners.find(prat => prat.id === pratId);
    if (!p) return { name: 'Non assigné', specialty: 'Médecine Générale' };
    const parsed = parseStaffSpecialty(p.specialty);
    return {
      name: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.username || 'Non assigné',
      specialty: parsed.specialty
    };
  };

  // Generate unique list of specialties for filter dropdown
  const uniqueSpecialties = Array.from(new Set(practitioners.map(pr => {
    const parsed = parseStaffSpecialty(pr.specialty);
    return parsed.specialty;
  }).filter(Boolean))).sort();

  // Generate unique list of doctors for filter dropdown
  const doctorsList = practitioners.filter(pr => {
    const parsed = parseStaffSpecialty(pr.specialty).type === 'MEDECIN';
    return parsed;
  }).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  // Calculate daily data mapping over the selected period
  const getDailyAggregation = () => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    
    // Generate dates map
    const dailyMap = {};
    const curr = new Date(start);
    while (curr <= end) {
      const dateStr = curr.toISOString().split('T')[0];
      dailyMap[dateStr] = {
        dateStr,
        encaissements: 0,
        depenses: 0,
        gainsDifferes: 0,
        recettes: 0,
        resultatNet: 0
      };
      curr.setDate(curr.getDate() + 1);
    }

    // Accumulate actual cash transactions
    transactions.forEach(t => {
      if (t.status === 'PENDING' || t.status === 'CANCELLED') return;
      
      const tDate = new Date(t.createdAt).toISOString().split('T')[0];
      if (dailyMap[tDate]) {
        const amount = Number(t.amount || 0);
        if (t.type === 'ENCAISSEMENT') {
          dailyMap[tDate].encaissements += amount;
        } else if (t.type === 'DECAISSEMENT') {
          dailyMap[tDate].depenses += amount;
        }
      }
    });

    // Accumulate insurance shares (gains differes) from invoice lines
    prestations.forEach(line => {
      if (line.status === 'ABANDONNEE' || line.status === 'ANNULEE') return;

      const pDate = new Date(line.createdAt).toISOString().split('T')[0];
      if (dailyMap[pDate]) {
        const insShare = Number(line.insuranceShare || 0);
        dailyMap[pDate].gainsDifferes += insShare;
      }
    });

    // Calculate derived fields (recettes = encaissements + gainsDifferes, net = encaissements - depenses)
    const sortedDays = Object.values(dailyMap).sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    sortedDays.forEach(day => {
      day.recettes = day.encaissements + day.gainsDifferes;
      day.resultatNet = day.encaissements - day.depenses;
    });

    return sortedDays;
  };

  const dailyHistory = getDailyAggregation();

  // Aggregate totals
  const totalEncaissements = dailyHistory.reduce((sum, d) => sum + d.encaissements, 0);
  const totalDepenses = dailyHistory.reduce((sum, d) => sum + d.depenses, 0);
  const totalGainsDifferes = dailyHistory.reduce((sum, d) => sum + d.gainsDifferes, 0);
  const totalRecettes = dailyHistory.reduce((sum, d) => sum + d.recettes, 0);
  const totalNet = dailyHistory.reduce((sum, d) => sum + d.resultatNet, 0);

  // Filter detailed prestations list
  const getFilteredPrestations = () => {
    const filterStart = new Date(startDate + 'T00:00:00');
    const filterEnd = new Date(endDate + 'T23:59:59');

    return prestations.filter(line => {
      // Date filter
      const pDate = new Date(line.createdAt);
      if (pDate < filterStart || pDate > filterEnd) return false;

      // Practitioner details mapping
      const pInfo = getPractitionerDetails(line.practitionerId);

      // Specialty filter
      if (filterSpecialty && pInfo.specialty !== filterSpecialty) return false;

      // Doctor filter
      if (filterDoctor && line.practitionerId !== filterDoctor) return false;

      // Search text filter (patient name, act name, invoice reference, etc.)
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const matchAct = (line.actName || '').toLowerCase().includes(query);
        const matchDoc = pInfo.name.toLowerCase().includes(query);
        const matchInvoice = (line.invoiceId || '').toLowerCase().includes(query);
        return matchAct || matchDoc || matchInvoice;
      }

      return true;
    });
  };

  const filteredPrestations = getFilteredPrestations();

  // Setup Client Table for Detailed Prestations
  const detailedColumns = [
    {
      label: 'Date & Heure',
      key: 'createdAt',
      render: (row) => <span className="font-semibold text-slate-500">{new Date(row.createdAt).toLocaleString()}</span>
    },
    {
      label: 'Prestation / Acte',
      key: 'actName',
      render: (row) => <span className="font-bold text-slate-800">{row.actName}</span>
    },
    {
      label: 'Médecin / Praticien',
      key: 'practitionerId',
      render: (row) => {
        const details = getPractitionerDetails(row.practitionerId);
        return (
          <div>
            <span className="font-black text-slate-700 block uppercase text-[11px]">{details.name}</span>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{details.specialty}</span>
          </div>
        );
      }
    },
    {
      label: 'Part Patient (Especes)',
      key: 'patientShare',
      render: (row) => <span className="font-mono font-bold text-slate-600">{formatFCFA(row.patientShare)}</span>
    },
    {
      label: 'Part Assurance (Différée)',
      key: 'insuranceShare',
      render: (row) => (
        <span className={`font-mono font-bold ${row.insuranceShare > 0 ? 'text-sky-600' : 'text-slate-400'}`}>
          {row.insuranceShare > 0 ? `+${formatFCFA(row.insuranceShare)}` : '0 FCFA'}
        </span>
      )
    },
    {
      label: 'Montant Brut',
      key: 'totalPrice',
      render: (row) => <span className="font-mono font-black text-slate-800">{formatFCFA(row.totalPrice)}</span>
    },
    {
      label: 'Statut',
      key: 'status',
      render: (row) => {
        const status = row.status || 'EN_ATTENTE';
        let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
        if (status === 'REGLEE') badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
        else if (status === 'ANNULEE' || status === 'ABANDONNEE') badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
        return (
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${badgeStyle}`}>
            {status}
          </span>
        );
      }
    }
  ];

  const { onSearch: onSearchPrestations, paginated: paginatedPrestations, pagination: prestationsPagination } = useClientTable(filteredPrestations, {
    searchKeys: ['actName'],
    initialPageSize: 10,
  });

  // Render SVG Chart for trends
  const renderSVGChart = () => {
    if (dailyHistory.length === 0) return null;

    const width = 800;
    const height = 260;
    const padding = 40;

    // Find min and max for scaling
    const maxVal = Math.max(
      ...dailyHistory.map(d => Math.max(d.recettes, d.encaissements, d.depenses)),
      10000 // default minimum scale
    );

    const getX = (index) => {
      if (dailyHistory.length <= 1) return padding + (width - padding * 2) / 2;
      return padding + (index / (dailyHistory.length - 1)) * (width - padding * 2);
    };

    const getY = (val) => {
      return height - padding - (val / maxVal) * (height - padding * 2);
    };

    const makePath = (key) => {
      return dailyHistory.map((d, idx) => {
        const x = getX(idx);
        const y = getY(d[key]);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');
    };

    const makeAreaPath = (key) => {
      if (dailyHistory.length === 0) return '';
      const startX = getX(0);
      const endX = getX(dailyHistory.length - 1);
      const basePath = makePath(key);
      return `${basePath} L ${endX} ${height - padding} L ${startX} ${height - padding} Z`;
    };

    // Calculate dates to display on bottom axis
    const axisLabels = [];
    const step = Math.max(1, Math.floor(dailyHistory.length / 5));
    for (let i = 0; i < dailyHistory.length; i += step) {
      axisLabels.push(i);
    }
    if (dailyHistory.length > 1 && !axisLabels.includes(dailyHistory.length - 1)) {
      axisLabels.push(dailyHistory.length - 1);
    }

    return (
      <svg className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="recettesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="encaissementsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="depensesGrad" x1="0" y1="0" x2="0" y2="1">
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

        {/* Recettes Area & Line */}
        <path d={makeAreaPath('recettes')} fill="url(#recettesGrad)" />
        <path d={makePath('recettes')} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Encaissements Area & Line */}
        <path d={makeAreaPath('encaissements')} fill="url(#encaissementsGrad)" />
        <path d={makePath('encaissements')} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Depenses Area & Line */}
        <path d={makeAreaPath('depenses')} fill="url(#depensesGrad)" />
        <path d={makePath('depenses')} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Horizontal Axis Line */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Axis Labels */}
        {axisLabels.map((idx) => {
          const x = getX(idx);
          const day = dailyHistory[idx];
          if (!day) return null;
          // Format date as DD/MM
          const parts = day.dateStr.split('-');
          const label = `${parts[2]}/${parts[1]}`;
          return (
            <g key={idx}>
              <line x1={x} y1={height - padding} x2={x} y2={height - padding + 5} stroke="#cbd5e1" strokeWidth="1.5" />
              <text
                x={x}
                y={height - padding + 18}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-bold"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Y Axis Max Label */}
        <text
          x={padding - 8}
          y={padding + 4}
          textAnchor="end"
          className="fill-slate-400 text-[10px] font-bold"
        >
          {formatCurrencyShort(maxVal)}
        </text>
      </svg>
    );
  };

  const formatCurrencyShort = (val) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return val;
  };

  // Preset Date range pickers
  const selectPresetRange = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'TODAY') {
      // default: today
    } else if (preset === 'WEEK') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start = new Date(today.setDate(diff));
    } else if (preset === 'MONTH') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'PREV_MONTH') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset === 'YEAR') {
      start = new Date(today.getFullYear(), 0, 1);
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="animate-spin text-sky-600" size={36} />
        <p className="text-slate-500 font-black uppercase text-xs tracking-widest animate-pulse">
          Chargement du point financier...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-950 via-slate-900 to-slate-950 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-sky-400 shadow-inner">
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">
              Recettes Périodiques & États financiers
            </h2>
            <p className="text-xs text-sky-200/80 mt-1 font-medium">
              Analyse consolidée du chiffre d'affaires, des encaissements, des dépenses et de la part d'assurance.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Global Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Preset Range Shortcuts */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'TODAY', label: "Aujourd'hui" },
            { id: 'WEEK', label: "Cette semaine" },
            { id: 'MONTH', label: "Ce mois" },
            { id: 'PREV_MONTH', label: "Mois dernier" },
            { id: 'YEAR', label: "Cette année" }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => selectPresetRange(p.id)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200/80 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Input Pickers */}
        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-400">Du</span>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-lg p-2 bg-slate-50 font-semibold outline-none focus:border-sky-500 text-slate-800"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-wider text-slate-400">Au</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-lg p-2 bg-slate-50 font-semibold outline-none focus:border-sky-500 text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* 3. Internal Tabs Selector */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('synthese')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'synthese' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Activity size={14} /> Synthèse Financière
        </button>
        <button
          onClick={() => setActiveSubTab('details')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
            activeSubTab === 'details' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <FileText size={14} /> Détails des Recettes
        </button>
      </div>

      {/* 4. Tab Views Render */}
      {activeSubTab === 'synthese' ? (
        <div className="space-y-6">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* KPI 1: Encaissements */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Encaissements (Cash/Banque)</span>
                <span className="text-base font-black text-emerald-600 mt-1 block">{formatFCFA(totalEncaissements)}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Fonds réels collectés</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ArrowUpRight size={18} />
              </div>
            </div>

            {/* KPI 2: Depenses */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Dépenses</span>
                <span className="text-base font-black text-rose-600 mt-1 block">-{formatFCFA(totalDepenses)}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Décaissements d'exploitation</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <ArrowDownRight size={18} />
              </div>
            </div>

            {/* KPI 3: Gains Differes (Assurances) */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-sky-500" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Gains Différés (Assurance)</span>
                <span className="text-base font-black text-sky-600 mt-1 block">+{formatFCFA(totalGainsDifferes)}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Prise en charge à recouvrir</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
                <Landmark size={18} />
              </div>
            </div>

            {/* KPI 4: Recettes Totales */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-900" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Chiffre d'Affaires</span>
                <span className="text-base font-black text-slate-800 mt-1 block">{formatFCFA(totalRecettes)}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Volume facturé généré</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
            </div>

            {/* KPI 5: Resultat Net */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500" />
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Résultat Net (Cash)</span>
                <span className={`text-base font-black mt-1 block ${totalNet >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {totalNet >= 0 ? '+' : ''}{formatFCFA(totalNet)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Encaissements - Dépenses</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
            </div>

          </div>

          {/* Graphical evolution chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-sky-600" />
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Évolution Graphique Quotidienne</h4>
              </div>
              
              {/* Legend */}
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#38bdf8] rounded-full" />
                  <span>Recettes facturées</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#10b981] rounded-full" />
                  <span>Encaissements cash</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#f43f5e] rounded-full" />
                  <span>Dépenses</span>
                </div>
              </div>
            </div>

            {/* SVG Chart area */}
            <div className="h-64 relative">
              {txLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2 className="animate-spin text-sky-600" size={32} />
                </div>
              ) : dailyHistory.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs italic font-bold">
                  Aucune transaction enregistrée sur cette période
                </div>
              ) : (
                renderSVGChart()
              )}
            </div>
          </div>

          {/* Daily Table Summary */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <FileText size={18} className="text-sky-600" />
              <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Point Financier Détaillé par Jour</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-bold text-slate-600">
                <thead>
                  <tr className="bg-slate-900 text-white border-b border-slate-700">
                    <th className="p-3 px-4 uppercase tracking-widest text-[9px] text-slate-300">Date</th>
                    <th className="p-3 px-4 uppercase tracking-widest text-[9px] text-slate-300 text-right">Encaissements</th>
                    <th className="p-3 px-4 uppercase tracking-widest text-[9px] text-slate-300 text-right">Dépenses</th>
                    <th className="p-3 px-4 uppercase tracking-widest text-[9px] text-slate-300 text-right">Gains Différés (Assurance)</th>
                    <th className="p-3 px-4 uppercase tracking-widest text-[9px] text-slate-300 text-right">Chiffre d'Affaires</th>
                    <th className="p-3 px-4 uppercase tracking-widest text-[9px] text-slate-300 text-right">Résultat Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 italic">Aucune donnée pour cette période.</td>
                    </tr>
                  ) : (
                    dailyHistory.map(day => (
                      <tr key={day.dateStr} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 px-4 font-mono font-black text-slate-700">
                          {new Date(day.dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3 px-4 text-right text-emerald-600 font-mono">+{formatFCFA(day.encaissements)}</td>
                        <td className="p-3 px-4 text-right text-rose-600 font-mono">-{formatFCFA(day.depenses)}</td>
                        <td className="p-3 px-4 text-right text-sky-600 font-mono">+{formatFCFA(day.gainsDifferes)}</td>
                        <td className="p-3 px-4 text-right text-slate-800 font-mono">{formatFCFA(day.recettes)}</td>
                        <td className={`p-3 px-4 text-right font-mono ${day.resultatNet >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                          {day.resultatNet >= 0 ? '+' : ''}{formatFCFA(day.resultatNet)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        /* Detailed List Tab */
        <div className="space-y-6">
          {/* Detailed Filters Bar */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-bold">
            
            {/* Specialty Filter */}
            <div>
              <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1.5">Spécialité Médicale</label>
              <div className="relative">
                <select
                  value={filterSpecialty}
                  onChange={e => {
                    setFilterSpecialty(e.target.value);
                    setFilterDoctor(''); // reset doctor if specialty changes
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 outline-none focus:border-sky-500 text-slate-800 cursor-pointer"
                >
                  <option value="">Toutes les spécialités</option>
                  {uniqueSpecialties.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Practitioner Filter */}
            <div>
              <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1.5">Médecin prescripteur</label>
              <select
                value={filterDoctor}
                onChange={e => setFilterDoctor(e.target.value)}
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 outline-none focus:border-sky-500 text-slate-800 cursor-pointer"
              >
                <option value="">Tous les praticiens</option>
                <option value="Non assigné">Non assigné</option>
                {doctorsList
                  .filter(doc => !filterSpecialty || parseStaffSpecialty(doc.specialty).specialty === filterSpecialty)
                  .map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.fullName}</option>
                  ))
                }
              </select>
            </div>

            {/* Keyword Search */}
            <div className="md:col-span-2">
              <label className="text-[9px] text-slate-400 uppercase tracking-wider block mb-1.5">Rechercher</label>
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Rechercher par libellé d'acte ou médecin..."
                className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 outline-none focus:border-sky-500 text-slate-800"
              />
            </div>
            
          </div>

          {/* Prestations list */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <DataTable
              title="Registre détaillé des recettes par prestation"
              columns={detailedColumns}
              data={paginatedPrestations}
              loading={txLoading}
              onSearch={onSearchPrestations}
              searchPlaceholder="Rechercher par libellé d'acte..."
              entryLabel="prestations"
              pagination={prestationsPagination}
            />
          </div>

        </div>
      )}

    </div>
  );
};

export default EtatsPeriodiquesView;
