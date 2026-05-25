import React, { useState, useRef, useEffect } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { getUserProfile, getPrimaryRoleLabel } from '../../services/auth';
import { usePendingNotifications } from '../../hooks/usePendingNotifications';

const TopHeader = ({ setActiveTab }) => {
  const profile = getUserProfile();
  const roleLabel = getPrimaryRoleLabel();
  const { items, count, loading } = usePendingNotifications();
  const [openNotif, setOpenNotif] = useState(false);
  const notifRef = useRef(null);

  const displayName = profile?.name || profile?.username || 'Utilisateur';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const close = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setOpenNotif(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const goTo = (tab) => {
    if (setActiveTab && tab) setActiveTab(tab);
    setOpenNotif(false);
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 font-black text-sm shrink-0">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-black text-sm text-slate-800 truncate">{displayName}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
            {roleLabel}
            {profile?.email && (
              <span className="text-slate-400 font-medium normal-case tracking-normal hidden sm:inline">
                {' '}
                · {profile.email}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setOpenNotif((o) => !o)}
          className="relative p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          aria-label="Notifications et actions en attente"
        >
          <Bell size={20} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

        {openNotif && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-50">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                Actions en attente
              </span>
              <ChevronDown size={14} className="text-slate-400 rotate-180" />
            </div>
            {loading && (
              <p className="px-4 py-6 text-xs text-slate-400 text-center">Chargement…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-xs text-slate-500 text-center italic">
                Aucune action en attente pour le moment.
              </p>
            )}
            {!loading &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.tab)}
                  className={`w-full text-left px-4 py-3 text-xs font-semibold border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    item.type === 'warning' ? 'text-amber-800' : 'text-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopHeader;
