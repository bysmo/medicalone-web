import React, { useState, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Search, Save, X, Loader2,
  Stethoscope, FlaskConical, HeartPulse, DollarSign, Tag, Info, ChevronDown
} from 'lucide-react';
import { medicalActService, nomenclatureService } from '../../services/api';
import DataTable from '../ui/DataTable';

const ActsManagement = ({ showToast }) => {
  const [acts, setActs] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [natures, setNatures] = useState([]);
  const [labSections, setLabSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterNature, setFilterNature] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingAct, setEditingAct] = useState(null);
  const [showTariffs, setShowTariffs] = useState(null);
  const [tariffs, setTariffs] = useState([]);
  const [tariffForm, setTariffForm] = useState({ tariffType: 'STANDARD', amount: '' });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const [formData, setFormData] = useState({
    code: '', name: '', nature: '', specialty: '', isLabExam: false, labSection: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    loadActs();
  }, [filterNature, filterSpecialty]);

  const fetchInitialData = async () => {
    try {
      const [specsRes, naturesRes, labSectionsRes] = await Promise.all([
        nomenclatureService.search('SPECIALITE', 'MEDICAL'),
        nomenclatureService.search('NATURE_ACTE', 'MEDICAL'),
        nomenclatureService.search('SECTION_LABO', 'LABORATOIRE')
      ]);
      setSpecialties(specsRes.data || []);
      setNatures(naturesRes.data || []);
      setLabSections(labSectionsRes.data || []);
      
      // Default nature if none exists or to initialize form
      if (naturesRes.data?.length > 0) {
        setFormData(prev => ({ ...prev, nature: naturesRes.data[0].code }));
      }
    } catch (err) {
      console.error("Error fetching nomenclatures", err);
    }
  };

  const loadActs = async () => {
    setLoading(true);
    try {
      const res = await medicalActService.getAll(filterNature || '', filterSpecialty || '');
      setActs(res.data || []);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.message
        || 'Erreur lors du chargement des actes';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = acts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.code.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const openCreate = () => {
    setEditingAct(null);
    setFormData({ 
      code: '', 
      name: '', 
      nature: natures[0]?.code || '', 
      specialty: specialties[0]?.code || '', 
      isLabExam: false,
      labSection: ''
    });
    setShowForm(true);
  };

  const openEdit = (act) => {
    setEditingAct(act);
    setFormData({ 
      code: act.code, 
      name: act.name, 
      nature: act.nature, 
      specialty: act.specialty || '', 
      isLabExam: act.isLabExam || false,
      labSection: act.labSection || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.nature) { 
      showToast('Code, nom et nature sont obligatoires', 'error'); 
      return; 
    }
    if (formData.isLabExam && !formData.labSection) {
      showToast('Veuillez sélectionner une section de laboratoire', 'error');
      return;
    }
    try {
      // Clean labSection if not a lab exam
      const payload = {
        ...formData,
        labSection: formData.isLabExam ? formData.labSection : null
      };

      if (editingAct) {
        await medicalActService.update(editingAct.id, payload);
        showToast('Acte modifié avec succès');
      } else {
        await medicalActService.create(payload);
        showToast('Acte créé avec succès');
      }
      setShowForm(false);
      loadActs();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleDelete = async (act) => {
    if (!window.confirm(`Désactiver l'acte "${act.name}" ?`)) return;
    try {
      await medicalActService.delete(act.id);
      showToast('Acte désactivé');
      loadActs();
    } catch (err) {
      showToast('Erreur lors de la désactivation', 'error');
    }
  };

  const openTariffs = async (act) => {
    setShowTariffs(act);
    try {
      const res = await medicalActService.getTariffs(act.id);
      setTariffs(res.data || []);
    } catch (err) {
      setTariffs([]);
    }
  };

  const saveTariff = async () => {
    if (!tariffForm.amount) { showToast('Montant obligatoire', 'error'); return; }
    try {
      await medicalActService.saveTariff(showTariffs.id, tariffForm);
      showToast('Tarif enregistré');
      openTariffs(showTariffs);
      setTariffForm({ tariffType: 'STANDARD', amount: '' });
    } catch (err) {
      showToast('Erreur lors de l\'enregistrement du tarif', 'error');
    }
  };

  const getNatureLabel = (code) => natures.find(n => n.code === code)?.string1 || code;
  const getSpecialtyLabel = (code) => specialties.find(s => s.code === code)?.string1 || code || '---';
  const getLabSectionLabel = (code) => labSections.find(l => l.code === code)?.string1 || code || 'Non spécifié';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Stethoscope size={28} className="text-sky-600" /> Catalogue des Actes Médicaux
        </h2>
        <button onClick={openCreate} className="bg-sky-700 text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-sky-800 shadow-lg transition-all">
          <Plus size={14} /> Nouvel Acte
        </button>
      </div>

      {/* Dropdowns Filter Row */}
      <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200/60 flex flex-wrap items-center gap-3 shadow-sm animate-fade-in">
        <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Filtrer par :</div>
        
        <div className="relative flex-1 min-w-[200px]">
          <select
            value={filterNature}
            onChange={e => {
              setFilterNature(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:border-sky-500 appearance-none cursor-pointer"
          >
            <option value="">Toutes les Natures</option>
            {natures.map(n => (
              <option key={n.code} value={n.code}>{n.string1}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <select
            value={filterSpecialty}
            onChange={e => {
              setFilterSpecialty(e.target.value);
              setCurrentPage(0);
            }}
            className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:border-sky-500 appearance-none cursor-pointer"
          >
            <option value="">Toutes les Spécialités</option>
            {specialties.map(s => (
              <option key={s.code} value={s.code}>{s.string1}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>
      </div>

      {/* Modern Data Table */}
      <DataTable
        columns={[
          {
            label: "Code",
            key: "code",
            render: (row) => <span className="font-mono font-black text-sky-600 text-[11px]">{row.code}</span>
          },
          {
            label: "Nom de l'acte",
            key: "name",
            render: (row) => <span className="font-bold text-slate-800">{row.name}</span>
          },
          {
            label: "Nature",
            key: "nature",
            render: (row) => (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">
                {getNatureLabel(row.nature)}
              </span>
            )
          },
          {
            label: "Spécialité",
            key: "specialty",
            render: (row) => (
              <span className="text-slate-500 font-medium">
                {getSpecialtyLabel(row.specialty)}
              </span>
            )
          },
          {
            label: "Labo / Section",
            key: "labSection",
            render: (row) => (
              row.isLabExam ? (
                <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-[9px] font-black flex items-center gap-1 w-fit">
                  🧪 {getLabSectionLabel(row.labSection)}
                </span>
              ) : (
                <span className="text-slate-300">—</span>
              )
            )
          },
          {
            label: "Statut",
            key: "status",
            render: () => (
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase border border-emerald-200">
                Actif
              </span>
            )
          }
        ]}
        data={paginatedData}
        loading={loading}
        onSearch={(query) => {
          setSearch(query);
          setCurrentPage(0);
        }}
        searchPlaceholder="Rechercher un acte (code, nom...)"
        entryLabel="actes"
        onEdit={(row) => openEdit(row)}
        onDelete={(row) => handleDelete(row)}
        extraActions={(row) => (
          <button
            onClick={() => openTariffs(row)}
            title="Tarifs"
            className="p-1.5 bg-white hover:bg-amber-100 text-amber-600 rounded border border-slate-200 shadow-sm transition-colors"
          >
            <DollarSign size={13} />
          </button>
        )}
        pagination={{
          currentPage,
          totalPages: Math.ceil(filtered.length / pageSize),
          totalElements: filtered.length,
          pageSize,
          onPageChange: (page) => setCurrentPage(page),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(0);
          }
        }}
      />

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="bg-[#1e293b] p-4 flex justify-between items-center">
              <h3 className="text-white text-[11px] font-black uppercase tracking-widest">
                {editingAct ? 'Modifier l\'acte' : 'Nouvel acte médical'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Code *</label>
                  <input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="Ex: CSG, NFS, KIN..." className="w-full border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-500 font-mono" />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nom de l'acte *</label>
                  <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    placeholder="Ex: CONSULTATION GÉNÉRALE" className="w-full border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nature de l'acte *</label>
                  <select 
                    value={formData.nature} 
                    onChange={e => setFormData({...formData, nature: e.target.value})}
                    className="w-full border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="" disabled>-- Sélectionner --</option>
                    {natures.map(n => (
                      <option key={n.code} value={n.code}>{n.string1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Spécialité associée</label>
                  <select 
                    value={formData.specialty} 
                    onChange={e => setFormData({...formData, specialty: e.target.value})}
                    className="w-full border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="">Aucune spécialité</option>
                    {specialties.map(s => (
                      <option key={s.code} value={s.code}>{s.string1}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lab Exam Toggle */}
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-lg border border-violet-100">
                <div onClick={() => setFormData({...formData, isLabExam: !formData.isLabExam, labSection: !formData.isLabExam ? (labSections[0]?.code || '') : ''})}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-all ${formData.isLabExam ? 'bg-violet-600' : 'bg-slate-300'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${formData.isLabExam ? 'translate-x-5' : ''}`}></div>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-700">Examen de laboratoire</span>
              </div>

              {/* Dynamic Lab Section dropdown only shown if isLabExam is checked */}
              {formData.isLabExam && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Section de laboratoire associée *</label>
                  <select 
                    value={formData.labSection} 
                    onChange={e => setFormData({...formData, labSection: e.target.value})}
                    className="w-full border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-sky-500 font-semibold bg-white text-slate-700"
                    required
                  >
                    <option value="" disabled>-- Sélectionner la section --</option>
                    {labSections.map(l => (
                      <option key={l.code} value={l.code}>{l.string1}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase">Annuler</button>
                <button onClick={handleSave} className="flex-1 bg-sky-600 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2">
                  <Save size={14} /> {editingAct ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tariffs Modal - Standard implementation preserved */}
      {showTariffs && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="bg-amber-600 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-white text-[11px] font-black uppercase tracking-widest">Tarifs — {showTariffs.code}</h3>
                <div className="text-white/70 text-[10px] mt-0.5">{showTariffs.name}</div>
              </div>
              <button onClick={() => setShowTariffs(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {tariffs.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Tarifs enregistrés</div>
                  {tariffs.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-700 uppercase">{t.tariffType}</span>
                      <span className="text-sm font-black text-emerald-600">{Number(t.amount).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ajouter / modifier un tarif</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Type de tarif</label>
                    <select value={tariffForm.tariffType} onChange={e => setTariffForm({...tariffForm, tariffType: e.target.value})}
                      className="w-full border border-slate-200 rounded p-2.5 text-sm outline-none">
                      <option value="STANDARD">STANDARD</option>
                      <option value="ASSURE_NATIONAL">ASSURE NATIONAL</option>
                      <option value="ASSURE_INTERNATIONAL">ASSURE INTERNATIONAL</option>
                      <option value="URGENCE">URGENCE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Montant (FCFA)</label>
                    <input type="number" value={tariffForm.amount} onChange={e => setTariffForm({...tariffForm, amount: e.target.value})}
                      placeholder="Ex: 5000" className="w-full border border-slate-200 rounded p-2.5 text-sm outline-none focus:border-amber-500" />
                  </div>
                </div>
                <button onClick={saveTariff} className="w-full bg-amber-600 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-amber-700">
                  <Save size={14} /> Enregistrer le tarif
                </button>
              </div>
              <button onClick={() => setShowTariffs(null)} className="w-full bg-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase mt-2">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActsManagement;
