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
    <div className="h-16 bg-white flex items-center justify-between px-6 md:px-10 sticky top-0 z-40 shadow-sm" style={{ borderBottom: '1px solid var(--ac-border)' }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
          style={{ background: 'var(--ac-teal-50)', border: '1px solid var(--ac-teal-200)', color: 'var(--ac-teal-700)' }}>
          {initial}
        </div>
        <div className="min-w-0">
          <p className="font-black text-sm truncate" style={{ color: 'var(--ac-text-primary)' }}>{displayName}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--ac-text-muted)' }}>
            {roleLabel}
            {profile?.email && (
              <span className="font-medium normal-case tracking-normal hidden sm:inline" style={{ color: 'var(--ac-text-muted)' }}>
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
          className="relative p-2.5 rounded-xl transition-colors"
          style={{ border: '1px solid var(--ac-border)', color: 'var(--ac-text-secondary)' }}
          aria-label="Notifications et actions en attente"
          onMouseOver={e => { e.currentTarget.style.background = 'var(--ac-teal-50)'; }}
          onMouseOut={e => { e.currentTarget.style.background = ''; }}
        >
          <Bell size={20} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-black flex items-center justify-center"
              style={{ background: 'var(--ac-red)' }}>
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>

        {openNotif && (
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl z-50" style={{ border: '1px solid var(--ac-border)' }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ac-teal-50)' }}>
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--ac-teal-700)' }}>
                Actions en attente
              </span>
              <ChevronDown size={14} className="rotate-180" style={{ color: 'var(--ac-text-muted)' }} />
            </div>
            {loading && (
              <p className="px-4 py-6 text-xs text-center" style={{ color: 'var(--ac-text-muted)' }}>Chargement…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-6 text-xs text-center italic" style={{ color: 'var(--ac-text-secondary)' }}>
                Aucune action en attente pour le moment.
              </p>
            )}
            {!loading &&
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goTo(item.tab)}
                  className="w-full text-left px-4 py-3 text-xs font-semibold transition-colors"
                  style={{
                    borderBottom: '1px solid var(--ac-teal-50)',
                    color: item.type === 'warning' ? '#92400e' : 'var(--ac-text-primary)'
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = 'var(--ac-teal-50)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = ''; }}
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
