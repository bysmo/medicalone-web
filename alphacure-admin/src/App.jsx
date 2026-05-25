import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { initKeycloak, hasRole, logout } from './services/auth';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import OverviewDashboard from './components/dashboard/OverviewDashboard';
import ClinicsList from './components/clinics/ClinicsList';
import PackagesList from './components/packages/PackagesList';
import PaymentsList from './components/payments/PaymentsList';

const App = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    initKeycloak(() => {
      setAuthenticated(true);
    });
  }, []);

  if (!authenticated) {
    return (
      <div className="w-screen h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-300 font-sans">
        <RefreshCw size={36} className="animate-spin text-sky-500 mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Initialisation de la session sécurisée...
        </p>
      </div>
    );
  }

  // Enforce SUPER_ADMIN check for platform console security
  if (!hasRole('SUPER_ADMIN')) {
    return (
      <div className="w-screen h-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans text-slate-300">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-500 mx-auto shadow-lg shadow-rose-500/5">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-2">
            <h3 className="text-white text-lg font-black uppercase tracking-tight">Accès Refusé</h3>
            <p className="text-xs text-slate-400 font-medium">
              Désolé, cette console d'administration est strictement réservée aux administrateurs de la plateforme SaaS AlphaCure. Votre compte ne possède pas le rôle <strong>SUPER_ADMIN</strong> requis.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-800 flex gap-3 justify-center">
            <button
              onClick={logout}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut size={13} />
              Changer de compte
            </button>
          </div>
          <div className="absolute top-0 left-0 w-40 h-40 bg-rose-500/5 rounded-full blur-3xl -ml-20 -mt-20"></div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <OverviewDashboard setActiveTab={setActiveTab} />;
      case 'clinics':
        return <ClinicsList />;
      case 'packages':
        return <PackagesList />;
      case 'payments':
        return <PaymentsList />;
      default:
        return <OverviewDashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="w-screen h-screen bg-[#f8fafc] flex font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <TopHeader activeTab={activeTab} />

        {/* Dynamic Inner Page */}
        <main className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
