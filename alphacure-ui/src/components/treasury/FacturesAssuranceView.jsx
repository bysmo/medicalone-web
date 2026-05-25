import { useState, useEffect } from 'react';
import {
  Loader2, FileText, Printer, Search, Landmark, DollarSign, ArrowUpRight, X
} from 'lucide-react';
import {
  prestationService, patientService, insuranceService, clinicService
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

// Converts numbers to French words (up to billions)
const numberToFrenchWords = (num) => {
  if (num === 0) return 'zéro';
  
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    let res = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    
    if (h > 0) {
      if (h === 1) {
        res += 'cent';
      } else {
        res += units[h] + ' cent';
        if (remainder === 0) res += 's';
      }
    }
    
    if (remainder > 0) {
      if (h > 0) res += ' ';
      if (remainder < 10) {
        res += units[remainder];
      } else if (remainder >= 10 && remainder < 20) {
        res += teens[remainder - 10];
      } else {
        const t = Math.floor(remainder / 10);
        const u = remainder % 10;
        if (t === 7) {
          res += 'soixante';
          if (u === 1) res += ' et onze';
          else res += '-' + teens[u];
        } else if (t === 8) {
          res += 'quatre-vingt';
          if (u > 0) res += '-' + units[u];
          else res += 's';
        } else if (t === 9) {
          res += 'quatre-vingt';
          res += '-' + teens[u];
        } else {
          res += tens[t];
          if (u === 1) {
            res += ' et un';
          } else if (u > 1) {
            res += '-' + units[u];
          }
        }
      }
    }
    return res;
  };

  let temp = Math.floor(num);
  if (temp < 0) return 'moins ' + numberToFrenchWords(Math.abs(temp));

  const chunks = [];
  while (temp > 0) {
    chunks.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const scales = ['', 'mille', 'million', 'milliard'];
  let wordsList = [];

  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    if (chunk === 0) continue;
    
    let chunkStr = convertLessThanThousand(chunk);
    const scale = scales[i];
    
    if (scale === 'mille') {
      if (chunk === 1) {
        wordsList.push('mille');
      } else {
        wordsList.push(chunkStr + ' mille');
      }
    } else if (scale !== '') {
      let plural = (chunk > 1) ? 's' : '';
      wordsList.push(chunkStr + ' ' + scale + plural);
    } else {
      wordsList.push(chunkStr);
    }
  }
  
  return wordsList.join(' ').trim();
};

