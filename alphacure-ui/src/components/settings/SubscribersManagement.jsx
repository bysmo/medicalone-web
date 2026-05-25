import React, { useState, useEffect } from 'react';
import {
  Plus, Edit3, Trash2, Search, Save, X, Loader2,
  Building, Mail, Phone, MapPin, CheckCircle
} from 'lucide-react';
import { nomenclatureService } from '../../services/api';
import DataTable from '../ui/DataTable';

const SubscribersManagement = ({ showToast }) => {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const res = await nomenclatureService.search('SOUSCRIPTEUR', 'FINANCES');
      setSubscribers(res.data || []);
    } catch (err) {
      console.error(err);
      showToast('Erreur lors du chargement des souscripteurs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData({
      code: '',
      name: '',
      email: '',
      phone: '',
      address: ''
    });
    setShowForm(true);
  };

  const openEdit = (sub) => {
    setEditing(sub);
    setFormData({
      code: sub.code,
      name: sub.string1,
      email: sub.string2 || '',
      phone: sub.string3 || '',
      address: sub.string4 || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      showToast('Le code et le nom sont obligatoires', 'error');
      return;
    }

    const payload = {
      type: 'SOUSCRIPTEUR',
      nature: 'FINANCES',
      code: formData.code.toUpperCase().replace(/\s+/g, '_'),
      string1: formData.name,
      string2: formData.email,
      string3: formData.phone,
      string4: formData.address,
      int1: 1 // active
    };

    try {
      if (editing) {
        await nomenclatureService.update(editing.id, { ...editing, ...payload });
        showToast('Souscripteur modifié avec succès');
      } else {
        await nomenclatureService.create(payload);
        showToast('Souscripteur créé avec succès');
      }
      setShowForm(false);
      loadSubscribers();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement", 'error');
    }
  };

  const handleDelete = async (sub) => {
    if (!window.confirm(`Voulez-vous vraiment désactiver le souscripteur "${sub.string1}" ?`)) return;
    try {
      await nomenclatureService.delete(sub.id);
      showToast('Souscripteur supprimé avec succès');
      loadSubscribers();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const filtered = subscribers.filter(sub =>
    sub.string1.toLowerCase().includes(search.toLowerCase()) ||
    sub.code.toLowerCase().includes(search.toLowerCase()) ||
    (sub.string2 || '').toLowerCase().includes(search.toLowerCase())
  );

  const paginatedData = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const activeCount = subscribers.filter(sub => (sub.int1 !== 0)).length;

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-900 p-6 rounded-2xl shadow-lg text-white">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <Building className="text-emerald-300" size={24} /> Gestion des Souscripteurs
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1 font-medium">
            Configurez et gérez les entreprises et organismes souscripteurs de contrats d'assurance.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-white hover:bg-emerald-50 text-emerald-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow transition-all self-start md:self-auto"
        >
          <Plus size={16} /> Nouveau Souscripteur
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Souscripteurs</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{subscribers.length}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><Building size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Souscripteurs Actifs</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Type d'entités</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{subscribers.length > 0 ? "Entreprises" : "Aucun"}</div>
          </div>
          <div className="p-3 bg-teal-50 rounded-lg text-teal-600"><MapPin size={20} /></div>
        </div>
      </div>

      {/* Modern Data Table */}
      <DataTable
        columns={[
          {
            label: "Code",
            key: "code",
            render: (row) => <span className="font-mono font-bold text-emerald-700">{row.code}</span>
          },
          {
            label: "Nom de l'organisme",
            key: "string1",
            render: (row) => <span className="font-bold text-slate-800">{row.string1}</span>
          },
          {
            label: "E-mail de contact",
            key: "string2",
            render: (row) => (
              row.string2 ? (
                <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {row.string2}</span>
              ) : (
                <span className="text-slate-300 italic">Non renseigné</span>
              )
            )
          },
          {
            label: "Téléphone",
            key: "string3",
            render: (row) => (
              row.string3 ? (
                <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {row.string3}</span>
              ) : (
                <span className="text-slate-300 italic">Non renseigné</span>
              )
            )
          },
          {
            label: "Adresse",
            key: "string4",
            render: (row) => (
              row.string4 ? (
                <span className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {row.string4}</span>
              ) : (
                <span className="text-slate-300 italic">Non renseigné</span>
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
        searchPlaceholder="Rechercher un souscripteur (code, nom, e-mail...)"
        entryLabel="souscripteurs"
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
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-4 px-6 flex justify-between items-center text-white">
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-widest">
                  {editing ? 'Modifier Souscripteur' : 'Nouveau Souscripteur'}
                </h3>
                <p className="text-[9px] text-emerald-200/80 mt-0.5 font-medium">Saisissez les informations du souscripteur.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Code Souscripteur *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: ONATEL, ORANGE_BF"
                  disabled={!!editing}
                  className="w-full border border-slate-200 rounded p-2 text-xs font-mono font-bold outline-none focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nom Complet du Souscripteur *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: ONATEL SA"
                  className="w-full border border-slate-200 rounded p-2 text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">E-mail de Contact</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@entreprise.com"
                  className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Téléphone de Contact</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+226 25 XX XX XX"
                  className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Adresse Géographique</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Zone Industrielle de Kossodo, Ouagadougou"
                  rows={2}
                  className="w-full border border-slate-200 rounded p-2 text-xs outline-none focus:border-emerald-500"
                />
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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 shadow-sm transition-colors"
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

export default SubscribersManagement;
