import { useState, useEffect } from 'react';
import {
  Search, Plus, CreditCard, X, Trash2, Save,
  Stethoscope, FlaskConical, HeartPulse,
  ShieldCheck, CheckCircle2, Loader2, Info, AlertTriangle
} from 'lucide-react';
import { TARIFF_TYPES, formatCurrency } from '../../data/constants';
import { medicalActService, invoiceService, nomenclatureService, conventionService, insuranceService, externalPrescribingDoctorService } from '../../services/api';

const BillingView = ({ patient, onClose, showToast }) => {
  const [natures, setNatures] = useState([]);
  const [activeNature, setActiveNature] = useState('');
  const [cart, setCart] = useState([]);
  const [actSearch, setActSearch] = useState('');
  const [bordereauCode, setBordereauCode] = useState('');
  const [newCard, setNewCard] = useState(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({ insurer: '', subscriber: '', mainInsured: '', policyNumber: '', coverageRate: '80', startDate: '', endDate: '' });
  
  const [medicalActs, setMedicalActs] = useState([]);
  const [actTariffs, setActTariffs] = useState({});
  const [dynamicTariffs, setDynamicTariffs] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [externalDoctors, setExternalDoctors] = useState([]);
  const [prescribingDoctorId, setPrescribingDoctorId] = useState('');
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState('');
  const [newDoctorPhone, setNewDoctorPhone] = useState('');
  const [creatingDoctor, setCreatingDoctor] = useState(false);

  // Load initial nomenclatures (Natures of acts, Tariffs, Insurers)
  useEffect(() => {
    const loadNomenclatures = async () => {
      try {
        let insurersRes;
        try {
          insurersRes = await insuranceService.getAll();
        } catch (err) {
          console.error("Failed fetching insurers from patient-service", err);
        }

        let subscribersRes;
        try {
          subscribersRes = await nomenclatureService.search('SOUSCRIPTEUR', 'FINANCES');
        } catch (err) {
          console.warn("Failed fetching subscribers", err);
        }

        const [naturesRes, tariffsRes] = await Promise.all([
          nomenclatureService.search('NATURE_ACTE', 'MEDICAL'),
          nomenclatureService.search('TARIF', 'FINANCES')
        ]);
        
        const loadedNatures = (naturesRes.data || []).map(n => ({
          id: n.code,
          label: n.string1
        }));
        setNatures(loadedNatures);

        const loadedTariffs = (tariffsRes.data || []).map(t => ({
          code: t.code,
          label: t.string1
        }));
        setDynamicTariffs(loadedTariffs);

        setInsurers(insurersRes.data || []);
        setSubscribers(subscribersRes?.data || []);

        if (loadedNatures.length > 0) {
          setActiveNature(loadedNatures[0].id);
        }
      } catch (err) {
        console.error("Error loading billing nomenclatures:", err);
      }
    };
    loadNomenclatures();
    // Load external prescribing doctors
    externalPrescribingDoctorService.getAll().then(res => setExternalDoctors(res.data || [])).catch(() => {});
  }, []);

  // Load acts dynamically from backend for the selected activeNature
  useEffect(() => {
    if (!activeNature) return;
    const loadActs = async () => {
      setLoadingActs(true);
      try {
        const res = await medicalActService.getAll(activeNature);
        const loadedActs = res.data || [];
        setMedicalActs(loadedActs);

        // Batch fetch tariffs for the loaded acts to prevent price calculation latency
        const tariffsMap = {};
        await Promise.all(loadedActs.map(async (act) => {
          try {
            const tariffsRes = await medicalActService.getTariffs(act.id);
            tariffsMap[act.id] = tariffsRes.data || [];
          } catch (err) {
            console.error(`Error loading tariffs for act ${act.id}`, err);
          }
        }));
        setActTariffs(tariffsMap);
      } catch (err) {
        console.error("Error loading acts:", err);
        showToast("Erreur lors du chargement des actes.", "error");
      } finally {
        setLoadingActs(false);
      }
    };
    loadActs();
  }, [activeNature]);

  const hasOriginalInsurance = patient?.insurer || patient?.policyNumber || patient?.isInsured;
  const originalInCoverage = hasOriginalInsurance && patient?.insuranceStartDate && patient?.insuranceEndDate &&
    new Date() >= new Date(patient.insuranceStartDate) && new Date() <= new Date(patient.insuranceEndDate);

  const activeCard = newCard || (originalInCoverage ? {
    insurer: patient?.insurer, policyNumber: patient?.policyNumber,
    coverageRate: patient?.coverageRate, startDate: patient?.insuranceStartDate, endDate: patient?.insuranceEndDate
  } : null);

  const isEffectivelyInsured = !!activeCard;
  const coverageRate = activeCard ? parseFloat(activeCard.coverageRate || 0) : 0;
  const inCoveragePeriod = isEffectivelyInsured;

  // Determine auto-tariff based on selected insurer's scope (NATIONAL or INTERNATIONAL) stored in type
  const autoTariff = isEffectivelyInsured ? (() => {
    const matchedInsurerObj = insurers.find(ins => ins.id === activeCard?.insurer || ins.name === activeCard?.insurer);
    const scope = matchedInsurerObj?.type ? matchedInsurerObj.type.toUpperCase() : 'NATIONAL';
    if (scope === 'INTERNATIONAL') {
      return 'ASSURE_INT';
    }
    return 'ASSURE_NAT';
  })() : null;

  const [selectedTariff, setSelectedTariff] = useState('STANDARD');
  const filteredTariffs = dynamicTariffs.filter(t => {
    if (!isEffectivelyInsured) {
      const code = t.code.toUpperCase();
      return !code.includes('ASSURE') && !code.includes('NATIONAL') && !code.includes('INTERNATIONAL') && code !== 'ASSURE_NAT' && code !== 'ASSURE_INT';
    }
    return true;
  });
  const activeTariff = autoTariff || selectedTariff;

  const matchedInsurerObj = isEffectivelyInsured
    ? insurers.find(ins => ins.id === activeCard?.insurer || ins.name === activeCard?.insurer)
    : null;

  // Load insurer conventions
  const [insurerConventions, setInsurerConventions] = useState([]);

  useEffect(() => {
    if (matchedInsurerObj) {
      conventionService.getByInsurer(matchedInsurerObj.id)
        .then(res => setInsurerConventions(res.data || []))
        .catch(err => console.error("Error loading conventions in BillingView", err));
    } else {
      setInsurerConventions([]);
    }
  }, [matchedInsurerObj]);

  const normalizeTariffType = (type) => {
    if (!type) return '';
    const upper = type.toUpperCase();
    if (upper === 'ASSURE_NAT' || upper === 'ASSURE_NATIONAL' || upper === 'NATIONAL') return 'ASSURE_NATIONAL';
    if (upper === 'ASSURE_INT' || upper === 'ASSURE_INTERNATIONAL' || upper === 'INTERNATIONAL') return 'ASSURE_INTERNATIONAL';
    return upper;
  };

  // Retrieve dynamic database pricing with multi-level fallbacks
  const getPrice = (act) => {
    const tariffs = actTariffs[act.id] || [];
    const matched = tariffs.find(t => normalizeTariffType(t.tariffType) === normalizeTariffType(activeTariff));
    if (matched) return Number(matched.amount);

    const standardTariff = tariffs.find(t => normalizeTariffType(t.tariffType) === 'STANDARD');
    if (standardTariff) return Number(standardTariff.amount);

    return null;
  };

  const getTariffLabel = (code) => {
    const found = dynamicTariffs.find(t => t.code === code);
    return found ? found.label : (TARIFF_TYPES[code.toLowerCase()] || code);
  };

  const getInsurerLabel = (idOrName) => {
    const found = insurers.find(i => i.id === idOrName || i.name === idOrName);
    return found ? found.name : idOrName;
  };

  const fmt = formatCurrency;

  const availableActs = medicalActs.filter(
    act => (act.name.toLowerCase().includes(actSearch.toLowerCase()) || act.code.toLowerCase().includes(actSearch.toLowerCase()))
      && getPrice(act) !== null
  );

  const addToCart = (act) => {
    const isSéance = activeNature.includes('SEANCE');
    const existing = cart.find(c => c.id === act.id);
    if (existing) {
      if (isSéance) setCart(cart.map(c => c.id === act.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...act, actId: act.id, qty: 1, nature: activeNature, price: getPrice(act) }]);
    }
  };

  const removeFromCart = (actId) => setCart(cart.filter(c => c.id !== actId));
  const updateQty = (actId, qty) => {
    if (qty < 1) return removeFromCart(actId);
    setCart(cart.map(c => c.id === actId ? { ...c, qty } : c));
  };

  // Calculate line-by-line coverage based on conventions
  const calculatedLines = cart.map(item => {
    const gross = item.price * item.qty;
    let insPart = 0;
    
    if (isEffectivelyInsured && inCoveragePeriod) {
      const conv = insurerConventions.find(c => c.acteId === item.actId);
      if (insurerConventions.length > 0) {
        if (conv && !conv.isCovered) {
          insPart = 0;
        } else {
          const theoretical = gross * coverageRate / 100;
          if (conv && conv.maxAmountCovered > 0) {
            insPart = Math.min(theoretical, Number(conv.maxAmountCovered));
          } else {
            insPart = theoretical;
          }
        }
      } else {
        insPart = gross * coverageRate / 100;
      }
    }
    
    return {
      ...item,
      gross,
      insPart: Math.round(insPart),
      patPart: gross - Math.round(insPart)
    };
  });

  const totalBrut = calculatedLines.reduce((sum, item) => sum + item.gross, 0);
  const partAssurance = calculatedLines.reduce((sum, item) => sum + item.insPart, 0);
  const partPatient = totalBrut - partAssurance;

  const handleValidateInvoice = async () => {
    setSavingInvoice(true);
    const payload = {
        patientId: patient.id,
        tariffType: activeTariff,
        coverageRate: inCoveragePeriod ? coverageRate : 0,
        bordereauCode: bordereauCode || null,
        prescribingDoctorId: prescribingDoctorId || null,
        lines: cart.map(item => ({
            actId: item.actId,
            actName: item.name,
            nature: item.nature,
            quantity: item.qty,
            unitPrice: item.price
        }))
    };

    try {
        await invoiceService.create(payload);
        showToast('Facture validée avec succès — Impression en cours...', 'success');
        onClose();
    } catch (err) {
        console.error("Error creating invoice:", err);
        showToast("Erreur lors de la validation de la facture.", "error");
    } finally {
        setSavingInvoice(false);
    }
  };

  const handleCreateExternalDoctor = async (e) => {
    e.preventDefault();
    if (!newDoctorName.trim()) return;
    setCreatingDoctor(true);
    try {
      const res = await externalPrescribingDoctorService.create({
        fullName: newDoctorName.trim(),
        specialty: newDoctorSpecialty.trim() || null,
        phone: newDoctorPhone.trim() || null
      });
      showToast("Médecin prescripteur créé avec succès !", "success");
      const created = res.data;
      setExternalDoctors(prev => [...prev, created].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      setPrescribingDoctorId(created.id);
      setShowAddDoctorModal(false);
      setNewDoctorName('');
      setNewDoctorSpecialty('');
      setNewDoctorPhone('');
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la création du médecin prescripteur", "error");
    } finally {
      setCreatingDoctor(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-[#1e293b] px-6 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-4">
          <CreditCard className="text-emerald-400" size={22} />
          <div>
            <div className="text-white text-sm font-black uppercase tracking-widest">Facturation Patient</div>
            <div className="text-sky-400 text-xs font-bold">{patient?.fullName} — {patient?.patientCode}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tarif appliqué:</span>
            {autoTariff ? (
              <span className="bg-sky-600 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase">{getTariffLabel(autoTariff)}</span>
            ) : (
              <select value={selectedTariff} onChange={e => setSelectedTariff(e.target.value)}
                className="bg-slate-700 text-white border border-slate-600 rounded px-3 py-1.5 text-[10px] font-bold outline-none cursor-pointer">
                {filteredTariffs.map(t => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"><X size={22} /></button>
        </div>
      </div>

      {/* Nature Tabs dynamically loaded */}
      <div className="bg-[#0f172a] px-6 py-2 flex gap-1 border-b border-slate-700 overflow-x-auto">
        {natures.map(n => (
          <button
            key={n.id}
            onClick={() => { setActiveNature(n.id); setActSearch(''); }}
            className={`px-5 py-2.5 rounded-t-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              activeNature === n.id
                ? 'bg-white text-slate-900 shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {n.id.includes('CONSULT') && <Stethoscope size={12} className="inline mr-2" />}
            {n.id.includes('EXAM') && <FlaskConical size={12} className="inline mr-2" />}
            {n.id.includes('SEANCE') && <HeartPulse size={12} className="inline mr-2" />}
            {n.label}
          </button>
        ))}
      </div>

      {/* Body — 3 Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT — Acts Catalog */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-lg">
          <div className="p-3 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input type="text" placeholder="Rechercher un acte..." value={actSearch}
                onChange={(e) => setActSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 relative">
            {loadingActs && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-sky-600" size={24} />
                </div>
            )}
            {availableActs.map(act => (
              <div key={act.id} onClick={() => addToCart(act)}
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-emerald-50 transition-colors group">
                <div>
                  <div className="text-[11px] font-bold text-slate-700 group-hover:text-emerald-700">{act.name}</div>
                  <div className="text-[9px] text-slate-400 font-mono">{act.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-600">{fmt(getPrice(act))}</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={12} />
                  </div>
                </div>
              </div>
            ))}
            {!loadingActs && availableActs.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-xs italic">Aucun acte trouvé dans cette catégorie.</div>
            )}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">
            {availableActs.length} acte(s) — Tarif: {getTariffLabel(activeTariff)}
          </div>
        </div>

        {/* CENTER — Cart */}
        <div className="flex-1 flex flex-col bg-slate-50">
          <div className="p-4 bg-white border-b border-slate-200 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <CreditCard size={14} className="text-emerald-600" /> Panier de facturation
              <span className="ml-auto bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px]">{cart.length} ligne(s)</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-slate-400">
                  <CreditCard size={48} className="mx-auto mb-4 opacity-20" />
                  <div className="text-sm font-bold">Panier vide</div>
                  <div className="text-xs">Cliquez sur un acte à gauche pour l'ajouter</div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200">
                  <div className="col-span-4">Acte</div>
                  <div className="col-span-1 text-center">Qté</div>
                  <div className="col-span-2 text-right">Montant</div>
                  <div className="col-span-2 text-right text-sky-500">Part Assur.</div>
                  <div className="col-span-2 text-right text-emerald-600">Part Patient</div>
                  <div className="col-span-1"></div>
                </div>
                {cart.map((item) => {
                  const calcLine = calculatedLines.find(cl => cl.id === item.id) || { gross: 0, insPart: 0, patPart: 0 };
                  const lineTotal = calcLine.gross;
                  const lineAssurance = calcLine.insPart;
                  const linePatient = calcLine.patPart;
                  const isSéance = item.nature.includes('SEANCE');

                  // Fetch convention details
                  const conv = insurerConventions.find(c => c.acteId === item.actId);
                  const isNotCovered = insurerConventions.length > 0 && conv && !conv.isCovered;
                  const hasCeiling = conv && conv.maxAmountCovered > 0;
                  const ceilingReached = hasCeiling && (lineTotal * coverageRate / 100) > Number(conv.maxAmountCovered);

                  return (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="col-span-4">
                        <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          {item.name}
                          {isNotCovered && (
                            <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5 animate-pulse">
                              <AlertTriangle size={8} /> Non Couvert
                            </span>
                          )}
                          {ceilingReached && (
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5">
                              <Info size={8} /> Plafond ({fmt(conv.maxAmountCovered)})
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">{item.code} — {fmt(item.price)}/u</div>
                      </div>
                      <div className="col-span-1 flex items-center justify-center gap-1">
                        {isSéance ? (
                          <>
                            <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 text-[10px] font-bold">−</button>
                            <span className="text-xs font-black w-5 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 text-[10px] font-bold">+</button>
                          </>
                        ) : (
                          <span className="text-xs font-black text-slate-500">1</span>
                        )}
                      </div>
                      <div className="col-span-2 text-right text-xs font-black text-slate-800">{fmt(lineTotal)}</div>
                      <div className="col-span-2 text-right text-[11px] font-bold text-sky-600">{inCoveragePeriod ? fmt(lineAssurance) : '—'}</div>
                      <div className="col-span-2 text-right text-[11px] font-bold text-emerald-600">{fmt(linePatient)}</div>
                      <div className="col-span-1 flex justify-end">
                        <button onClick={() => removeFromCart(item.id)} className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          <div className="bg-white border-t-2 border-emerald-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Montant brut</span><span className="font-bold">{fmt(totalBrut)}</span>
              </div>
              {inCoveragePeriod && coverageRate > 0 && (
                <>
                  <div className="flex justify-between text-xs text-sky-600">
                    <span>Part Assurance ({coverageRate}%)</span><span className="font-bold">− {fmt(partAssurance)}</span>
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-1"></div>
                </>
              )}
              <div className="flex justify-between text-base font-black">
                <span className="text-slate-800">NET À PAYER (PATIENT)</span>
                <span className="text-emerald-600">{fmt(partPatient)}</span>
              </div>
            </div>
            <button
              disabled={cart.length === 0 || savingInvoice}
              onClick={handleValidateInvoice}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3.5 rounded-lg font-black uppercase text-[11px] tracking-widest shadow-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingInvoice ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} 
              {savingInvoice ? 'Validation en cours...' : 'Valider & Imprimer Facture'}
            </button>
          </div>
        </div>

        {/* RIGHT — Patient Info */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-lg">
          <div className="p-4 bg-[#1e293b] text-white">
            <div className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-2">Informations Patient</div>
            <div className="text-sm font-bold">{patient?.fullName}</div>
            <div className="text-[10px] text-slate-400 mt-1 space-y-0.5">
              <div>Code: <span className="text-white font-mono">{patient?.patientCode}</span></div>
              <div>Dossier: <span className="text-white font-mono">{patient?.dossierNumber || '---'}</span></div>
              <div>Genre: <span className="text-white">{patient?.gender === 'M' ? 'Masculin' : 'Féminin'}</span></div>
            </div>

            {/* Médecin Prescripteur */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[9px] font-black uppercase tracking-widest text-sky-400 mb-1.5 flex items-center gap-1">
                <Stethoscope size={10} /> Médecin Prescripteur
              </div>
              <div className="flex gap-1.5">
                <select
                  value={prescribingDoctorId}
                  onChange={e => setPrescribingDoctorId(e.target.value)}
                  className="flex-1 bg-white/10 border border-white/20 rounded p-1.5 text-[11px] text-white outline-none focus:border-sky-400 truncate cursor-pointer"
                >
                  <option value="">-- Sélectionner --</option>
                  {externalDoctors.map(pr => (
                    <option key={pr.id} value={pr.id} style={{ color: '#1e293b' }}>
                      {pr.fullName} {pr.specialty ? `(${pr.specialty})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(true)}
                  title="Créer un nouveau médecin prescripteur"
                  className="p-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded border border-sky-600 shadow-sm transition-colors cursor-pointer flex items-center justify-center shrink-0"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          {isEffectivelyInsured ? (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="bg-sky-50 rounded-lg p-3 border border-sky-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-sky-600 mb-2 flex items-center gap-2">
                  <ShieldCheck size={12} /> {newCard ? 'Nouvelle Carte' : 'Couverture Assurance'}
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex justify-between"><span className="text-slate-500">Assureur</span><span className="font-bold text-slate-800">{getInsurerLabel(activeCard.insurer)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">N° Police</span><span className="font-bold text-slate-800">{activeCard.policyNumber || '---'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Taux</span><span className="font-bold text-emerald-600">{coverageRate}%</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Du</span><span className="font-bold text-slate-700">{activeCard.startDate || '---'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Au</span><span className="font-bold text-slate-700">{activeCard.endDate || '---'}</span></div>
                </div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-700 mb-2 block">N° Bordereau Physique</label>
                <input type="text" placeholder="Saisir le code du bordereau..." value={bordereauCode}
                  onChange={(e) => setBordereauCode(e.target.value)}
                  className="w-full border border-amber-200 bg-white rounded p-2.5 text-sm outline-none focus:border-amber-500" />
                <div className="text-[9px] text-amber-600 mt-1.5 italic">Lien avec la facturation assureur.</div>
              </div>
            </div>
          ) : hasOriginalInsurance && !originalInCoverage ? (
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                <div className="text-[10px] font-black uppercase text-rose-600 flex items-center gap-2"><ShieldCheck size={12} /> Carte expirée</div>
                <div className="space-y-1 text-[11px] mt-2 text-slate-500">
                  <div>Assureur: <span className="font-bold text-slate-700">{getInsurerLabel(patient?.insurer)}</span></div>
                  <div>Fin: <span className="font-bold text-rose-600">{patient?.insuranceEndDate}</span></div>
                </div>
                <div className="text-[10px] text-rose-500 mt-2">Le patient est facturé en mode Cash tant qu'aucune nouvelle carte n'est enregistrée.</div>
              </div>

              {!showNewCardForm ? (
                <button onClick={() => { setCardForm({...cardForm, insurer: patient?.insurer || ''}); setShowNewCardForm(true); }}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg transition-all flex items-center justify-center gap-2">
                  <Plus size={14} /> Ajouter nouvelle carte
                </button>
              ) : (
                <div className="bg-white rounded-lg border border-sky-200 p-3 space-y-2.5">
                  <div className="text-[10px] font-black uppercase text-sky-600 tracking-widest">Nouvelle carte d'assurance</div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase">Assureur *</label>
                    <select 
                      value={cardForm.insurer} 
                      onChange={e => setCardForm({...cardForm, insurer: e.target.value})} 
                      className="w-full border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500 mt-0.5 font-semibold text-slate-700 bg-white"
                      required
                    >
                      <option value="" disabled>-- Choisir l'assureur --</option>
                      {insurers.map(i => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase">Souscripteur *</label>
                    <select
                      value={cardForm.subscriber}
                      onChange={e => setCardForm({...cardForm, subscriber: e.target.value})}
                      className="w-full border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500 mt-0.5 font-semibold text-slate-700 bg-white"
                      required
                    >
                      <option value="">-- Choisir le souscripteur --</option>
                      {subscribers.map(s => (
                        <option key={s.code} value={s.code}>{s.string1}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className="text-[9px] text-slate-500 font-bold uppercase">Abonné principal *</label><input placeholder="Nom de l'assuré principal" value={cardForm.mainInsured} onChange={e => setCardForm({...cardForm, mainInsured: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500 mt-0.5" /></div>
                  <div><label className="text-[9px] text-slate-500 font-bold uppercase">N° Police *</label><input placeholder="Numéro de la police" value={cardForm.policyNumber} onChange={e => setCardForm({...cardForm, policyNumber: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500 mt-0.5" /></div>
                  <div><label className="text-[9px] text-slate-500 font-bold uppercase">Taux de couverture (%)</label><input type="number" min="0" max="100" value={cardForm.coverageRate} onChange={e => setCardForm({...cardForm, coverageRate: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500 mt-0.5" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[9px] text-slate-500 font-bold uppercase">Date début *</label><input type="date" value={cardForm.startDate} onChange={e => setCardForm({...cardForm, startDate: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm outline-none mt-0.5" /></div>
                    <div><label className="text-[9px] text-slate-500 font-bold uppercase">Date expiration *</label><input type="date" value={cardForm.endDate} onChange={e => setCardForm({...cardForm, endDate: e.target.value})} className="w-full border border-slate-200 rounded p-2 text-sm outline-none mt-0.5" /></div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setShowNewCardForm(false)} className="flex-1 bg-slate-200 text-slate-600 py-2 rounded text-[10px] font-bold">Annuler</button>
                    <button onClick={() => {
                      if (cardForm.insurer && cardForm.subscriber && cardForm.mainInsured && cardForm.policyNumber && cardForm.startDate && cardForm.endDate) {
                        setNewCard({...cardForm}); setShowNewCardForm(false); setCart([]);
                        showToast('Nouvelle carte enregistrée — tarif assuré appliqué');
                      } else {
                        showToast('Veuillez remplir tous les champs obligatoires (*)', 'error');
                      }
                    }} className="flex-1 bg-sky-600 text-white py-2 rounded text-[10px] font-bold">Valider</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 p-4 flex items-center justify-center">
              <div className="text-center">
                <ShieldCheck size={40} className="mx-auto mb-3 text-slate-200" />
                <div className="text-xs font-bold text-slate-400 uppercase">Mode Cash</div>
                <div className="text-[10px] text-slate-400 mt-1">Patient non assuré — facturation directe.</div>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="text-center">
              <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Reste à payer</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{fmt(partPatient)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de création médecin prescripteur externe */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-scale-in">
            <div className="bg-sky-800 p-4 flex justify-between items-center">
              <h3 className="text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Plus size={14} /> Nouveau Médecin Prescripteur
              </h3>
              <button type="button" onClick={() => setShowAddDoctorModal(false)} className="text-white/60 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateExternalDoctor} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">Nom complet *</label>
                <input
                  type="text"
                  required
                  value={newDoctorName}
                  onChange={e => setNewDoctorName(e.target.value)}
                  placeholder="Dr. Jean Dupont..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-sky-500 bg-white text-slate-700 font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">Spécialité</label>
                <input
                  type="text"
                  value={newDoctorSpecialty}
                  onChange={e => setNewDoctorSpecialty(e.target.value)}
                  placeholder="Cardiologie, Généraliste..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-sky-500 bg-white text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1.5">Téléphone</label>
                <input
                  type="text"
                  value={newDoctorPhone}
                  onChange={e => setNewDoctorPhone(e.target.value)}
                  placeholder="+226 70 00 00 00..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-sky-500 bg-white text-slate-700"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingDoctor || !newDoctorName.trim()}
                  className="flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shadow-md cursor-pointer"
                >
                  {creatingDoctor ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingView;
