import React, { useState, useEffect, useCallback } from 'react';
import { FolderOpen, ChevronRight } from 'lucide-react';
import { patientService } from '../../services/api';
import DataTable from '../ui/DataTable';
import DossierMedicalView from './DossierMedicalView';

const DossiersMedicauxListView = ({ showToast }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [openDossier, setOpenDossier] = useState(null);

  const loadPatients = useCallback(async (q, p, size) => {
    setLoading(true);
    try {
      const res = await patientService.search(q, p, size);
      const content = res.data.content || [];
      setPatients(content.map(p => ({
        ...p,
        fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        genderLabel: p.gender === 'M' || p.gender === 'Masculin' ? 'Masculin' : 'Féminin',
      })));
      setTotalElements(res.data.totalElements ?? content.length);
      setTotalPages(res.data.totalPages ?? 1);
    } catch (err) {
      console.error(err);
      showToast('Erreur de chargement des patients', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const t = setTimeout(() => loadPatients(search, page, pageSize), 300);
    return () => clearTimeout(t);
  }, [search, page, pageSize, loadPatients]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(0);
  };

  const openPatient = (row) => {
    setOpenDossier({
      patientId: row.id,
      patientName: row.fullName,
      patientCode: row.patientCode,
    });
  };

  if (openDossier) {
    return (
      <DossierMedicalView
        patientId={openDossier.patientId}
        patientName={openDossier.patientName}
        patientCode={openDossier.patientCode}
        onClose={() => setOpenDossier(null)}
        backLabel="Retour à la liste"
        showToast={showToast}
      />
    );
  }

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

  const columns = [
    {
      label: 'Code patient',
      key: 'patientCode',
      render: (p) => <span className="font-mono text-[11px] text-teal-600 font-black">{p.patientCode}</span>,
    },
    {
      label: 'Nom & prénom',
      key: 'fullName',
      render: (p) => {
        const hasInsurance = !!p.insurer;
        return (
          <div className="flex flex-col">
            <span className={`uppercase text-slate-800 ${hasInsurance ? 'font-black' : 'font-normal italic text-slate-500'}`}>
              {p.fullName}
            </span>
            {hasInsurance && (
              <span className="text-[10px] text-teal-600 font-bold mt-0.5">
                🛡️ Assuré : {p.insurer} {p.policyNumber ? `(n° ${p.policyNumber})` : ''} - {p.coverageRate || 0}%
              </span>
            )}
          </div>
        );
      },
    },
    {
      label: 'N° dossier',
      key: 'dossierNumber',
      render: (p) => <span className="font-mono text-[11px] text-slate-500">{p.dossierNumber || '—'}</span>,
    },
    {
      label: 'Sexe',
      key: 'genderLabel',
      render: (p) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${p.gender === 'M' || p.gender === 'Masculin'
          ? 'bg-sky-100 text-sky-700'
          : 'bg-rose-100 text-rose-700'
          }`}>
          {p.genderLabel}
        </span>
      ),
    },
    {
      label: 'Téléphone',
      key: 'phone1',
      render: (p) => (
        <span className="font-semibold text-slate-600 font-mono text-xs">
          {[p.phone1, p.phone2].filter(Boolean).join(' / ') || '—'}
        </span>
      ),
    },
    {
      label: 'Date de naissance',
      key: 'birthDate',
      render: (p) => {
        const ageInfo = computeAgeAndTranche(p.birthDate);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-600 text-sm">
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
      },
    },
  ];

  const pagination = {
    currentPage: page,
    totalPages: Math.max(1, totalPages),
    totalElements,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: (size) => {
      setPageSize(size);
      setPage(0);
    },
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-lg">
          <FolderOpen size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Dossiers médicaux</h2>
          <p className="text-[11px] text-slate-400 font-semibold">
            Rechercher un patient et consulter son dossier médical complet
          </p>
        </div>
      </div>

      <DataTable
        title="Registre des dossiers médicaux"
        columns={columns}
        data={patients}
        loading={loading}
        onSearch={handleSearch}
        searchPlaceholder="Nom, code patient, n° dossier..."
        entryLabel="dossiers"
        pagination={pagination}
        extraActions={(row) => (
          <button
            type="button"
            onClick={() => openPatient(row)}
            className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[10px] font-black uppercase hover:bg-teal-700 inline-flex items-center gap-1"
          >
            <ChevronRight size={11} /> Consulter
          </button>
        )}
      />
    </div>
  );
};

export default DossiersMedicauxListView;
