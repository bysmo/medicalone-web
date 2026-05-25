import React, { useState, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Search, Save, X, Loader2,
  Shield, CheckCircle, MapPin
} from 'lucide-react';
import { insuranceService } from '../../services/api';
import DataTable from '../ui/DataTable';

const InsurersManagement = ({ showToast }) => {
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState({
    name: '',
    type: 'NATIONAL'
  });

  const loadInsurers = async () => {
    setLoading(true);
    try {
      const res = await insuranceService.getAll();
      setInsurers(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du chargement des assureurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsurers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      name: '',
      type: 'NATIONAL'
    });
    setShowForm(true);
  };

  const openEdit = (ins) => {
    setEditing(ins);
    setFormData({
      name: ins.name,
      type: ins.type || 'NATIONAL'
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      showToast('Le nom de l\'assureur est obligatoire', 'error');
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type
    };

    try {
      if (editing) {
        await insuranceService.update(editing.id, { ...editing, ...payload });
        showToast('Assureur modifié avec succès');
      } else {
        await insuranceService.create(payload);
        showToast('Assureur créé avec succès');
      }
      setShowForm(false);
      loadInsurers();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleDelete = async (ins) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer l'assureur "${ins.name}" ?`)) return;
    try {
      await insuranceService.delete(ins.id);
      showToast('Assureur supprimé avec succès');
      loadInsurers();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const filtered = insurers.filter(ins =>
    ins.name.toLowerCase().includes(search.toLowerCase()) ||
    ins.type.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-800 to-indigo-900 p-6 rounded-2xl shadow-lg text-white">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <Shield className="text-sky-300" size={24} /> Gestion des Assureurs
          </h2>
          <p className="text-xs text-sky-200/80 mt-1 font-medium">
            Configurez et gérez les compagnies d'assurance partenaires de la clinique.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-white hover:bg-sky-50 text-sky-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow transition-all self-start md:self-auto"
        >
          <Plus size={16} /> Nouvel Assureur
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Assureurs</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{insurers.length}</div>
          </div>
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600"><Shield size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Partenaires en cours</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{insurers.length > 0 ? "Conventionné" : "Aucun"}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle size={20} /></div>
        </div>
      </div>

      {/* Modern Data Table */}
      <DataTable
        columns={[
          {
            label: "Nom de l'assureur",
            key: "name",
            render: (row) => <span className="font-bold text-slate-800">{row.name}</span>
          },
          {
            label: "Type / Portée",
            key: "type",
            render: (row) => (
              row.type === 'INTERNATIONAL' ? (
                <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 rounded-full">
                  Internationale
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                  Nationale
                </span>
              )
            )
          }
        ]}
        data={paginatedData}
        loading={loading}
        onSearch={(query) => {
          setSearch(query);
          setCurrentPage(0);
        }}
        searchPlaceholder="Rechercher un assureur (nom, type...)"
        entryLabel="assureurs"
        onEdit={(row) => openEdit(row)}
        onDelete={(row) => handleDelete(row)}
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

      {/* Creation / Edition Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-sky-800 to-indigo-900 p-4 px-6 flex justify-between items-center text-white">
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-widest">
                  {editing ? 'Modifier Assureur' : 'Nouvel Assureur'}
                </h3>
                <p className="text-[9px] text-sky-200/80 mt-0.5 font-medium">Saisissez les informations de l'assureur.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nom Complet de l'Assureur *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: SUNU Assurances"
                  className="w-full border border-slate-200 rounded p-2 text-xs font-bold outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Type de Portée / Couverture *</label>
                <select
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2 text-xs font-bold outline-none focus:border-sky-500 bg-white"
                >
                  <option value="NATIONAL">Assurance Nationale (Tarifs Assuré National)</option>
                  <option value="INTERNATIONAL">Assurance Internationale (Tarifs Assuré International)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <Save size={14} /> Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsurersManagement;
