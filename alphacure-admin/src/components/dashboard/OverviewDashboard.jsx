import React, { useState, useEffect } from 'react';
import { Building2, Award, CreditCard, ArrowUpRight, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { clinicApi } from '../../services/api';
import { packagesStore } from '../../services/packagesStore';
import { paymentsStore } from '../../services/paymentsStore';

const OverviewDashboard = ({ setActiveTab }) => {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  const packages = packagesStore.getPackages();
  const payments = paymentsStore.getPayments();

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const list = await clinicApi.getAllClinics();
        setClinics(list);
      } catch (err) {
        console.error("Erreur de récupération des cliniques", err);
        // Fallback static mock for local sandbox
        setClinics([
          { id: '1', name: 'Clinique Saint-François', code: 'CSF', status: 'ACTIVE', subscription: { planName: 'Plan Professionnel' } },
          { id: '2', name: 'Clinique du Soleil', code: 'CDS', status: 'ACTIVE', subscription: { planName: 'Plan Standard' } },
          { id: '3', name: 'Hôpital Privé de l\'Est', code: 'HPE', status: 'ACTIVE', subscription: { planName: 'Plan Entreprise' } },
          { id: '4', name: 'Polyclinique du Centre', code: 'PDC', status: 'PENDING', subscription: { planName: 'Plan Professionnel' } }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, []);

  const totalClinics = clinics.length;
  const activeClinics = clinics.filter(c => c.status === 'ACTIVE').length;
  const pendingClinics = clinics.filter(c => c.status === 'PENDING').length;

  // Calculate MRR (Monthly Recurring Revenue)
  const calculatedMRR = clinics
    .filter(c => c.status === 'ACTIVE' && c.subscription)
    .reduce((sum, c) => {
      const pack = packages.find(p => p.name === c.subscription.planName);
      return sum + (pack ? pack.price : 0);
    }, 0);

  // Total Payments collected
  const totalRevenue = payments
    .filter(p => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2">
          <span className="bg-sky-500/20 text-sky-400 border border-sky-500/30 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">Tableau de Pilotage</span>
          <h3 className="text-2xl font-black tracking-tight">Bonjour, Administrateur AlphaCure</h3>
          <p className="text-sm text-slate-300 max-w-xl">
            Bienvenue dans votre centre névralgique SaaS. Suivez l'activité des cliniques abonnées, validez les nouvelles souscriptions et supervisez la croissance de vos revenus récurrents.
          </p>
        </div>
        <div className="flex gap-4 relative z-10 shrink-0">
          <button 
            onClick={() => setActiveTab('clinics')}
            className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm transition-all shadow-lg shadow-sky-500/20 active:scale-95 cursor-pointer"
          >
            Voir les Demandes ({pendingClinics})
          </button>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
      </div>

      {/* Grid KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cliniques KPI */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-all duration-200">
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">Cliniques Abonnées</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-800">{totalClinics}</span>
              <span className="text-xs font-bold text-slate-400">total</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <CheckCircle size={12} /> {activeClinics} Actives
              </span>
              {pendingClinics > 0 && (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
                  <Clock size={12} /> {pendingClinics} En attente
                </span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500 shadow-sm shrink-0">
            <Building2 size={24} />
          </div>
        </div>

        {/* MRR KPI */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-all duration-200">
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">Revenu Mensuel Récurrent (MRR)</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-800">{calculatedMRR.toLocaleString()} €</span>
              <span className="text-xs font-bold text-slate-400">/ mois</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <TrendingUp size={14} />
              <span>+18.5% ce mois-ci</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Total Payments KPI */}
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:scale-[1.01] transition-all duration-200">
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">Chiffre d'Affaires Collecté</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-800">{totalRevenue.toLocaleString()} €</span>
              <span className="text-xs font-bold text-slate-400">encaissés</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold bg-sky-50 border border-sky-100 rounded-full px-2.5 py-0.5 w-fit">
              <span>Rapprochement bancaire OK</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
            <CreditCard size={24} />
          </div>
        </div>
      </div>

      {/* Package distribution overview & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package distribution cards */}
        <div className="lg:col-span-1 glass-card p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Distribution des forfaits</h4>
            <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Actives</span>
          </div>

          <div className="space-y-4">
            {packages.map((pack) => {
              const count = clinics.filter(c => c.status === 'ACTIVE' && c.subscription && c.subscription.planName === pack.name).length;
              const percentage = totalClinics > 0 ? Math.round((count / activeClinics) * 100) : 0;
              return (
                <div key={pack.id} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-600">{pack.name}</span>
                    <span className="text-slate-800">{count} cliniques ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${
                        pack.name.includes('Entreprise') 
                          ? 'from-indigo-500 to-indigo-600' 
                          : pack.name.includes('Professionnel') 
                            ? 'from-sky-400 to-sky-500' 
                            : 'from-emerald-400 to-emerald-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wide">Paiements Récents</h4>
            <button 
              onClick={() => setActiveTab('payments')}
              className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1 cursor-pointer"
            >
              Voir tous les paiements <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[260px] overflow-y-auto pr-1">
            {payments.slice(0, 4).map((pay) => (
              <div key={pay.id} className="py-3.5 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    pay.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    <CreditCard size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{pay.clinicName}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{pay.planName} • {pay.paymentDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800">+{pay.amount} €</p>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    pay.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {pay.status === 'COMPLETED' ? 'Réglé' : 'En attente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
