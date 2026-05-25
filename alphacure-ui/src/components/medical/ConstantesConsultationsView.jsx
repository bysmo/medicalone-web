import React, { useState, useEffect } from 'react';
import { Activity, Search, ChevronRight, Check, X, Loader2, UserCheck, ClipboardList } from 'lucide-react';
import { prestationService, patientService, nomenclatureService, medicalService, practitionerService } from '../../services/api';
import { hasRole } from '../../services/auth';

const VITAL_ICONS = {
  POIDS: '⚖️',
  TAILLE: '📏',
  TEMPERATURE: '🌡️',
  TA_SYSTOLIQUE: '🩺',
  TA_DIASTOLIQUE: '🩺',
  FREQUENCE_CARDIAQUE: '❤️',
  SATURATION_O2: '🫁',
  GLYCEMIE: '💉',
  IMC: '📊',
  FREQUENCE_RESPIRATOIRE: '🫀',
};

const ConstantesConsultationsView = ({ showToast }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [constantes, setConstantes] = useState([]);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [myPractitionerId, setMyPractitionerId] = useState(null);

  // Resolve logged-in doctor's practitioner ID
  useEffect(() => {
    if (hasRole('MEDECIN') || hasRole('INFIRMIER')) {
      practitionerService.getMe()
        .then(r => { if (r.data?.id) setMyPractitionerId(r.data.id); })
        .catch(() => {});
    }
  }, []);

  const loadPatientsForVitals = async (practId) => {
    setLoading(true);
    try {
      const [vitalsQueueRes, patRes] = await Promise.all([
        medicalService.getVitalsQueue(),
        patientService.search('', 0, 1000),
      ]);
      const patientsMap = {};
      (patRes.data.content || []).forEach(p => { patientsMap[p.id] = p; });

      const consultations = vitalsQueueRes.data || [];
      const rows = consultations.map(c => {
        const patient = c.patientId ? patientsMap[c.patientId] : null;
        return {
          consultationId: c.id,
          prestationId: c.prestationId,
          actName: c.actName || (c.nature === 'SEANCES' ? 'Séance' : 'Consultation'),
          nature: c.nature,
          practitionerId: c.practitionerId,
          time: c.createdAt ? c.createdAt.split('T')[1]?.substring(0, 5) : '00:00',
          patientId: c.patientId || null,
          patientName: patient ? patient.fullName || `${patient.firstName} ${patient.lastName}` : 'Patient inconnu',
          patientCode: patient?.patientCode || '---',
        };
      }).filter(row => {
        if (hasRole('MEDECIN') && practId && String(row.practitionerId) !== String(practId)) {
          return false;
        }
        return true;
      });

      setPatients(rows);
    } catch (err) {
      console.error(err);
      showToast('Erreur de chargement de la file d\'attente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadConstantes = async () => {
    try {
      const res = await nomenclatureService.search('CONSTANTES_MEDICALES', 'MEDICAL');
      const rawList = res.data || [];
      const unique = [];
      const codes = new Set();
      rawList.forEach(item => {
        if (item.code && !codes.has(item.code)) {
          codes.add(item.code);
          unique.push(item);
        }
      });
      setConstantes(unique);
      const initVals = {};
      unique.forEach(c => { initVals[c.code] = ''; });
      setValues(initVals);
    } catch (err) {
      console.error(err);
      // Fallback si la nomenclature n'est pas encore peuplée
      const fallback = [
        { code: 'POIDS', string1: 'Poids', string2: 'kg' },
        { code: 'TAILLE', string1: 'Taille', string2: 'cm' },
        { code: 'TEMPERATURE', string1: 'Température', string2: '°C' },
        { code: 'TA_SYSTOLIQUE', string1: 'Tension Artérielle (Systolique)', string2: 'mmHg' },
        { code: 'TA_DIASTOLIQUE', string1: 'Tension Artérielle (Diastolique)', string2: 'mmHg' },
        { code: 'FREQUENCE_CARDIAQUE', string1: 'Fréquence Cardiaque', string2: 'bpm' },
        { code: 'SATURATION_O2', string1: 'Saturation en Oxygène (SpO₂)', string2: '%' },
        { code: 'GLYCEMIE', string1: 'Glycémie', string2: 'g/L' },
      ];
      setConstantes(fallback);
      const initVals = {};
      fallback.forEach(c => { initVals[c.code] = ''; });
      setValues(initVals);
    }
  };

  useEffect(() => {
    if (!hasRole('MEDECIN') && !hasRole('INFIRMIER')) {
      loadPatientsForVitals(null);
    } else if (myPractitionerId) {
      loadPatientsForVitals(myPractitionerId);
    }
    loadConstantes();
  }, [myPractitionerId]);

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    const initVals = {};
    constantes.forEach(c => { initVals[c.code] = ''; });
    setValues(initVals);
  };

  const handleSaveVitals = async () => {
    if (!selectedPatient) return;
    const filledConstantes = constantes
      .map(c => ({ constantCode: c.code, constantName: c.string1, value: values[c.code] || '', unit: c.string2 || '' }))
      .filter(c => c.value.trim() !== '');

    if (filledConstantes.length === 0) {
      showToast('Veuillez remplir au moins une constante', 'error');
      return;
    }

    setSaving(true);
    try {
      let consultationId = selectedPatient.consultationId;
      if (!consultationId) {
        try {
          const consRes = await medicalService.createConsultation({
            prestationId: selectedPatient.prestationId,
            patientId: selectedPatient.patientId,
            nature: 'CONSULTATIONS',
          });
          consultationId = consRes.data?.id;
        } catch (_) { /* consultation may already exist or service unavailable */ }
      }

      await medicalService.saveVitals({
        prestationId: selectedPatient.prestationId,
        patientId: selectedPatient.patientId,
        consultationId,
        constantes: filledConstantes,
        takenBy: 'Infirmier',
      });

      showToast(`Constantes enregistrées pour ${selectedPatient.patientName}`, 'success');
      setSelectedPatient(null);
      loadPatientsForVitals(myPractitionerId);
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement des constantes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = patients.filter(p =>
    !searchTerm ||
    p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.patientCode.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg">
          <Activity size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Prise de Constantes</h2>
          <p className="text-[11px] text-slate-400 font-semibold">Patients du jour en attente de constantes médicales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Liste des patients */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
                <ClipboardList size={14} /> File d'attente constantes
              </h3>
              <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Search size={14} className="text-white/70" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
                placeholder="Rechercher patient..."
                className="bg-transparent text-white placeholder-white/50 text-xs font-medium outline-none flex-1"
              />
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <span className="ml-2 text-slate-500 text-sm">Chargement...</span>
              </div>
            ) : paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <UserCheck size={40} className="mb-3 text-emerald-300" />
                <p className="font-bold text-sm">Aucun patient en attente</p>
                <p className="text-[11px]">Toutes les constantes ont été prises aujourd'hui</p>
              </div>
            ) : (
              paginated.map((p) => (
                <div
                  key={p.consultationId}
                  onClick={() => handleSelectPatient(p)}
                  className={`flex items-center gap-4 p-4 cursor-pointer transition-all hover:bg-indigo-50 group ${selectedPatient?.consultationId === p.consultationId ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                    {p.patientName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-sm truncate">{p.patientName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.patientCode} • {p.actName}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-black text-slate-500">{p.time}</span>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="text-[10px] font-bold px-3 py-1.5 rounded bg-slate-100 text-slate-500 disabled:opacity-30 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">
                Précédent
              </button>
              <span className="text-[10px] text-slate-400">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="text-[10px] font-bold px-3 py-1.5 rounded bg-slate-100 text-slate-500 disabled:opacity-30 hover:bg-indigo-100 hover:text-indigo-600 transition-colors">
                Suivant
              </button>
            </div>
          )}
        </div>

        {/* Formulaire de saisie des constantes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center h-full min-h-80 text-slate-400 p-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
                <Activity size={28} className="text-slate-300" />
              </div>
              <p className="font-bold text-sm text-slate-500">Sélectionnez un patient</p>
              <p className="text-[11px] text-center mt-1">Cliquez sur un patient dans la liste pour saisir ses constantes médicales</p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-black text-sm">{selectedPatient.patientName}</h3>
                    <p className="text-white/70 text-[10px]">{selectedPatient.patientCode} • {selectedPatient.actName}</p>
                  </div>
                  <button onClick={() => setSelectedPatient(null)} className="text-white/60 hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto max-h-96">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Constantes médicales</p>
                {constantes.map((c) => (
                  <div key={c.code} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <span className="text-xl w-8 text-center">{VITAL_ICONS[c.code] || '📋'}</span>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">{c.string1}</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={values[c.code] || ''}
                          onChange={e => setValues(prev => ({ ...prev, [c.code]: e.target.value }))}
                          placeholder="Valeur"
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                        <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-1.5 rounded-lg min-w-12 text-center">{c.string2 || ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-100 flex gap-3">
                <button onClick={() => setSelectedPatient(null)}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
                <button onClick={handleSaveVitals} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Enregistrement...' : 'Valider les constantes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConstantesConsultationsView;
