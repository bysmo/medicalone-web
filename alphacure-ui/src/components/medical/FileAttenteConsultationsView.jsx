import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Clock, Play, ChevronRight, Activity, Timer, AlertCircle, ShieldAlert } from 'lucide-react';
import { medicalService, prestationService, patientService, practitionerService } from '../../services/api';
import { hasRole } from '../../services/auth';
import { useClientTable } from '../../hooks/useClientTable';
import DataTable from '../ui/DataTable';
import DossierMedicalView from './DossierMedicalView';

const MEDICAL_STATUS = {
  EN_ATTENTE: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  DEMARREE: { label: 'En cours', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  TERMINEE: { label: 'Terminée', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

const FileAttenteConsultationsView = ({ showToast }) => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDossier, setOpenDossier] = useState(null);
  const [practitionerId, setPractitionerId] = useState(null);
  const [practitionerResolved, setPractitionerResolved] = useState(false);
  const [now, setNow] = useState(Date.now());

  const isDoctor = hasRole('MEDECIN');

  const { onSearch, paginated, pagination } = useClientTable(queue, {
    searchKeys: ['patientName', 'patientCode', 'actName', 'time', 'statusLabel'],
    initialPageSize: 10,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isDoctor) {
      setPractitionerResolved(true);
      return;
    }
    practitionerService.getMe()
      .then(r => { if (r.data?.id) setPractitionerId(r.data.id); })
      .catch(() => {})
      .finally(() => setPractitionerResolved(true));
  }, [isDoctor]);

  const getElapsed = (startTime) => {
    if (!startTime) return null;
    const diffMin = Math.floor((now - new Date(startTime).getTime()) / 60000);
    if (diffMin < 60) return `${diffMin} min`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return `${h}h${m > 0 ? m + 'min' : ''}`;
  };

  const loadQueue = useCallback(async (myPractitionerId) => {
    if (!myPractitionerId) {
      setQueue([]);
      return;
    }

    setLoading(true);
    try {
      const [prestRes, patRes, queueRes] = await Promise.all([
        prestationService.getToday(),
        patientService.search('', 0, 1000),
        medicalService.getPractitionerDayQueue(myPractitionerId),
      ]);

      const patientsMap = {};
      (patRes.data.content || []).forEach(p => { patientsMap[p.id] = p; });

      const todayPrestations = prestRes.data || [];
      const consultations = queueRes.data || [];

      // 1. Auto-create consultations for today's CONSULTATIONS prestations assigned to me that don't have a Consultation record yet
      const existingPrestationIds = new Set(consultations.map(c => c.prestationId).filter(Boolean));
      const consultPrestationsToCreate = todayPrestations.filter(line => {
        if (line.nature !== 'CONSULTATIONS') return false;
        const s = (line.status || '').toUpperCase();
        if (s !== 'EN_ATTENTE' && s !== 'REGLEE') return false;
        if (!line.practitionerId || !sameId(line.practitionerId, myPractitionerId)) return false;
        return !existingPrestationIds.has(line.id);
      });

      for (const line of consultPrestationsToCreate) {
        try {
          const consRes = await medicalService.createConsultation({
            prestationId: line.id,
            patientId: line.patientId,
            practitionerId: line.practitionerId,
            nature: 'CONSULTATIONS',
            actName: line.actName,
          });
          if (consRes.data) {
            consultations.push(consRes.data);
          }
        } catch (_) { /* already exists or error */ }
      }

      // 2. Build the display queue list from the consultations
      const enriched = consultations.map(c => {
        const patient = c.patientId ? patientsMap[c.patientId] : null;
        
        // Find matching today's prestation if any
        const matchPrestation = todayPrestations.find(p => p.id === c.prestationId);
        
        // Resolve actName: use c.actName, matchPrestation.actName, or fallback to nature label
        let displayActName = c.actName;
        if (!displayActName && matchPrestation) {
          displayActName = matchPrestation.actName;
        }
        if (!displayActName) {
          displayActName = c.nature === 'SEANCES' ? 'Séance' : 'Consultation';
        }

        const cfg = MEDICAL_STATUS[c.medicalStatus] || MEDICAL_STATUS.EN_ATTENTE;
        return {
          prestationId: c.prestationId,
          invoiceId: matchPrestation?.invoiceId || null,
          actName: displayActName,
          practitionerId: c.practitionerId,
          patientId: c.patientId || null,
          patientName: patient
            ? patient.fullName || `${patient.firstName} ${patient.lastName}`
            : 'Patient inconnu',
          patientCode: patient?.patientCode || '---',
          time: c.createdAt ? c.createdAt.split('T')[1]?.substring(0, 5) : '00:00',
          consultationId: c.id,
          medicalStatus: c.medicalStatus,
          statusLabel: cfg.label,
          startTime: c.startTime || null,
          endTime: c.endTime || null,
        };
      });

      enriched.sort((a, b) => {
        const order = { EN_ATTENTE: 0, DEMARREE: 1, TERMINEE: 2 };
        const oa = order[a.medicalStatus] ?? 3;
        const ob = order[b.medicalStatus] ?? 3;
        if (oa !== ob) return oa - ob;
        return a.time.localeCompare(b.time);
      });

      setQueue(enriched);
    } catch (err) {
      console.error(err);
      showToast('Erreur de chargement de la file d\'attente', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!practitionerResolved || !isDoctor) return;
    if (practitionerId) loadQueue(practitionerId);
    else setQueue([]);
  }, [loadQueue, practitionerId, practitionerResolved, isDoctor]);

  const handleStartConsultation = async (item) => {
    try {
      let consId = item.consultationId;
      if (!consId) {
        const res = await medicalService.createConsultation({
          prestationId: item.prestationId,
          patientId: item.patientId,
          practitionerId: item.practitionerId,
          nature: 'CONSULTATIONS',
        });
        consId = res.data?.id;
      }
      if (consId) {
        await medicalService.startConsultation(consId);
        showToast(`Consultation démarrée pour ${item.patientName}`, 'success');
      }
      setOpenDossier({
        consultationId: consId,
        patientId: item.patientId,
        prestationId: item.prestationId,
        patientName: item.patientName,
        patientCode: item.patientCode,
      });
    } catch (err) {
      console.error(err);
      setOpenDossier({
        consultationId: item.consultationId,
        patientId: item.patientId,
        prestationId: item.prestationId,
        patientName: item.patientName,
        patientCode: item.patientCode,
      });
    }
  };

  const handleCloseDossier = () => {
    setOpenDossier(null);
    if (practitionerId) loadQueue(practitionerId);
  };

  const totals = useMemo(() => queue.reduce((acc, q) => {
    acc[q.medicalStatus] = (acc[q.medicalStatus] || 0) + 1;
    return acc;
  }, {}), [queue]);

  if (!isDoctor) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <ShieldAlert size={40} className="mx-auto text-amber-500 mb-4" />
        <h2 className="text-lg font-black text-slate-800 uppercase">Accès réservé aux médecins</h2>
        <p className="text-sm text-slate-500 mt-2">
          La file d'attente des consultations médicales n'est visible que par les comptes ayant le rôle Médecin.
        </p>
      </div>
    );
  }

  if (openDossier) {
    return (
      <DossierMedicalView
        consultationId={openDossier.consultationId}
        patientId={openDossier.patientId}
        prestationId={openDossier.prestationId}
        patientName={openDossier.patientName}
        patientCode={openDossier.patientCode}
        onClose={handleCloseDossier}
        backLabel="Retour à la file"
        showToast={showToast}
      />
    );
  }

  const showNoProfile = practitionerResolved && !practitionerId;

  const columns = [
    {
      label: 'Patient',
      key: 'patientName',
      render: (row) => (
        <div>
          <div className="font-black text-slate-800">{row.patientName}</div>
          <div className="font-mono text-[9px] text-slate-400">{row.patientCode}</div>
        </div>
      ),
    },
    { label: 'Acte', key: 'actName', render: (row) => <span className="text-sm font-bold text-slate-700">{row.actName}</span> },
    { label: 'Heure', key: 'time', render: (row) => <span className="font-mono text-sm text-slate-600">{row.time}</span> },
    {
      label: 'Durée',
      key: 'startTime',
      render: (row) => (
        row.medicalStatus === 'DEMARREE' && row.startTime ? (
          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
            <Timer size={10} /> {getElapsed(row.startTime)}
          </span>
        ) : <span className="text-slate-300">—</span>
      ),
    },
    {
      label: 'Statut',
      key: 'statusLabel',
      render: (row) => {
        const cfg = MEDICAL_STATUS[row.medicalStatus] || MEDICAL_STATUS.EN_ATTENTE;
        return (
          <span className={`${cfg.bg} ${cfg.text} ${cfg.border} border px-2 py-0.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">File d'attente</h2>
            <p className="text-[11px] text-slate-400 font-semibold">Vos consultations affectées du jour</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => practitionerId && loadQueue(practitionerId)}
          disabled={loading || showNoProfile}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase hover:bg-emerald-100 transition-colors disabled:opacity-50"
        >
          <Activity size={12} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {showNoProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Profil praticien introuvable</p>
            <p className="text-[11px] text-amber-700 mt-1">Votre email Keycloak doit correspondre à la fiche praticien.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'EN_ATTENTE', label: 'En attente', color: 'amber', icon: Clock },
          { key: 'DEMARREE', label: 'En cours', color: 'emerald', icon: Play },
          { key: 'TERMINEE', label: 'Terminées', color: 'slate', icon: Activity },
        ].map(({ key, label, color, icon: Icon }) => (
          <div key={key} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4`}>
            <div className={`text-${color}-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1`}>
              <Icon size={10} /> {label}
            </div>
            <div className={`text-3xl font-black text-${color}-700 mt-1`}>{totals[key] || 0}</div>
          </div>
        ))}
      </div>

      <DataTable
        title="Mes patients en attente de consultation"
        columns={columns}
        data={paginated}
        loading={loading}
        onSearch={onSearch}
        searchPlaceholder="Rechercher patient, code, acte, statut..."
        entryLabel="consultations"
        pagination={pagination}
        extraActions={(row) => (
          row.medicalStatus !== 'TERMINEE' ? (
            <button
              type="button"
              onClick={() => handleStartConsultation(row)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 inline-flex items-center gap-1"
            >
              {row.medicalStatus === 'EN_ATTENTE' ? (
                <><Play size={11} /> Démarrer</>
              ) : (
                <><ChevronRight size={11} /> Dossier</>
              )}
            </button>
          ) : null
        )}
      />
    </div>
  );
};

export default FileAttenteConsultationsView;
