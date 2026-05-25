import React, { useState, useEffect } from 'react';
import { Search, CreditCard, Plus, DollarSign, X, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { paymentsStore } from '../../services/paymentsStore';
import { clinicApi } from '../../services/api';
import { packagesStore } from '../../services/packagesStore';

const PaymentsList = () => {
  const [payments, setPayments] = useState(() => paymentsStore.getPayments());
  const [clinics, setClinics] = useState([]);
  
  // Datatable states
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(0);

  // Manual payment modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedPlanName, setSelectedPlanName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const packages = packagesStore.getPackages().filter(p => p.status === 'ACTIVE');

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const data = await clinicApi.getAllClinics();
        setClinics(data.filter(c => c.status === 'ACTIVE'));
      } catch (err) {
        // Mock fallback
        setClinics([
          { id: 'clinic-1', name: 'Clinique Saint-François', subscription: { planName: 'Plan Professionnel' } },
          { id: 'clinic-2', name: 'Clinique du Soleil', subscription: { planName: 'Plan Standard' } },
          { id: 'clinic-3', name: 'Hôpital Privé de l\'Est', subscription: { planName: 'Plan Entreprise' } }
        ]);
      }
    };
    fetchClinics();
  }, []);

  const reload = () => {
    setPayments(paymentsStore.getPayments());
  };

  const handleOpenLog = () => {
    if (clinics.length === 0) {
      alert("Aucune clinique active n'est enregistrée pour le moment.");
      return;
    }
    setSelectedClinicId(clinics[0].id);
    setSelectedPlanName(clinics[0].subscription?.planName || 'Plan Standard');
    
    // Auto preset standard price
    const matchedPack = packages.find(p => p.name === (clinics[0].subscription?.planName || 'Plan Standard'));
    setAmount(matchedPack ? matchedPack.price.toString() : '150');
    
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('TRANSFER');
    setReference('');
    setNotes('');
    setShowLogModal(true);
  };

  const handleClinicChange = (clinicId) => {
    setSelectedClinicId(clinicId);
    const clinic = clinics.find(c => c.id === clinicId);
    if (clinic) {
      const planName = clinic.subscription?.planName || 'Plan Standard';
      setSelectedPlanName(planName);
      const matchedPack = packages.find(p => p.name === planName);
      setAmount(matchedPack ? matchedPack.price.toString() : '150');
    }
  };

  const handleLogSubmit = (e) => {
    e.preventDefault();
    const clinic = clinics.find(c => c.id === selectedClinicId);
    if (!clinic) return;

    const newPayment = {
      clinicId: selectedClinicId,
      clinicName: clinic.name,
      planName: selectedPlanName,
      amount: Number(amount),
      paymentDate,
      paymentMethod,
      reference,
      notes,
      status: 'COMPLETED'
    };

    paymentsStore.addPayment(newPayment);
    setShowLogModal(false);
    reload();
  };

  const handleToggleStatus = (id, currentStatus) => {
    const nextStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING';
    paymentsStore.updatePaymentStatus(id, nextStatus);
    reload();
  };

  // Filter payments dynamically
  const filteredPayments = payments.filter(p => {
    return p.clinicName.toLowerCase().includes(search.toLowerCase()) || 
           p.reference.toLowerCase().includes(search.toLowerCase()) || 
           p.planName.toLowerCase().includes(search.toLowerCase());
  });

  // Pagination bounds calculations
  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = currentPage * pageSize;
  const paginatedPayments = filteredPayments.slice(startIdx, startIdx + pageSize);

  const handlePageChange = (pageNum) => {
    if (pageNum >= 0 && pageNum < totalPages) {
      setCurrentPage(pageNum);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un règlement (clinique, réf, plan...)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-all text-slate-700"
          />
        </div>

        <button
          onClick={handleOpenLog}
          className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-500/10 transition-all flex items-center gap-2 cursor-pointer active:scale-95 text-xs shrink-0"
        >
          <Plus size={14} />
          Enregistrer un Règlement
        </button>
      </div>

      {/* Main Datatable */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        {/* Datatable PageSize selector */}
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
            {totalItems} règlements enregistrés
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="py-4 px-6">ID Règlement</th>
                <th className="py-4 px-6">Clinique</th>
                <th className="py-4 px-6">Forfait</th>
                <th className="py-4 px-6">Date / Méthode</th>
                <th className="py-4 px-6">Montant</th>
                <th className="py-4 px-6">Statut</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {paginatedPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    Aucun règlement enregistré.
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="py-4 px-6 font-mono text-[10px] text-slate-400">
                      {pay.id}
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-extrabold text-slate-800 text-sm">{pay.clinicName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Réf : {pay.reference || 'Aucune'}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg text-[11px]">
                        {pay.planName}
                      </span>
                    </td>
                    <td className="py-4 px-6 space-y-0.5">
                      <p className="font-bold text-slate-700">{new Date(pay.paymentDate).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Mode : {
                        pay.paymentMethod === 'TRANSFER' ? 'Virement' : 
                        pay.paymentMethod === 'CREDIT_CARD' ? 'Carte bancaire' : 'Chèque/Autre'
                      }</p>
                    </td>
                    <td className="py-4 px-6 font-black text-slate-800 text-sm">
                      {pay.amount.toLocaleString()} €
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        pay.status === 'COMPLETED' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pay.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {pay.status === 'COMPLETED' ? 'Réglé' : 'En attente'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleStatus(pay.id, pay.status)}
                        className={`px-3 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                          pay.status === 'PENDING'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {pay.status === 'PENDING' ? 'Confirmer encaissement' : 'Remettre en attente'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Datatable Footer */}
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
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentPage === i
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

      {/* Manual Payment Modal Backdrop */}
      {showLogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Saisir un Règlement Manuel</h4>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider -mt-0.5">Enregistrez un versement reçu hors-ligne</p>
              </div>
              <button 
                onClick={() => setShowLogModal(false)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Clinique abonnée</label>
                  <select
                    value={selectedClinicId}
                    onChange={(e) => handleClinicChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  >
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Forfait associé</label>
                  <input
                    type="text"
                    disabled
                    value={selectedPlanName}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Montant du versement (€)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Date d'encaissement</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Méthode de paiement</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  >
                    <option value="TRANSFER">Virement Bancaire</option>
                    <option value="CREDIT_CARD">Carte Bancaire</option>
                    <option value="CHECK">Chèque</option>
                    <option value="CASH">Espèces</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Référence transaction</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: VIR-BCEAO-98210"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Notes complémentaires</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ex: Règlement de la facture trimestrielle anticipée..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700 font-sans"
                />
              </div>

              {/* Actions buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={13} />
                  Valider l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsList;
