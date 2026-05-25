import React, { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle, RefreshCw, X, ShieldAlert, Calendar, CheckSquare, Plus, Info, Lock } from 'lucide-react';
import { clinicApi } from '../../services/api';
import { packagesStore } from '../../services/packagesStore';

const ClinicsList = () => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(0);

  // Validation Modal state
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [validationPlan, setValidationPlan] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [reprovisioningId, setReprovisioningId] = useState(null);

  // Clinic Creation Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState(null);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Burkina Faso',
    planName: 'Plan Standard',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
    autoValidate: true
  });

  const packages = packagesStore.getPackages().filter(p => p.status === 'ACTIVE');

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMessage(null);
    try {
      // 1. Enregistrer la clinique
      const clinic = await clinicApi.registerClinic({
        name: createFormData.name,
        code: createFormData.code.toUpperCase(),
        phone: createFormData.phone,
        email: createFormData.email,
        address: createFormData.address,
        city: createFormData.city,
        country: createFormData.country,
        planName: createFormData.planName,
        adminUsername: createFormData.adminUsername,
        adminEmail: createFormData.adminEmail,
        adminPassword: createFormData.adminPassword,
        adminFirstName: createFormData.adminFirstName,
        adminLastName: createFormData.adminLastName
      });

      // 2. Si autoValidate est activé, valider immédiatement la souscription
      if (createFormData.autoValidate && clinic && clinic.id) {
        const oneYearLater = new Date();
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

        await clinicApi.validateSubscription(clinic.id, {
          planName: createFormData.planName,
          startDate: new Date().toISOString().split('T')[0],
          endDate: oneYearLater.toISOString().split('T')[0]
        });

        setCreateMessage({ type: 'success', text: `Clinique "${createFormData.name}" créée, activée et provisionnée (actes + nomenclatures) !` });
      } else {
        setCreateMessage({ type: 'success', text: `Clinique "${createFormData.name}" créée avec succès (en attente d'activation).` });
      }

      // Reset form and reload
      setTimeout(() => {
        setShowCreateModal(false);
        setCreateFormData({
          name: '',
          code: '',
          phone: '',
          email: '',
          address: '',
          city: '',
          country: 'Burkina Faso',
          planName: 'Plan Standard',
          adminUsername: '',
          adminEmail: '',
          adminPassword: '',
          adminFirstName: '',
          adminLastName: '',
          autoValidate: true
        });
        loadClinics();
      }, 2000);

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message
        || (err.response?.status === 403 ? "Accès refusé : connectez-vous avec un compte SUPER_ADMIN (admin_saas)." : null)
        || err.message
        || "Une erreur est survenue lors de la création de la clinique.";
      setCreateMessage({ type: 'danger', text: msg });
    } finally {
      setCreating(false);
    }
  };

  const loadClinics = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await clinicApi.getAllClinics();
      setClinics(data);
    } catch (err) {
      console.error("Erreur de récupération des cliniques", err);
      setClinics([]);
      setLoadError(err.response?.data?.message || "Impossible de joindre le gateway / clinic-service. Vérifiez que les microservices sont démarrés.");
    } finally {
      setLoading(false);
    }
  };

  const handleReprovision = async (clinic, force = false) => {
    if (!window.confirm(
      force
        ? `Réinitialiser et re-créer toutes les données de base pour "${clinic.name}" ? Les référentiels existants seront remplacés.`
        : `Compléter les données de base manquantes pour "${clinic.name}" ?`
    )) {
      return;
    }
    setReprovisioningId(clinic.id);
    try {
      await clinicApi.reprovisionClinic(clinic.id, force);
      await loadClinics();
      alert(`Données de base provisionnées avec succès pour "${clinic.name}".`);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Échec du re-provisionnement.');
    } finally {
      setReprovisioningId(null);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  // Filter clinics dynamically based on Search and Status Filter
  const filteredClinics = clinics.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination bounds calculations
  const totalItems = filteredClinics.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = currentPage * pageSize;
  const paginatedClinics = filteredClinics.slice(startIdx, startIdx + pageSize);

  const handlePageChange = (pageNum) => {
    if (pageNum >= 0 && pageNum < totalPages) {
      setCurrentPage(pageNum);
    }
  };

  const handleOpenValidate = (clinic) => {
    setSelectedClinic(clinic);
    setValidationPlan(clinic.subscription?.planName || 'Plan Standard');
    setStartDate(new Date().toISOString().split('T')[0]);
    // Default end date is 1 year from now
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    setEndDate(oneYearLater.toISOString().split('T')[0]);
    setMessage(null);
  };

  const handleValidateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        planName: validationPlan,
        startDate: startDate,
        endDate: endDate
      };

      // Perform HTTP POST to validate the clinic subscription
      await clinicApi.validateSubscription(selectedClinic.id, payload);

      setMessage({ type: 'success', text: `La clinique "${selectedClinic.name}" a été activée avec actes et nomenclatures provisionnés. Le compte administrateur Keycloak est déverrouillé.` });

      // Refresh the table locally
      setTimeout(() => {
        setSelectedClinic(null);
        loadClinics();
      }, 2000);

    } catch (err) {
      console.error(err);
      const validateMsg = err.response?.data?.message
        || (err.response?.status === 403 ? "Accès refusé : le token doit inclure le rôle SUPER_ADMIN. Reconnectez-vous avec admin_saas." : null)
        || "Erreur lors de la validation (provisionnement actes/nomenclatures requis).";
      setMessage({ type: 'danger', text: validateMsg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and filter action bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une clinique (nom, code, email...)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-all text-slate-700"
          />
        </div>

        <div className="flex gap-3 items-center shrink-0">
          {/* Status filters */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            {['ALL', 'PENDING', 'ACTIVE'].map((status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setCurrentPage(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === status
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {status === 'ALL' ? 'Toutes' : status === 'PENDING' ? 'En attente' : 'Actives'}
              </button>
            ))}
          </div>

          <button
            onClick={loadClinics}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
            title="Rafraîchir"
          >
            <RefreshCw size={15} />
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/10 cursor-pointer shrink-0"
          >
            <Plus size={14} /> Créer une clinique
          </button>
        </div>
      </div>

      {/* Main Datatable Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Table PageSize Selector */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none"
            >
              {[5, 10, 25, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-xs font-semibold text-slate-400">lignes</span>
          </div>
          <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
            {totalItems} cliniques au total
          </span>
        </div>

        {/* Real Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">Clinique</th>
                <th className="py-4 px-6">Code</th>
                <th className="py-4 px-6">Contact / Ville</th>
                <th className="py-4 px-6">Forfait Souhaité</th>
                <th className="py-4 px-6">Statut Abonnement</th>
                <th className="py-4 px-6">Données base</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="animate-spin mx-auto mb-2 text-sky-500" size={24} />
                    Chargement des cliniques...
                  </td>
                </tr>
              ) : paginatedClinics.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    {loadError ? (
                      <span className="text-rose-600">{loadError}</span>
                    ) : (
                      'Aucune clinique trouvée.'
                    )}
                  </td>
                </tr>
              ) : (
                paginatedClinics.map((clinic) => (
                  <tr key={clinic.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6">
                      <p className="font-extrabold text-slate-800 text-sm leading-tight">{clinic.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Inscrit le : {new Date(clinic.createdAt || Date.now()).toLocaleDateString()}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                        {clinic.code}
                      </span>
                    </td>
                    <td className="py-4 px-6 space-y-0.5">
                      <p className="font-bold text-slate-700">{clinic.email}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{clinic.city}, {clinic.country}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg text-[11px]">
                        {clinic.subscription?.planName || 'Plan Standard'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${clinic.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${clinic.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {clinic.status === 'ACTIVE' ? 'Actif' : 'En attente'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {clinic.status === 'ACTIVE' ? (
                        clinic.dataProvisioned ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                            OK
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                            Incomplet
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col gap-1.5 items-center">
                        {clinic.status === 'PENDING' ? (
                          <button
                            onClick={() => handleOpenValidate(clinic)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-lg shadow-md shadow-sky-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle size={13} />
                            Valider
                          </button>
                        ) : (
                          <>
                            {!clinic.dataProvisioned && (
                              <button
                                onClick={() => handleReprovision(clinic, false)}
                                disabled={reprovisioningId === clinic.id}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw size={12} className={reprovisioningId === clinic.id ? 'animate-spin' : ''} />
                                Provisionner
                              </button>
                            )}
                            <button
                              onClick={() => handleReprovision(clinic, true)}
                              disabled={reprovisioningId === clinic.id}
                              title="Réinitialiser et recréer actes + nomenclatures"
                              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw size={12} />
                              Re-provisionner
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Datatable Pagination footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">
            Affichage de {totalItems === 0 ? 0 : startIdx + 1} à {Math.min(startIdx + pageSize, totalItems)} sur {totalItems} lignes
          </span>

          <div className="flex gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              Précédent
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => handlePageChange(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === i
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/10'
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1 || totalPages === 0}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      {/* Validation Dialog / Modal Backdrop */}
      {selectedClinic && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Validation d'Abonnement</h4>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider -mt-0.5">Clinique : {selectedClinic.name}</p>
              </div>
              <button
                onClick={() => setSelectedClinic(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content / Form */}
            <form onSubmit={handleValidateSubmit} className="p-6 space-y-6">
              {message && (
                <div className={`p-4 rounded-xl border text-xs font-bold flex gap-2.5 items-start ${message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>{message.text}</div>
                </div>
              )}

              <div className="space-y-4">
                {/* Forfait Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Forfait de Souscription</label>
                  <select
                    value={validationPlan}
                    onChange={(e) => setValidationPlan(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  >
                    {packages.map((pack) => (
                      <option key={pack.id} value={pack.name}>{pack.name} ({pack.price} €/mois)</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date Début */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                    />
                  </div>

                  {/* Date Fin */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedClinic(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Validation...' : 'Valider l\'abonnement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creation Dialog / Modal Backdrop */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <Plus size={18} className="text-sky-500" />
                  Nouvelle Clinique
                </h4>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider -mt-0.5">Enregistrer une souscription de clinique avec son compte superadmin.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Content / Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-6">
              {createMessage && (
                <div className={`p-4 rounded-xl border text-xs font-bold flex gap-2.5 items-start ${createMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <div>{createMessage.text}</div>
                </div>
              )}

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
                {/* 1. Informations de la Clinique */}
                <div className="space-y-4">
                  <h5 className="text-[11px] font-black text-sky-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <Info size={12} />
                    Informations de la Clinique
                  </h5>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Nom de la clinique *</label>
                      <input
                        type="text"
                        value={createFormData.name}
                        onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                        required
                        placeholder="Ex: Clinique Notre Dame"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Code unique *</label>
                      <input
                        type="text"
                        value={createFormData.code}
                        onChange={(e) => setCreateFormData({ ...createFormData, code: e.target.value })}
                        required
                        placeholder="Ex: CND (Lettres capitales)"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Email de contact *</label>
                      <input
                        type="email"
                        value={createFormData.email}
                        onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                        required
                        placeholder="Ex: contact@notredame.com"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Téléphone</label>
                      <input
                        type="text"
                        value={createFormData.phone}
                        onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                        placeholder="Ex: +226 25 30 00 00"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Pays</label>
                      <input
                        type="text"
                        value={createFormData.country}
                        onChange={(e) => setCreateFormData({ ...createFormData, country: e.target.value })}
                        placeholder="Ex: Burkina Faso"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Ville</label>
                      <input
                        type="text"
                        value={createFormData.city}
                        onChange={(e) => setCreateFormData({ ...createFormData, city: e.target.value })}
                        placeholder="Ex: Ouagadougou"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Adresse</label>
                      <input
                        type="text"
                        value={createFormData.address}
                        onChange={(e) => setCreateFormData({ ...createFormData, address: e.target.value })}
                        placeholder="Ex: Secteur 15, Ave de l'Europe"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Forfait d'Abonnement Souhaité</label>
                    <select
                      value={createFormData.planName}
                      onChange={(e) => setCreateFormData({ ...createFormData, planName: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                    >
                      {packages.map((pack) => (
                        <option key={pack.id} value={pack.name}>{pack.name} ({pack.price} €/mois)</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Administrateur Principal de la Clinique */}
                <div className="space-y-4 pt-2">
                  <h5 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <Lock size={12} />
                    Compte Administrateur Principal
                  </h5>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Nom de famille</label>
                      <input
                        type="text"
                        value={createFormData.adminLastName}
                        onChange={(e) => setCreateFormData({ ...createFormData, adminLastName: e.target.value })}
                        placeholder="Ex: Sawadogo"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Prénom</label>
                      <input
                        type="text"
                        value={createFormData.adminFirstName}
                        onChange={(e) => setCreateFormData({ ...createFormData, adminFirstName: e.target.value })}
                        placeholder="Ex: Jean"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Identifiant Administrateur *</label>
                      <input
                        type="text"
                        value={createFormData.adminUsername}
                        onChange={(e) => setCreateFormData({ ...createFormData, adminUsername: e.target.value })}
                        required
                        placeholder="Ex: admin_nd"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Email de l'Administrateur *</label>
                      <input
                        type="email"
                        value={createFormData.adminEmail}
                        onChange={(e) => setCreateFormData({ ...createFormData, adminEmail: e.target.value })}
                        required
                        placeholder="Ex: admin@notredame.com"
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Mot de passe de l'Administrateur *</label>
                    <input
                      type="password"
                      value={createFormData.adminPassword}
                      onChange={(e) => setCreateFormData({ ...createFormData, adminPassword: e.target.value })}
                      required
                      placeholder="Saisissez un mot de passe robuste"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                    />
                  </div>
                </div>

                {/* 3. Validation Option */}
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 bg-sky-50/50 hover:bg-sky-50 p-4 rounded-xl border border-sky-100 cursor-pointer select-none transition-all">
                    <input
                      type="checkbox"
                      checked={createFormData.autoValidate}
                      onChange={(e) => setCreateFormData({ ...createFormData, autoValidate: e.target.checked })}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                    />
                    <div>
                      <p className="text-xs font-black text-sky-950 uppercase tracking-tight">Valider et activer immédiatement l'abonnement</p>
                      <p className="text-[10px] text-sky-600 font-medium">Active l'accès de la clinique et déverrouille l'administrateur Keycloak dès sa création.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer la clinique'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicsList;
