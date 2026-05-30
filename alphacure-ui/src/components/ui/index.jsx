import React from 'react';
import TopHeader from './TopHeader';

export const InputSection = ({ icon: Icon, title, children, className = "" }) => (
  <div className={`bg-white rounded shadow-sm overflow-hidden ${className}`} style={{ border: '1px solid var(--ac-border)' }}>
    <div className="text-white p-3 flex items-center gap-2 font-bold text-[11px] uppercase tracking-wider form-section-header">
      <Icon size={14} /> {title}
    </div>
    <div className="p-6 space-y-4">
      {children}
    </div>
  </div>
);

export { default as TopHeader } from './TopHeader';

export const SidebarItem = ({ item, activeTab, setActiveTab, expanded, toggleExpand }) => {
  const isActive = activeTab === item.id || (item.subs && item.subs.some(s => s.id === activeTab));
  const ChevronDown = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>;
  const ChevronRight = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
  return (
    <div className="mb-0.5">
      <div
        onClick={() => item.subs ? toggleExpand(item.id) : setActiveTab(item.id)}
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer transition-all rounded-xl group"
        style={isActive ? {
          background: 'linear-gradient(135deg, rgba(26,127,151,0.25), rgba(26,127,151,0.15))',
          borderLeft: '3px solid #1a7f97',
          paddingLeft: '9px'
        } : {
          borderLeft: '3px solid transparent',
        }}
        onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseOut={e => { if (!isActive) e.currentTarget.style.background = ''; }}
      >
        <div className="flex items-center gap-3">
          <item.icon
            size={17}
            style={{ color: isActive ? '#65c0d3' : 'rgba(255,255,255,0.45)' }}
            className="group-hover:opacity-100 transition-colors"
          />
          <span
            className="text-[12px] font-semibold tracking-tight"
            style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.55)' }}
          >{item.label}</span>
        </div>
        {item.subs && (expanded
          ? <ChevronDown size={13} />
          : <ChevronRight size={13} />
        )}
      </div>
      {item.subs && expanded && (
        <div className="mt-0.5 ml-3 pl-3 space-y-0.5" style={{ borderLeft: '1px solid rgba(26,127,151,0.2)' }}>
          {item.subs.map(sub => (
            <div
              key={sub.id}
              onClick={() => setActiveTab(sub.id)}
              className="pl-5 pr-4 py-2 text-[11px] font-semibold cursor-pointer transition-all rounded-lg uppercase tracking-wide"
              style={{
                color: activeTab === sub.id ? '#65c0d3' : 'rgba(255,255,255,0.42)',
                background: activeTab === sub.id ? 'rgba(26,127,151,0.12)' : '',
              }}
              onMouseOver={e => { if (activeTab !== sub.id) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
              onMouseOut={e => { if (activeTab !== sub.id) e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
            >{sub.label}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export const QuickModal = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,35,53,0.65)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up" style={{ border: '1px solid var(--ac-teal-100)' }}>
        <div className="p-4 flex justify-between items-center" style={{ background: 'var(--ac-sidebar)', borderBottom: '1px solid rgba(26,127,151,0.2)' }}>
          <h3 className="text-white text-[11px] font-black uppercase tracking-widest">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
