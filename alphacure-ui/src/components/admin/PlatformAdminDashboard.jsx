import React, { useState, useEffect } from 'react';
import { 
  Building2, CheckCircle2, Shield, Calendar, X, 
  Loader2, BadgeDollarSign, MapPin, Mail, Phone, ExternalLink,
  Plus, ArrowRight, ArrowLeft, User, Lock, Sparkles
} from 'lucide-react';
import { clinicService } from '../../services/api';
import DataTable from '../ui/DataTable';

const PlatformAdminDashboard = ({ showToast }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Validation modal state
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationData, setValidationData] = useState({
    planName: 'BASIC',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
  });

  // Clinic Creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [createLoading, setCreateLoading] = useState(false);
  const [autoValidate, setAutoValidate] = useState(true);
  const [newClinicData, setNewClinicData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    country: 'Burkina Faso',
    city: 'Ouagadougou',
    planName: 'BASIC',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: ''
  });

  // Table pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const res = await clinicService.getAll();
      setClinics(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors du chargement des cliniques.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const openValidation = (clinic) => {
    setSelectedClinic(clinic);
    setValidationData({
      planName: clinic.planName || 'BASIC',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
    });
    setShowValidationModal(true);
  };

  const handleValidateSubscription = async () => {
    setValidationLoading(true);
    try {
      await clinicService.validate(selectedClinic.id, {
        planName: validationData.planName,
        startDate: validationData.startDate,
        endDate: validationData.endDate
      });
      showToast(`Abonnement de la clinique "${selectedClinic.name}" validé avec succès!`);
      setShowValidationModal(false);
      loadClinics();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Erreur lors de la validation de la souscription.", "error");
    } finally {
      setValidationLoading(false);
    }
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slugCode = name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "_")
      .slice(0, 30);
    
    setNewClinicData(prev => ({
      ...prev,
      name: name,
      code: slugCode
    }));
  };

  const handleCreateClinicSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      // 1. Register the clinic
      const res = await clinicService.register(newClinicData);
      const createdClinic = res.data;
      
      showToast(`Clinique "${newClinicData.name}" enregistrée avec succès!`);

      // 2. Validate subscription automatically if enabled
      if (autoValidate && createdClinic && createdClinic.id) {
        await clinicService.validate(createdClinic.id, {
          planName: newClinicData.planName,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
        });
        showToast("Souscription validée et compte administrateur activé avec succès!");
      }
      
      setShowCreateModal(false);
      loadClinics();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Une erreur s'est produite lors de la création de la clinique.", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = clinics.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  const paginatedData = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const plansList = [
    { id: 'BASIC', label: 'BASIC - 50 000 FCFA / mois' },
    { id: 'PREMIUM', label: 'PREMIUM - 120 000 FCFA / mois' },
    { id: 'ENTERPRISE', label: 'ENTERPRISE - Sur mesure' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Premium Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <Shield className="text-sky-400" size={24} /> Mission Control : Administration SaaS
          </h2>
          <p className="text-xs text-sky-200/80 mt-1 font-medium">
            Validez les inscriptions de cliniques, gérez les abonnements SaaS et supervisez les tenants.
          </p>
        </div>
        <button
          onClick={() => {
            setNewClinicData({
              name: '',
              code: '',
              phone: '',
              email: '',
              address: '',
              country: 'Burkina Faso',
              city: 'Ouagadougou',
              planName: 'BASIC',
              adminUsername: '',
              adminEmail: '',
              adminPassword: '',
              adminFirstName: '',
              adminLastName: ''
            });
            setCreateStep(1);
            setAutoValidate(true);
            setShowCreateModal(true);
          }}
          className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-500/20 cursor-pointer self-start md:self-auto transition-all"
        >
          <Plus size={16} /> Enregistrer une clinique
        </button>
      </div>

      {/* Analytics widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cliniques Enregistrées</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{clinics.length}</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600"><Building2 size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Inscriptions en Attente</div>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {clinics.filter(c => c.status === 'PENDING').length}
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Loader2 className="animate-spin" size={20} /></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Cliniques Actives</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {clinics.filter(c => c.status === 'ACTIVE').length}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 size={20} /></div>
        </div>
      </div>

      {/* Modern Data Table */}
      <DataTable
        columns={[
          {
            label: "Clinique & Code",
            key: "name",
            render: (row) => (
              <div>
                <div className="font-bold text-slate-800">{row.name}</div>
                <div className="font-mono text-[9px] text-slate-400 font-black mt-0.5">{row.code}</div>
              </div>
            )
          },
          {
            label: "Coordonnées de Contact",
            key: "email",
            render: (row) => (
              <div className="space-y-1 text-slate-600 text-xs">
                {row.email && <div className="flex items-center gap-1"><Mail size={12} className="text-slate-400" /> {row.email}</div>}
                {row.phone && <div className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {row.phone}</div>}
              </div>
            )
          },
          {
            label: "Localisation",
            key: "city",
            render: (row) => (
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <MapPin size={12} className="text-slate-400" /> {row.city || '---'}, {row.country || '---'}
              </div>
            )
          },
          {
            label: "Offre Choisie",
            key: "planName",
            render: (row) => (
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${row.planName === 'ENTERPRISE' ? 'bg-purple-50 text-purple-700 border-purple-200' : row.planName === 'PREMIUM' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                {row.planName}
              </span>
            )
          },
          {
            label: "Statut",
            key: "status",
            render: (row) => (
              row.status === 'ACTIVE' ? (
                <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full inline-flex items-center gap-1">
                  ✓ Active
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 rounded-full inline-flex items-center gap-1 animate-pulse">
                  ⧗ En attente
                </span>
              )
            )
          },
          {
            label: "Actions",
            key: "id",
            render: (row) => (
              row.status === 'PENDING' ? (
                <button
                  onClick={() => openValidation(row)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                >
                  Valider Souscription
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Déjà active</span>
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
        searchPlaceholder="Rechercher une clinique (nom, code, email, ville...)"
        entryLabel="cliniques"
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

      {/* Subscription Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 px-6 flex justify-between items-center text-white">
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-widest flex items-center gap-2">
                  <BadgeDollarSign className="text-sky-400" size={16} /> Activer la souscription
                </h3>
                <p className="text-[9px] text-sky-200/80 mt-0.5 font-medium">Clinique : {selectedClinic?.name}</p>
              </div>
              <button onClick={() => setShowValidationModal(false)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Plan d'Abonnement *</label>
                <select
                  value={validationData.planName}
                  onChange={e => setValidationData({ ...validationData, planName: e.target.value })}
                  className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500 bg-white"
                >
                  <option value="BASIC">BASIC - 50 000 FCFA / mois</option>
                  <option value="PREMIUM">PREMIUM - 120 000 FCFA / mois</option>
                  <option value="ENTERPRISE">ENTERPRISE - Sur mesure</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Date de début *</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={validationData.startDate}
                      onChange={e => setValidationData({ ...validationData, startDate: e.target.value })}
                      className="w-full border border-slate-200 rounded pl-8 pr-2.5 py-2 text-xs font-bold outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Date d'expiration *</label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                    <input
                      type="date"
                      value={validationData.endDate}
                      onChange={e => setValidationData({ ...validationData, endDate: e.target.value })}
                      className="w-full border border-slate-200 rounded pl-8 pr-2.5 py-2 text-xs font-bold outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowValidationModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleValidateSubscription}
                  disabled={validationLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-40"
                >
                  {validationLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Activation...
                    </>
                  ) : (
                    <>
                      Confirmer l'abonnement
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Superadmin Clinic Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 px-6 flex justify-between items-center text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Building2 className="text-sky-400" size={18} /> Enregistrer une nouvelle clinique
                </h3>
                <p className="text-[10px] text-sky-200/80 mt-0.5 font-medium">Étape {createStep} sur 3 — Saisie direct super-administrateur</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-white/60 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            {/* Stepper indicators */}
            <div className="bg-slate-50 border-b border-slate-100 py-3 px-6 flex justify-between items-center text-xs font-bold text-slate-400">
              <div className={`flex items-center gap-2 ${createStep >= 1 ? 'text-indigo-600' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${createStep >= 1 ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200'}`}>1</span>
                Établissement
              </div>
              <div className={`flex items-center gap-2 ${createStep >= 2 ? 'text-indigo-600' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${createStep >= 2 ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200'}`}>2</span>
                Forfait & Validation
              </div>
              <div className={`flex items-center gap-2 ${createStep >= 3 ? 'text-indigo-600' : ''}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${createStep >= 3 ? 'bg-indigo-50 border-indigo-200' : 'border-slate-200'}`}>3</span>
                Identifiants Administrateur
              </div>
            </div>

            <form onSubmit={handleCreateClinicSubmit} className="p-6 space-y-4">
              
              {/* STEP 1: Clinic Info */}
              {createStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nom de la clinique *</label>
                      <input 
                        type="text" 
                        required
                        value={newClinicData.name} 
                        onChange={handleNameChange}
                        placeholder="Ex: Clinique Polysud" 
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Code Unique * (Généré automatiquement)</label>
                      <input 
                        type="text" 
                        required
                        readOnly
                        value={newClinicData.code} 
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-bold text-slate-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Adresse Email de contact *</label>
                      <input 
                        type="email" 
                        required
                        value={newClinicData.email} 
                        onChange={e => setNewClinicData({...newClinicData, email: e.target.value})}
                        placeholder="Ex: contact@polysud.com" 
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Téléphone</label>
                      <input 
                        type="text" 
                        value={newClinicData.phone} 
                        onChange={e => setNewClinicData({...newClinicData, phone: e.target.value})}
                        placeholder="Ex: +226 25 30 00 00" 
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Adresse physique</label>
                    <input 
                      type="text" 
                      value={newClinicData.address} 
                      onChange={e => setNewClinicData({...newClinicData, address: e.target.value})}
                      placeholder="Ex: Rue de la Chance, Ouagadougou" 
                      className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Pays</label>
                      <input 
                        type="text" 
                        value={newClinicData.country} 
                        onChange={e => setNewClinicData({...newClinicData, country: e.target.value})}
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Ville</label>
                      <input 
                        type="text" 
                        value={newClinicData.city} 
                        onChange={e => setNewClinicData({...newClinicData, city: e.target.value})}
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      disabled={!newClinicData.name || !newClinicData.email}
                      onClick={() => setCreateStep(2)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Suivant : Choix du forfait <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Forfait & Auto-Validation */}
              {createStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Forfait Choisi</label>
                    <select
                      value={newClinicData.planName}
                      onChange={e => setNewClinicData({ ...newClinicData, planName: e.target.value })}
                      className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500 bg-white"
                    >
                      <option value="BASIC">BASIC - 50 000 FCFA / mois</option>
                      <option value="PREMIUM">PREMIUM - 120 000 FCFA / mois</option>
                      <option value="ENTERPRISE">ENTERPRISE - Sur mesure</option>
                    </select>
                  </div>

                  {/* Auto-validation Toggle Widget */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="autoValidateCheckbox"
                      checked={autoValidate}
                      onChange={e => setAutoValidate(e.target.checked)}
                      className="mt-1 cursor-pointer w-4 h-4 rounded text-indigo-600 border-indigo-200 focus:ring-indigo-500"
                    />
                    <label htmlFor="autoValidateCheckbox" className="cursor-pointer select-none">
                      <span className="text-xs font-black text-indigo-950 uppercase tracking-tight block">Valider et activer immédiatement</span>
                      <span className="text-[10px] text-indigo-700/80 leading-relaxed block mt-0.5">
                        Si coché, l'abonnement sera activé automatiquement à la validation de la clinique, et le compte de l'administrateur sera immédiatement opérationnel.
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setCreateStep(1)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-6 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} /> Retour
                    </button>
                    <button 
                      type="button"
                      onClick={() => setCreateStep(3)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                    >
                      Suivant : Admin Accès <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Admin User configuration */}
              {createStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Prénom de l'administrateur</label>
                      <input 
                        type="text" 
                        value={newClinicData.adminFirstName} 
                        onChange={e => setNewClinicData({...newClinicData, adminFirstName: e.target.value})}
                        placeholder="Ex: Caroline" 
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Nom de l'administrateur</label>
                      <input 
                        type="text" 
                        value={newClinicData.adminLastName} 
                        onChange={e => setNewClinicData({...newClinicData, adminLastName: e.target.value})}
                        placeholder="Ex: HIEN" 
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Username Admin *</label>
                      <input 
                        type="text" 
                        required
                        value={newClinicData.adminUsername} 
                        onChange={e => setNewClinicData({...newClinicData, adminUsername: e.target.value})}
                        placeholder="Ex: admin_polysud" 
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Email personnel de l'admin *</label>
                      <input 
                        type="email" 
                        required
                        value={newClinicData.adminEmail} 
                        onChange={e => setNewClinicData({...newClinicData, adminEmail: e.target.value})}
                        placeholder="Ex: admin@polysud.com" 
                        className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-500 font-bold uppercase block mb-1">Mot de passe provisoire *</label>
                    <input 
                      type="password" 
                      required
                      value={newClinicData.adminPassword} 
                      onChange={e => setNewClinicData({...newClinicData, adminPassword: e.target.value})}
                      placeholder="Définir un mot de passe solide" 
                      className="w-full border border-slate-200 rounded p-2.5 text-xs font-bold outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button 
                      type="button"
                      onClick={() => setCreateStep(2)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-6 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} /> Retour
                    </button>
                    <button 
                      type="submit"
                      disabled={createLoading || !newClinicData.adminUsername || !newClinicData.adminEmail || !newClinicData.adminPassword}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-8 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer disabled:opacity-40 min-w-[180px]"
                    >
                      {createLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Enregistrement...
                        </>
                      ) : (
                        <>
                          Créer la clinique
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformAdminDashboard;
