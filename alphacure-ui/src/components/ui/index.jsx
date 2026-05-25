import React from 'react';
import TopHeader from './TopHeader';

export const InputSection = ({ icon: Icon, title, children, className = "" }) => (
  <div className={`bg-white rounded shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    <div className="bg-[#1e293b] text-white p-3 flex items-center gap-2 font-bold text-[11px] uppercase tracking-wider">
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
      <div onClick={() => item.subs ? toggleExpand(item.id) : setActiveTab(item.id)} className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all rounded-lg group ${isActive ? 'bg-sky-600/10 text-white shadow-sm' : 'hover:bg-slate-700/30'}`}>
        <div className="flex items-center gap-3">
          <item.icon size={18} className={isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-white'} />
          <span className={`text-[13px] font-bold tracking-tight ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{item.label}</span>
        </div>
        {item.subs && (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
      </div>
      {item.subs && expanded && (
        <div className="mt-1 ml-4 border-l-2 border-slate-700 space-y-1">
          {item.subs.map(sub => (
            <div key={sub.id} onClick={() => setActiveTab(sub.id)} className={`pl-8 pr-4 py-2 text-[11px] font-bold cursor-pointer transition-all hover:text-white uppercase tracking-wider ${activeTab === sub.id ? 'text-sky-400' : 'text-slate-500'}`}>{sub.label}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export const QuickModal = ({ title, isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-slide-up">
        <div className="bg-[#1e293b] p-4 flex justify-between items-center">
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
