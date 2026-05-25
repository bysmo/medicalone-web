import React from 'react';
import { LayoutDashboard, Building2, Award, CreditCard, LogOut, ShieldAlert } from 'lucide-react';
import { getUserProfile, logout } from '../services/auth';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { id: 'clinics', icon: Building2, label: 'Abonnements & Cliniques' },
    { id: 'packages', icon: Award, label: 'Forfaits & Offres' },
    { id: 'payments', icon: CreditCard, label: 'Suivi des paiements' },
  ];

  const profile = getUserProfile();

  return (
    <div className="w-72 h-screen bg-[#0f172a] text-slate-300 flex flex-col sticky top-0 shrink-0 overflow-y-auto shadow-2xl border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950/20 text-white">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <ShieldAlert size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black uppercase tracking-wider text-white">AlphaCure SaaS</h1>
          <p className="text-[10px] text-sky-400 font-bold uppercase tracking-widest -mt-1">Console Admin</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-6 px-3 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/20 font-bold'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-sm shrink-0">
            {profile.name ? profile.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{profile.name || 'Admin SaaS'}</p>
            <p className="text-[10px] text-slate-500 truncate">{profile.email || 'admin@alphacure.com'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-slate-900 hover:bg-rose-600 hover:text-white transition-all text-slate-400 border border-slate-800 cursor-pointer"
        >
          <LogOut size={13} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
