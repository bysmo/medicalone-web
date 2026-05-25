import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { History, AlertCircle, Calendar, Filter, ChevronRight } from 'lucide-react';
import {
  medicalService, prestationService, patientService, practitionerService, medicalActService
} from '../../services/api';
import { hasRole } from '../../services/auth';
import { extractActSpecialty, formatSpecialtyLabel } from '../../utils/specialtyUtils';
import { useClientTable } from '../../hooks/useClientTable';
import DataTable from '../ui/DataTable';
import DossierMedicalView from './DossierMedicalView';

const STATUS_LABELS = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  DEMARREE: { label: 'En cours', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  TERMINEE: { label: 'Terminée', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const formatDate = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const toDateInput = (d) => {
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
};

const defaultDateFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return toDateInput(d);
};

const defaultDateTo = () => toDateInput(new Date());

const HistoriquePrestationsView = ({ showToast }) => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [practitionerId, setPractitionerId] = useState(null);
  const [resolved, setResolved] = useState(false);
  const [openDossier, setOpenDossier] = useState(null);

  const [onlyMine, setOnlyMine] = useState(true);
  const [dateFrom, setDateFrom] = useState(defaultDateFrom);
  const [dateTo, setDateTo] = useState(defaultDateTo);
  const [specialtyFilter, setSpecialtyFilter] = useState('');

  const isMedecin = hasRole('MEDECIN');

  const filteredByRules = useMemo(() => {
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return allItems.filter(row => {
      if (onlyMine && practitionerId && row.practitionerId) {
        if (String(row.practitionerId) !== String(practitionerId)) return false;
      }
      if (specialtyFilter && row.specialtyKey !== specialtyFilter) return false;
      if (row.createdAt) {
        const t = new Date(row.createdAt).getTime();
        if (from && t < from.getTime()) return false;
        if (to && t > to.getTime()) return false;
      }
      return true;
    });
  }, [allItems, onlyMine, practitionerId, specialtyFilter, dateFrom, dateTo]);

  const specialtyOptions = useMemo(() => {
    const keys = new Set(allItems.map(i => i.specialtyKey).filter(Boolean));
    return Array.from(keys).sort().map(k => ({ value: k, label: formatSpecialtyLabel(k) }));
  }, [allItems]);

  const { onSearch, paginated, pagination, setPage } = useClientTable(filteredByRules, {
    searchKeys: ['patientName', 'patientCode', 'actName', 'statusLabel', 'specialtyLabel'],
    initialPageSize: 10,
  });

  useEffect(() => {
    if (isMedecin) {
      practitionerService.getMe()
        .then(r => { if (r.data?.id) setPractitionerId(r.data.id); })
        .finally(() => setResolved(true));
    } else {
      setOnlyMine(false);
      setResolved(true);
    }
  }, [isMedecin]);

  const loadHistory = useCallback(async () => {
    if (isMedecin && !practitionerId) {
      setAllItems([]);
      return;
    }

    setLoading(true);
    try {
      const [patRes, prestRes, actsRes] = await Promise.all([
        patientService.search('', 0, 1000),
        prestationService.getAll(),
        medicalActService.getAll(),
      ]);

      let consultations = [];

      if (isMedecin && practitionerId) {
        const consRes = await medicalService.getPractitionerConsultations(practitionerId, 365);
        consultations = consRes.data || [];
      } else if (hasRole('ADMIN') || hasRole('MANAGER_CLINIQUE')) {
        const consultPrest = (prestRes.data || []).filter(
          l => l.nature === 'CONSULTATIONS' && l.practitionerId
        );
        const results = await Promise.all(
          consultPrest.slice(0, 300).map(line =>
            medicalService.createConsultation({
              prestationId: line.id,
              patientId: line.patientId,
              practitionerId: line.practitionerId,
              nature: 'CONSULTATIONS',
            }).then(r => r.data).catch(() => null)
          )
        );
        consultations = results.filter(Boolean);
      }

      const patientsMap = {};
      (patRes.data.content || []).forEach(p => { patientsMap[p.id] = p; });
      const prestMap = {};
      (prestRes.data || []).forEach(p => { prestMap[p.id] = p; });
      const actsMap = {};
      (actsRes.data || []).forEach(a => { actsMap[a.id] = a; });

      const rows = consultations
        .filter(c => c.nature === 'CONSULTATIONS' || !c.nature)
        .map(c => {
          const prest = c.prestationId ? prestMap[c.prestationId] : null;
          const patient = c.patientId ? patientsMap[c.patientId] : null;
          const act = prest?.actId ? actsMap[prest.actId] : null;
          const actName = prest?.actName || act?.name || 'Consultation';
          const specialtyKey = extractActSpecialty({ specialty: act?.specialty, actName });
          const st = STATUS_LABELS[c.medicalStatus] || STATUS_LABELS.EN_ATTENTE;
          return {
            consultationId: c.id,
            prestationId: c.prestationId,
            patientId: c.patientId,
            practitionerId: c.practitionerId,
            medicalStatus: c.medicalStatus || 'EN_ATTENTE',
            statusLabel: st.label,
            createdAt: c.createdAt || c.startTime,
            actName,
            specialtyKey,
            specialtyLabel: formatSpecialtyLabel(specialtyKey),
            patientName: patient
              ? patient.fullName || `${patient.firstName} ${patient.lastName}`
              : 'Patient inconnu',
            patientCode: patient?.patientCode || '—',
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setAllItems(rows);
      setPage(0);
    } catch (err) {
      console.error(err);
      showToast('Erreur de chargement de l\'historique', 'error');
    } finally {
      setLoading(false);
    }
  }, [practitionerId, isMedecin, showToast, setPage]);

  useEffect(() => {
    if (!resolved) return;
    if (isMedecin && practitionerId) loadHistory();
    else if (!isMedecin) loadHistory();
    else setAllItems([]);
  }, [resolved, practitionerId, loadHistory, isMedecin]);

  const applyPreset = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(toDateInput(from));
    setDateTo(toDateInput(to));
    setPage(0);
  };

  if (openDossier) {
    return (
      <DossierMedicalView
        consultationId={openDossier.consultationId}
        patientId={openDossier.patientId}
        prestationId={openDossier.prestationId}
        patientName={openDossier.patientName}
        patientCode={openDossier.patientCode}
        onClose={() => { setOpenDossier(null); loadHistory(); }}
        backLabel="Retour à l'historique"
        showToast={showToast}
      />
    );
  }

  const noProfile = isMedecin && resolved && !practitionerId;

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
    { label: 'Spécialité', key: 'specialtyLabel', render: (row) => <span className="text-[11px] text-violet-700 font-bold">{row.specialtyLabel}</span> },
    { label: 'Date', key: 'createdAt', render: (row) => <span className="text-[11px] text-slate-600">{formatDate(row.createdAt)}</span> },
    {
      label: 'Statut',
      key: 'statusLabel',
      render: (row) => {
        const st = STATUS_LABELS[row.medicalStatus] || STATUS_LABELS.EN_ATTENTE;
        return (
          <span className={`${st.cls} border px-2 py-0.5 rounded-full text-[9px] font-black uppercase`}>
            {st.label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg">
            <History size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Historique des prestations</h2>
            <p className="text-[11px] text-slate-400 font-semibold">Consultations médicales réalisées ou en cours</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          disabled={loading || noProfile}
          className="px-4 py-2 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 text-[10px] font-black uppercase hover:bg-violet-100 disabled:opacity-50"
        >
          Actualiser
        </button>
      </div>

      {noProfile && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="text-amber-600 shrink-0" size={20} />
          <p className="text-sm text-amber-800 font-bold">Profil praticien introuvable pour votre compte.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
          <Filter size={14} className="text-violet-600" /> Filtres
        </div>
        <div className="flex flex-wrap gap-4 items-end">
          {isMedecin && (
            <label className="flex items-center gap-2 cursor-pointer bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={e => { setOnlyMine(e.target.checked); setPage(0); }}
                className="rounded border-violet-400 text-violet-600"
              />
              <span className="text-[11px] font-black text-violet-800 uppercase">Mes prestations uniquement</span>
            </label>
          )}
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(0); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(0); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Spécialité</label>
            <select
              value={specialtyFilter}
              onChange={e => { setSpecialtyFilter(e.target.value); setPage(0); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-[180px] outline-none focus:border-violet-400"
            >
              <option value="">Toutes les spécialités</option>
              {specialtyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1 items-end">
            <span className="text-[9px] font-black uppercase text-slate-400 mr-1 self-center">Raccourcis</span>
            {[7, 30, 90, 365].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => applyPreset(d)}
                className="px-2 py-1.5 rounded border border-slate-200 text-[10px] font-bold hover:bg-violet-50"
              >
                {d}j
              </button>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <Calendar size={10} /> {filteredByRules.length} prestation(s) après filtres
        </p>
      </div>

      <DataTable
        title="Historique des consultations"
        columns={columns}
        data={paginated}
        loading={loading}
        onSearch={onSearch}
        searchPlaceholder="Rechercher patient, code, acte, spécialité..."
        entryLabel="prestations"
        pagination={pagination}
        extraActions={(row) => (
          <button
            type="button"
            onClick={() => setOpenDossier(row)}
            className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-[10px] font-black uppercase hover:bg-violet-700 inline-flex items-center gap-1"
          >
            <ChevronRight size={11} /> Dossier
          </button>
        )}
      />
    </div>
  );
};

export default HistoriquePrestationsView;
