import React from 'react';
import { Activity, Bell, Shield } from 'lucide-react';
import { getUserProfile } from '../services/auth';

const TopHeader = ({ activeTab }) => {
  const profile = getUserProfile();

  const getTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Tableau de bord Général';
      case 'clinics':
        return 'Gestion des Abonnements & Cliniques';
      case 'packages':
        return 'Gestion des Forfaits de Souscription';
      case 'payments':
        return 'Suivi des Paiements & Factures';
      default:
        return 'Console Administration';
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-10 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">{getTitle()}</h2>
      </div>

      <div className="flex items-center gap-6">
        {/* API Microservices status pill */}
        <div className="flex items-center gap-4 border-r border-slate-200 pr-6">
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Passerelle API : Active
          </div>
          <div className="flex items-center gap-2 bg-sky-50 text-sky-700 px-3 py-1.5 rounded-full text-xs font-bold border border-sky-200">
            <Activity size={12} className="animate-spin" />
            Keycloak Sync : OK
          </div>
        </div>

        {/* Notifications & User Profile */}
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-lg shadow-sky-500/10">
              <Shield size={16} />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-xs font-bold text-slate-800 -mb-0.5">{profile.name || 'Admin SaaS'}</p>
              <p className="text-[10px] text-slate-400 font-medium">Super Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
