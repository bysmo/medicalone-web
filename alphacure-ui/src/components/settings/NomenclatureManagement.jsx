import React, { useState, useEffect } from 'react';
import {
  Settings, Plus, Search, Edit2, Trash2, Save, X, Loader2, Tag, ChevronDown, Info, Calendar, Percent, AlignLeft, DollarSign
} from 'lucide-react';
import { nomenclatureService } from '../../services/api';
import DataTable from '../ui/DataTable';

const BASE_CATEGORIES = [
  { id: 'CATEGORIE_NOMENCLATURE', nature: 'SYSTEM', label: 'Catégories de Nomenclature' }
];

const NomenclatureManagement = ({ showToast }) => {
  const [categories, setCategories] = useState(BASE_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState(BASE_CATEGORIES[0]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Search and Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Form state supporting all dynamic fields
  const [formData, setFormData] = useState({
    code: '',
    string1: '', // Libellé 1 / Label de la catégorie
    string2: '', // Libellé 2 / Nature pour CATEGORIE_NOMENCLATURE
    string3: '', // Libellé 3
    string4: '', // Libellé 4
    string5: '', // Libellé 5
    int1: 1,     // Statut (0=Désactivé, 1=Actif)
    int2: '',    // Montant 2 (int)
    int3: '',    // Montant 3 (int)
    int4: '',    // Montant 4 (int)
    int5: '',    // Montant 5 (int)
    rate1: '',   // Taux / Coeff 1 (decimal)
    rate2: '',   // Taux / Coeff 2 (decimal)
    rate3: '',   // Taux / Coeff 3 (decimal)
    rate4: '',   // Taux / Coeff 4 (decimal)
    rate5: '',   // Taux / Coeff 5 (decimal)
    date1: '',   // Date 1
    date2: '',   // Date 2
    date3: '',   // Date 3
    date4: '',   // Date 4
    date5: '',   // Date 5
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setSearchQuery('');
    setCurrentPage(0);
    loadNomenclatures();
  }, [activeCategory]);

  const loadCategories = async () => {
    try {
      const res = await nomenclatureService.search('CATEGORIE_NOMENCLATURE', 'SYSTEM');
      const dynamicCats = (res.data || []).map(item => ({
        id: item.code,
        nature: item.string2 || 'MEDICAL',
        label: item.string1,
      }));
      // Merge base category at top and then alphabetical dynamic categories
      const sortedDynamic = dynamicCats.sort((a, b) => a.label.localeCompare(b.label));
      setCategories([...BASE_CATEGORIES, ...sortedDynamic]);
    } catch (err) {
      console.error("Error loading categories list", err);
    }
  };

  const loadNomenclatures = async () => {
    setLoading(true);
    try {
      const res = await nomenclatureService.search(activeCategory.id, activeCategory.nature);
      setData(res.data || []);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.detail || err.response?.data?.message
        || "Erreur lors du chargement des nomenclatures.";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code || '',
        string1: item.string1 || '',
        string2: item.string2 || '',
        string3: item.string3 || '',
        string4: item.string4 || '',
        string5: item.string5 || '',
        int1: item.int1 !== undefined && item.int1 !== null ? item.int1 : 1,
        int2: item.int2 !== undefined && item.int2 !== null ? item.int2 : '',
        int3: item.int3 !== undefined && item.int3 !== null ? item.int3 : '',
        int4: item.int4 !== undefined && item.int4 !== null ? item.int4 : '',
        int5: item.int5 !== undefined && item.int5 !== null ? item.int5 : '',
        rate1: item.rate1 !== undefined && item.rate1 !== null ? item.rate1 : '',
        rate2: item.rate2 !== undefined && item.rate2 !== null ? item.rate2 : '',
        rate3: item.rate3 !== undefined && item.rate3 !== null ? item.rate3 : '',
        rate4: item.rate4 !== undefined && item.rate4 !== null ? item.rate4 : '',
        rate5: item.rate5 !== undefined && item.rate5 !== null ? item.rate5 : '',
        date1: item.date1 || '',
        date2: item.date2 || '',
        date3: item.date3 || '',
        date4: item.date4 || '',
        date5: item.date5 || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        code: '',
        string1: '',
        string2: activeCategory.id === 'CATEGORIE_NOMENCLATURE' ? 'MEDICAL' : '',
        string3: '',
        string4: '',
        string5: '',
        int1: 1,
        int2: '',
        int3: '',
        int4: '',
        int5: '',
        rate1: '',
        rate2: '',
        rate3: '',
        rate4: '',
        rate5: '',
        date1: '',
        date2: '',
        date3: '',
        date4: '',
        date5: '',
      });
    }
    setActiveTab('general');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Map empty inputs to null for persistence cleaness
      const payload = {
        ...formData,
        type: activeCategory.id,
        nature: activeCategory.nature,
        int2: formData.int2 !== '' ? parseInt(formData.int2) : null,
        int3: formData.int3 !== '' ? parseInt(formData.int3) : null,
        int4: formData.int4 !== '' ? parseInt(formData.int4) : null,
        int5: formData.int5 !== '' ? parseInt(formData.int5) : null,
        rate1: formData.rate1 !== '' ? parseFloat(formData.rate1) : null,
        rate2: formData.rate2 !== '' ? parseFloat(formData.rate2) : null,
        rate3: formData.rate3 !== '' ? parseFloat(formData.rate3) : null,
        rate4: formData.rate4 !== '' ? parseFloat(formData.rate4) : null,
        rate5: formData.rate5 !== '' ? parseFloat(formData.rate5) : null,
        date1: formData.date1 || null,
        date2: formData.date2 || null,
        date3: formData.date3 || null,
        date4: formData.date4 || null,
        date5: formData.date5 || null,
      };

      if (editingItem) {
        await nomenclatureService.update(editingItem.id, payload);
        showToast("Nomenclature mise à jour avec succès.");
      } else {
        await nomenclatureService.create(payload);
        showToast("Nomenclature créée avec succès.");
      }
      setIsModalOpen(false);

      // If we just edited or created a category, reload categories dropdown
      if (activeCategory.id === 'CATEGORIE_NOMENCLATURE') {
        await loadCategories();
      }

      loadNomenclatures();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Supprimer la nomenclature "${item.string1}" ?`)) {
      setLoading(true);
      try {
        await nomenclatureService.delete(item.id);
        showToast("Nomenclature supprimée.");
        
        // If we deleted a category, reload categories dropdown
        if (activeCategory.id === 'CATEGORIE_NOMENCLATURE') {
          await loadCategories();
        }
        
        loadNomenclatures();
      } catch (err) {
        console.error(err);
        showToast("Erreur lors de la suppression.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  // Instant reactive filtering
  const filteredData = data.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (item.code || '').toLowerCase().includes(query) ||
      (item.string1 || '').toLowerCase().includes(query) ||
      (item.string2 || '').toLowerCase().includes(query) ||
      (item.string3 || '').toLowerCase().includes(query) ||
      (item.string4 || '').toLowerCase().includes(query) ||
      (item.string5 || '').toLowerCase().includes(query)
    );
  });

  // Client-side pagination
  const paginatedData = filteredData.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Settings size={28} className="text-sky-600" /> Gestion des Nomenclatures
        </h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-sky-700 hover:bg-sky-800 text-white px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95"
        >
          <Plus size={18} /> Nouvelle Nomenclature
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="w-full max-w-md">
          <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2 tracking-widest">
            Catégorie de nomenclature
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-600" size={18} />
            <select
              value={activeCategory.id}
              onChange={e => {
                const cat = categories.find(c => c.id === e.target.value);
                setActiveCategory(cat);
              }}
              className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-sky-500 bg-slate-50 text-slate-800 appearance-none transition-all cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>
        </div>
        
        <div className="flex-1 flex justify-end items-center gap-2 text-slate-400 italic text-xs">
          <Info size={14} />
          Sélectionnez une catégorie pour gérer les éléments associés.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable
          title={activeCategory.label}
          columns={[
            { label: 'Code', key: 'code', render: (row) => <span className="font-mono text-[11px] text-sky-600 font-black">{row.code}</span> },
            { label: 'Description', key: 'string1', render: (row) => <span className="font-bold text-slate-700">{row.string1}</span> },
            // Conditionally show Target Nature only in CATEGORIE_NOMENCLATURE view
            ...(activeCategory.id === 'CATEGORIE_NOMENCLATURE' ? [
              { label: 'Nature Cible', key: 'string2', render: (row) => (
                <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                  {row.string2}
                </span>
              )}
            ] : []),
            { label: 'Statut', key: 'int1', render: (row) => (
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${row.int1 === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {row.int1 === 1 ? 'Actif' : 'Désactivé'}
              </span>
            )},
          ]}
          data={paginatedData}
          loading={loading}
          onSearch={(query) => {
            setSearchQuery(query);
            setCurrentPage(0);
          }}
          pagination={{
            currentPage,
            totalPages: Math.ceil(filteredData.length / pageSize),
            totalElements: filteredData.length,
            pageSize,
            onPageChange: (page) => setCurrentPage(page),
            onPageSizeChange: (size) => {
              setPageSize(size);
              setCurrentPage(0);
            }
          }}
          onEdit={(item) => handleOpenModal(item)}
          onDelete={(item) => handleDelete(item)}
          searchPlaceholder="Rechercher une nomenclature (code, libellé)..."
          entryLabel="nomenclatures"
        />
      </div>

      {/* Modal Form - Beautifully Tabs-based max-w-2xl */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Tag size={18} className="text-sky-600" />
                {editingItem ? 'Modifier Nomenclature' : 'Nouvelle Nomenclature'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Target Category Header */}
            <div className="px-6 py-4 bg-sky-50/50 border-b border-sky-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-sky-600 font-black uppercase tracking-widest block mb-0.5">Catégorie cible</span>
                <span className="text-sm font-black text-sky-900 uppercase tracking-tight">{activeCategory.label}</span>
              </div>
              <span className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-[10px] font-black uppercase tracking-wider">{activeCategory.nature}</span>
            </div>

            {/* Tabs Selector Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 overflow-x-auto">
              {[
                { id: 'general', label: 'Général', icon: Tag },
                { id: 'labels', label: 'Libellés (2-5)', icon: AlignLeft },
                { id: 'amounts', label: 'Montants (2-5)', icon: DollarSign },
                { id: 'rates', label: 'Taux / Coeff', icon: Percent },
                { id: 'dates', label: 'Dates', icon: Calendar },
              ].map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3.5 px-4 text-[10px] font-black uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <IconComponent size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-6">
              {/* Tab: General */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-widest">
                        {activeCategory.id === 'CATEGORIE_NOMENCLATURE' ? 'Code Catégorie *' : "Code d'accès *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                        placeholder="EX: MED_GEN"
                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-widest">État d'activation *</label>
                      <select
                        value={formData.int1}
                        onChange={e => setFormData({...formData, int1: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                      >
                        <option value={1}>Activé</option>
                        <option value={0}>Désactivé</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-widest">
                      {activeCategory.id === 'CATEGORIE_NOMENCLATURE' ? 'Nom de la Catégorie *' : 'Description (Libellé 1) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.string1}
                      onChange={e => setFormData({...formData, string1: e.target.value})}
                      placeholder="Description complète"
                      className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                    />
                  </div>

                  {/* Special display for Dynamic Category Creation */}
                  {activeCategory.id === 'CATEGORIE_NOMENCLATURE' && (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2 tracking-widest">Nature des données de la Catégorie *</label>
                      <select
                        value={formData.string2}
                        onChange={e => setFormData({...formData, string2: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-sky-500 bg-white text-slate-800"
                        required
                      >
                        <option value="" disabled>-- Choisir la nature --</option>
                        <option value="MEDICAL">MEDICAL (Pour spécialités, actes, labo...)</option>
                        <option value="FINANCES">FINANCES (Pour banques, caisses, tarifs...)</option>
                        <option value="RH">RH (Pour types d'employés, profils...)</option>
                        <option value="LABORATOIRE">LABORATOIRE (Pour sections, modules...)</option>
                        <option value="SYSTEM">SYSTEM (Usage interne)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Labels (string2 to string5) */}
              {activeTab === 'labels' && (
                <div className="grid grid-cols-2 gap-4">
                  {[2, 3, 4, 5].map(idx => {
                    // Skip string2 if in CATEGORIE_NOMENCLATURE view because it is mapped on the General tab
                    if (activeCategory.id === 'CATEGORIE_NOMENCLATURE' && idx === 2) return null;
                    return (
                      <div key={idx}>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-widest">Libellé {idx}</label>
                        <input
                          type="text"
                          value={formData[`string${idx}`]}
                          onChange={e => setFormData({...formData, [`string${idx}`]: e.target.value})}
                          placeholder={`Libellé alternatif ${idx}`}
                          className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: Amounts (int2 to int5) */}
              {activeTab === 'amounts' && (
                <div className="grid grid-cols-2 gap-4">
                  {[2, 3, 4, 5].map(idx => (
                    <div key={idx}>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-widest">Montant {idx}</label>
                      <input
                        type="number"
                        value={formData[`int${idx}`]}
                        onChange={e => setFormData({...formData, [`int${idx}`]: e.target.value})}
                        placeholder="EX: 15000"
                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Rates (rate1 to rate5) */}
              {activeTab === 'rates' && (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5].map(idx => (
                    <div key={idx}>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-widest">Taux / Coeff {idx}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData[`rate${idx}`]}
                        onChange={e => setFormData({...formData, [`rate${idx}`]: e.target.value})}
                        placeholder="EX: 1.25"
                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: Dates (date1 to date5) */}
              {activeTab === 'dates' && (
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5].map(idx => (
                    <div key={idx}>
                      <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 tracking-widest">Date {idx}</label>
                      <input
                        type="date"
                        value={formData[`date${idx}`]}
                        onChange={e => setFormData({...formData, [`date${idx}`]: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-500 transition-all bg-slate-50 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Form Footer Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 border-2 border-slate-100 rounded-xl text-[11px] font-black uppercase text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-2 px-8 py-3 bg-sky-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-sky-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
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

export default NomenclatureManagement;
