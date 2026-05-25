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

  const columns = [
    {
      label: 'Code patient',
      key: 'patientCode',
      render: (p) => <span className="font-mono text-[11px] text-teal-600 font-black">{p.patientCode}</span>,
    },
    {
      label: 'Nom & prénom',
      key: 'fullName',
      render: (p) => <span className="font-black text-slate-800 uppercase">{p.fullName}</span>,
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
        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
          p.gender === 'M' || p.gender === 'Masculin'
            ? 'bg-sky-100 text-sky-700'
            : 'bg-rose-100 text-rose-700'
        }`}>
          {p.genderLabel}
        </span>
      ),
    },
    {
      label: 'Date de naissance',
      key: 'birthDate',
      render: (p) => <span className="font-bold text-slate-600 text-sm">{p.birthDate || '—'}</span>,
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