const FacturesAssuranceView = ({ showToast }) => {
  // Date filters (defaults to first day of current month to today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [selectedInsurer, setSelectedInsurer] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Data states
  const [prestations, setPrestations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [clinicProfile, setClinicProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load baseline datasets
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [prestRes, patientRes, insRes, clinicRes] = await Promise.all([
          prestationService.getAll().catch(() => ({ data: [] })),
          patientService.search('', 0, 5000).catch(() => ({ data: { content: [] } })),
          insuranceService.getAll().catch(() => ({ data: [] })),
          clinicService.getMyProfile().catch(() => ({ data: null }))
        ]);

        setPrestations(prestRes.data || []);
        // Extract content array if paginated
        const patientsList = patientRes.data?.content || patientRes.data || [];
        setPatients(patientsList);
        setInsurances(insRes.data || []);
        setClinicProfile(clinicRes.data || null);
      } catch (err) {
        console.error("Error loading insurance billing data", err);
        showToast("Erreur lors de la récupération des données de facturation.", "error");
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [showToast]);

  // Create a patient Map for fast local lookup
  const patientMap = new Map();
  patients.forEach(p => {
    if (p.id) patientMap.set(p.id, p);
  });

  // Date parsing helper
  const isWithinDateRange = (dateStr) => {
    const target = new Date(dateStr);
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    return target >= start && target <= end;
  };

  // Filter and process eligible prestations (must have insurance share and fall into filters)
  const getProcessedPrestations = () => {
    return prestations.filter(item => {
      // 1. Must be regulated, finished or pending payments (exclude cancelled or abandoned)
      if (item.status === 'ANNULEE' || item.status === 'ABANDONNEE') return false;

      // 2. Must have an insurance share
      const insShare = Number(item.insuranceShare || 0);
      if (insShare <= 0) return false;

      // 3. Must be in date range
      if (!isWithinDateRange(item.createdAt)) return false;

      // 4. Retrieve patient
      const patient = patientMap.get(item.patientId);
      if (!patient) return false;

      // 5. Must match the selected insurer
      if (selectedInsurer && patient.insurer !== selectedInsurer) return false;

      // 6. Text search filter (patient name, act name)
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
        const actName = (item.actName || '').toLowerCase();
        if (!patientName.includes(query) && !actName.includes(query)) return false;
      }

      return true;
    });
  };

  const filteredPrestations = getProcessedPrestations();

  // Aggregate values
  const totalBilled = filteredPrestations.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
  const totalPatientShare = filteredPrestations.reduce((sum, item) => sum + Number(item.patientShare || 0), 0);
  const totalInsuranceShare = filteredPrestations.reduce((sum, item) => sum + Number(item.insuranceShare || 0), 0);

  // Group filtered prestations by subscriber for invoice generation
  const getGroupedBySubscriber = () => {
    const groups = {};
    filteredPrestations.forEach(item => {
      const patient = patientMap.get(item.patientId);
      const subName = (patient?.subscriber || "Sans souscripteur (Individuel)").trim();
      
      if (!groups[subName]) {
        groups[subName] = {
          subscriberName: subName,
          items: [],
          subtotalBilled: 0,
          subtotalPatient: 0,
          subtotalInsurance: 0
        };
      }
      
      groups[subName].items.push({
        ...item,
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Inconnu',
        mainInsured: patient?.mainInsured || patient?.fullName || 'Non renseigné',
        policyNumber: patient?.policyNumber || 'Non renseigné',
        coverageRate: patient?.coverageRate || (item.totalPrice > 0 ? Math.round((item.insuranceShare / item.totalPrice) * 100) : 0)
      });

      groups[subName].subtotalBilled += Number(item.totalPrice || 0);
      groups[subName].subtotalPatient += Number(item.patientShare || 0);
      groups[subName].subtotalInsurance += Number(item.insuranceShare || 0);
    });

    return Object.values(groups).sort((a, b) => a.subscriberName.localeCompare(b.subscriberName));
  };

  const groupedSubscribers = getGroupedBySubscriber();

  // Columns for the client list display
  const listColumns = [
    {
      label: 'Date',
      key: 'createdAt',
      render: (row) => <span className="font-semibold text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
    },
    {
      label: 'Patient & Police',
      key: 'patientId',
      render: (row) => {
        const p = patientMap.get(row.patientId);
        return (
          <div>
            <span className="font-bold text-slate-800 block">{p ? `${p.firstName} ${p.lastName}` : 'Inconnu'}</span>
            <span className="text-[10px] text-slate-400 font-mono block">N° Police : {p?.policyNumber || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      label: 'Souscripteur',
      key: 'subscriber',
      render: (row) => {
        const p = patientMap.get(row.patientId);
        return <span className="text-[11px] font-black uppercase text-slate-500">{p?.subscriber || 'N/A'}</span>;
      }
    },
    {
      label: 'Prestation / Acte',
      key: 'actName',
      render: (row) => <span className="font-semibold text-slate-700">{row.actName}</span>
    },
    {
      label: 'Montant Brut',
      key: 'totalPrice',
      render: (row) => <span className="font-mono text-slate-500">{formatFCFA(row.totalPrice)}</span>
    },
    {
      label: 'Part Patient (T.M)',
      key: 'patientShare',
      render: (row) => <span className="font-mono text-rose-500 font-semibold">{formatFCFA(row.patientShare)}</span>
    },
    {
      label: 'Part Assureur',
      key: 'insuranceShare',
      render: (row) => <span className="font-mono text-emerald-600 font-bold">{formatFCFA(row.insuranceShare)}</span>
    }
  ];

  const { onSearch, paginated, pagination } = useClientTable(filteredPrestations, {
    searchKeys: ['actName'],
    initialPageSize: 10
  });

  const selectPresetRange = (preset) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (preset === 'TODAY') {
      // today
    } else if (preset === 'WEEK') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
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

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="animate-spin text-sky-600" size={36} />
        <p className="text-slate-500 font-black uppercase text-xs tracking-widest animate-pulse">
          Chargement des factures d'assurance...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-emerald-400 shadow-inner">
            <Landmark size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">
              Facturation d'Assurance & Tiers-Payant
            </h2>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Générez et imprimez les factures périodiques groupées par assureur et souscripteur.
            </p>
          </div>
        </div>

        {selectedInsurer && filteredPrestations.length > 0 && (
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer"
          >
            <Printer size={16} /> Générer la Facture
          </button>
        )}
      </div>

      {/* Filters Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
        
        {/* Insurer Selector */}
        <div className="space-y-1.5">
          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Assurance</label>
          <select
            value={selectedInsurer}
            onChange={e => setSelectedInsurer(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 font-bold text-xs outline-none focus:border-emerald-500 text-slate-800 cursor-pointer"
          >
            <option value="">Sélectionner une assurance...</option>
            {insurances.map(ins => (
              <option key={ins.id} value={ins.name}>{ins.name}</option>
            ))}
          </select>
        </div>

        {/* Date range picker */}
        <div className="space-y-1.5">
          <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Période de facturation</label>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-semibold outline-none focus:border-emerald-500 text-slate-800 w-full"
            />
            <span className="text-[9px] uppercase tracking-wider text-slate-400">à</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-slate-200 rounded-xl p-2.5 bg-slate-50 font-semibold outline-none focus:border-emerald-500 text-slate-800 w-full"
            />
          </div>
        </div>

        {/* Preset dates & text search */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'TODAY', label: "Aujourd'hui" },
              { id: 'WEEK', label: "Semaine" },
              { id: 'MONTH', label: "Ce mois" },
              { id: 'PREV_MONTH', label: "Mois dern." }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => selectPresetRange(p.id)}
                className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 text-slate-600 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200/80 transition-all cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchText}
              onChange={e => {
                setSearchText(e.target.value);
                onSearch(e.target.value);
              }}
              placeholder="Rechercher par patient ou acte..."
              className="w-full border border-slate-200 rounded-xl p-2.5 pl-9 bg-slate-50 text-xs outline-none focus:border-emerald-500 text-slate-800 font-bold"
            />
            <Search className="absolute left-3 top-3 text-slate-400" size={14} />
          </div>
        </div>

      </div>

      {/* Consolidated KPIs */}
      {selectedInsurer && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-slate-800" />
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Actes Facturés</span>
              <span className="text-lg font-black text-slate-800 mt-1 block">{filteredPrestations.length} actes</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-50 text-slate-700 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-sky-500" />
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Montant Brut Global</span>
              <span className="text-lg font-black text-sky-600 mt-1 block">{formatFCFA(totalBilled)}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-rose-500" />
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Part Patients (T.M)</span>
              <span className="text-lg font-black text-rose-600 mt-1 block">{formatFCFA(totalPatientShare)}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight size={18} className="rotate-45" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Net Part Assureur à payer</span>
              <span className="text-lg font-black text-emerald-600 mt-1 block">{formatFCFA(totalInsuranceShare)}</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Landmark size={18} />
            </div>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        {!selectedInsurer ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
            Veuillez sélectionner une assurance pour charger les prestations
          </div>
        ) : (
          <DataTable
            title={`Prestations associées à l'assurance : ${selectedInsurer}`}
            columns={listColumns}
            data={paginated}
            loading={false}
            onSearch={() => {}}
            searchPlaceholder=""
            entryLabel="actes d'assurés"
            pagination={pagination}
          />
        )}
      </div>

      {/* Premium Print Layout Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto print:absolute print:inset-0 print:p-0 print:bg-white">
          
          {/* Modal box */}
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden print:w-full print:rounded-none print:shadow-none print:max-h-none print:overflow-visible">
            
            {/* Header controls (hidden on print) */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="text-emerald-600" size={18} />
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-700">Facture d'assurance - Aperçu avant impression</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider hover:bg-emerald-500 transition-all cursor-pointer"
                >
                  <Printer size={14} /> Imprimer la facture
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable invoice area */}
            <div className="flex-1 overflow-y-auto p-8 md:p-12 print:overflow-visible print:p-0 print:m-0">
              
              {/* PRINT STYLE INJECTOR */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  #print-area, #print-area * {
                    visibility: visible;
                  }
                  #print-area {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 210mm;
                    padding: 10mm;
                    background: white;
                    color: black;
                  }
                  .print-break-inside-avoid {
                    page-break-inside: avoid;
                  }
                }
              `}} />

              {/* Printable frame container */}
              <div id="print-area" className="text-slate-800 text-xs font-medium space-y-8 select-none print:text-black">
                
                {/* Clinic and Doc Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
                  <div>
                    <h1 className="text-lg font-black uppercase text-slate-900 tracking-wider print:text-black">
                      {clinicProfile?.name || "ALPHACURE CLINIC"}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 print:text-black/70">
                      {clinicProfile?.address || "Adresse de la Clinique"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 print:text-black/70">
                      Tél : {clinicProfile?.phone || "N/A"} | Email : {clinicProfile?.email || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block print:bg-black print:text-white">
                      FACTURE D'ASSURANCE
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase print:text-black/50">Date : {new Date().toLocaleDateString('fr-FR')}</p>
                    <p className="text-[10px] text-slate-500 font-mono print:text-black/70">Période : {new Date(startDate).toLocaleDateString()} au {new Date(endDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Destructuring Insurer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 print:bg-transparent print:border-black/30">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block print:text-black/50">DESTINATAIRE</span>
                    <span className="font-black text-slate-900 text-sm uppercase block mt-1 print:text-black">{selectedInsurer}</span>
                    <span className="text-[10px] text-slate-500 block mt-1 font-semibold print:text-black/70">Prise en charge tiers-payant</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 print:bg-transparent print:border-black/30 text-right">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block print:text-black/50">SYNTHÈSE</span>
                    <span className="text-slate-800 font-mono block mt-1 print:text-black">
                      Montant Brut : <span className="font-bold">{formatFCFA(totalBilled)}</span>
                    </span>
                    <span className="text-slate-500 font-mono block print:text-black/70">
                      Ticket Modérateur : <span className="font-bold">{formatFCFA(totalPatientShare)}</span>
                    </span>
                    <span className="text-slate-900 text-[13px] font-mono block mt-1 font-black print:text-black">
                      Net à payer : {formatFCFA(totalInsuranceShare)}
                    </span>
                  </div>
                </div>

                {/* Grouped Lists by Subscriber */}
                <div className="space-y-6">
                  {groupedSubscribers.map(group => (
                    <div key={group.subscriberName} className="print-break-inside-avoid border border-slate-200 rounded-xl overflow-hidden print:border-black/40 print:rounded-none">
                      
                      {/* Group Header */}
                      <div className="bg-slate-900 text-white p-3 font-black uppercase text-[10px] tracking-widest flex justify-between print:bg-black/10 print:text-black print:border-b print:border-black/40">
                        <span>SOUSCRIPTEUR : {group.subscriberName}</span>
                        <span>{group.items.length} acte{group.items.length > 1 ? 's' : ''}</span>
                      </div>

                      {/* Items table */}
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-black uppercase border-b border-slate-200 text-[9px] tracking-wider print:bg-transparent print:text-black print:border-b-2 print:border-black/40">
                            <th className="p-2.5 px-3">Patient & Police</th>
                            <th className="p-2.5 px-3">Assuré principal</th>
                            <th className="p-2.5 px-3">Prestation / Acte</th>
                            <th className="p-2.5 px-3 text-center">Taux (%)</th>
                            <th className="p-2.5 px-3 text-right">Brut</th>
                            <th className="p-2.5 px-3 text-right">T.M (Patient)</th>
                            <th className="p-2.5 px-3 text-right">Part Assureur</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-y-0 print:divide-black/20">
                          {group.items.map(row => (
                            <tr key={row.id} className="hover:bg-slate-50/50 print:border-b print:border-black/10">
                              <td className="p-2.5 px-3">
                                <span className="font-bold text-slate-900 print:text-black block">{row.patientName}</span>
                                <span className="text-[8px] text-slate-400 font-mono block print:text-black/60">Pol : {row.policyNumber}</span>
                              </td>
                              <td className="p-2.5 px-3 text-slate-600 print:text-black/80">{row.mainInsured}</td>
                              <td className="p-2.5 px-3 text-slate-800 print:text-black font-semibold">{row.actName}</td>
                              <td className="p-2.5 px-3 text-center font-mono font-bold text-slate-500 print:text-black">{row.coverageRate}%</td>
                              <td className="p-2.5 px-3 text-right font-mono text-slate-500 print:text-black">{formatFCFA(row.totalPrice)}</td>
                              <td className="p-2.5 px-3 text-right font-mono text-rose-500 print:text-black font-semibold">{formatFCFA(row.patientShare)}</td>
                              <td className="p-2.5 px-3 text-right font-mono text-slate-900 font-black print:text-black">{formatFCFA(row.insuranceShare)}</td>
                            </tr>
                          ))}
                          
                          {/* Subscriber Subtotal Row */}
                          <tr className="bg-slate-50/60 font-bold border-t border-slate-200 text-slate-700 print:bg-black/5 print:text-black print:border-t-2 print:border-black/40">
                            <td colSpan="4" className="p-2.5 px-3 uppercase tracking-wider text-[8px] text-slate-400 print:text-black">SOUS-TOTAL ({group.subscriberName})</td>
                            <td className="p-2.5 px-3 text-right font-mono text-[9px]">{formatFCFA(group.subtotalBilled)}</td>
                            <td className="p-2.5 px-3 text-right font-mono text-rose-500 text-[9px]">{formatFCFA(group.subtotalPatient)}</td>
                            <td className="p-2.5 px-3 text-right font-mono text-slate-900 text-[10px] font-black print:text-black">{formatFCFA(group.subtotalInsurance)}</td>
                          </tr>
                        </tbody>
                      </table>

                    </div>
                  ))}
                </div>

                {/* Grand Total Words */}
                <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-transparent print:text-black print:border-black/60 print:rounded-none">
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block print:text-black/50">Arrêté la présente facture à la somme de :</span>
                    <span className="font-bold text-xs uppercase tracking-wide block mt-1 text-slate-100 print:text-black italic">
                      {numberToFrenchWords(totalInsuranceShare)} franc{totalInsuranceShare >= 2 ? 's' : ''} CFA
                    </span>
                  </div>
                  <div className="text-right border-t border-slate-800 pt-2 md:border-t-0 md:pt-0">
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block print:text-black/50">TOTAL GÉNÉRAL À PAYER</span>
                    <span className="font-black text-base font-mono block mt-1 tracking-wider text-emerald-400 print:text-black">
                      {formatFCFA(totalInsuranceShare)}
                    </span>
                  </div>
                </div>

                {/* Footer signatures */}
                <div className="grid grid-cols-2 gap-4 pt-12 print-break-inside-avoid">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-black/60">Établi par :</p>
                    <div className="h-20 border-b border-dashed border-slate-300 w-48 mt-4 print:border-black/40" />
                    <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-wider print:text-black/70">Le Service Comptabilité</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:text-black/60">Pour la Direction :</p>
                    <div className="h-20 border-b border-dashed border-slate-300 w-48 mt-4 print:border-black/40" />
                    <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-wider print:text-black/70">Le Responsable Clinique</p>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default FacturesAssuranceView;
