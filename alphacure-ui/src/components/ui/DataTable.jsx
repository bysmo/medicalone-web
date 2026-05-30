import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Menu, ChevronRight, ChevronLeft, ChevronDown,
  Eye, Edit3, CreditCard, Trash2, Loader2
} from 'lucide-react';

const DataTable = ({
  title,
  columns,
  data = [],
  loading,
  onSearch,
  onCreate,
  onView,
  onEdit,
  onBill,
  onDelete,
  extraActions,
  pagination,
  searchPlaceholder = "Rechercher...",
  entryLabel = "entrées",
  createLabel = "Nouveau"
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Sync internal search value if prop changes
  useEffect(() => {
    setSearchValue('');
  }, [title]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const filteredData = data.filter(item => {
    return Object.keys(filters).every(key => {
      if (!filters[key]) return true;
      const val = item[key]?.toString().toLowerCase() || '';
      return val.includes(filters[key].toLowerCase());
    });
  });

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const { currentPage, totalPages, totalElements, pageSize, onPageChange, onPageSizeChange } = pagination || {};
  const startEntry = totalElements > 0 ? (currentPage * pageSize) + 1 : 0;
  const endEntry = totalElements > 0
    ? Math.min((currentPage * pageSize) + data.length, totalElements)
    : 0;
  const showActions = !!(onBill || onView || onEdit || onDelete || extraActions);

  return (
    <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in" style={{ border: '1px solid var(--ac-border)' }}>
      {(title || onCreate) && (
        <div className="p-4 flex justify-between items-center" style={{ background: 'var(--ac-sidebar)', borderBottom: '1px solid rgba(26,127,151,0.2)' }}>
          <div className="flex items-center gap-3">
            <Menu style={{ color: 'var(--ac-teal-300)' }} size={18} />
            <h3 className="text-white font-black uppercase tracking-widest text-[11px]">{title || "Liste"}</h3>
          </div>
          {onCreate && (
            <button onClick={onCreate} className="bg-white px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 shadow-lg transition-colors"
              style={{ color: 'var(--ac-teal-700)' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--ac-teal-50)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
            >
              <Plus size={14} /> {createLabel}
            </button>
          )}
        </div>
      )}

      <div className="p-4 border-b flex flex-wrap gap-4 items-center justify-between" style={{ background: 'var(--ac-bg)', borderColor: 'var(--ac-border)' }}>
        <div className="flex-1 min-w-[300px] flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors" size={18}
              style={{ color: 'var(--ac-text-muted)' }} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-sm outline-none transition-all shadow-sm font-semibold"
              style={{ borderColor: 'var(--ac-border)' }}
              value={searchValue}
              onChange={(e) => {
                const val = e.target.value;
                setSearchValue(val);
                if (onSearch) onSearch(val);
              }}
              onKeyPress={(e) => e.key === 'Enter' && onSearch && onSearch(searchValue)}
            />
          </div>
          {onSearch && (
            <button onClick={() => onSearch(searchValue)}
              className="text-white px-6 py-2 rounded-xl text-[11px] font-black uppercase transition-all shadow-lg flex items-center gap-2"
              style={{ background: 'var(--ac-teal-500)' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--ac-teal-600)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--ac-teal-500)'; }}
            >
              Rechercher
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {pagination && (
            <div className="flex items-center gap-2 text-[11px] font-bold bg-white px-3 py-2 rounded-xl shadow-sm" style={{ border: '1px solid var(--ac-border)', color: 'var(--ac-text-muted)' }}>
              <span>Afficher</span>
              <select
                className="outline-none bg-transparent cursor-pointer font-black"
                style={{ color: 'var(--ac-teal-500)' }}
                value={pageSize}
                onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>entrées</span>
            </div>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2.5 rounded-xl transition-all shadow-sm"
            style={showFilters
              ? { background: 'var(--ac-teal-500)', color: 'white', border: '1px solid var(--ac-teal-500)' }
              : { background: 'white', color: 'var(--ac-text-secondary)', border: '1px solid var(--ac-border)' }}
            title="Filtres par colonne"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ background: 'var(--ac-sidebar)', borderBottom: '1px solid rgba(26,127,151,0.25)' }}>
              {columns.map((col, idx) => (
                <th key={idx} className="p-3 px-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <div className="flex flex-col gap-2">
                    <div
                      className={`flex items-center gap-2 transition-colors ${col.key ? 'cursor-pointer' : ''}`}
                      style={{ color: sortConfig.key === col.key ? 'var(--ac-teal-300)' : undefined }}
                      onClick={() => col.key && handleSort(col.key)}
                    >
                      {col.label}
                      {col.key && (
                        <div className="flex flex-col -space-y-1">
                          <ChevronDown size={10} className="transform rotate-180"
                            style={{ color: sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'var(--ac-teal-300)' : 'rgba(255,255,255,0.3)' }} />
                          <ChevronDown size={10}
                            style={{ color: sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'var(--ac-teal-300)' : 'rgba(255,255,255,0.3)' }} />
                        </div>
                      )}
                    </div>
                    {showFilters && col.key && (
                      <input
                        type="text"
                        placeholder={`Filtrer...`}
                        className="font-normal normal-case p-1.5 rounded text-[11px] outline-none"
                        style={{ border: '1px solid rgba(26,127,151,0.3)', background: 'rgba(255,255,255,0.05)', color: 'white' }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setFilters({...filters, [col.key]: e.target.value})}
                      />
                    )}
                  </div>
                </th>
              ))}
              {showActions && (
                <th className="p-3 px-4 text-[10px] font-black uppercase tracking-widest text-right" style={{ color: 'rgba(255,255,255,0.6)' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--ac-teal-50)' }}>
            {loading ? (
              <tr><td colSpan={columns.length + (showActions ? 1 : 0)} className="p-20 text-center">
                <Loader2 className="animate-spin inline mb-2" size={32} style={{ color: 'var(--ac-teal-500)' }}/>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--ac-text-muted)' }}>Récupération des données...</div>
              </td></tr>
            ) : sortedData.length === 0 ? (
              <tr><td colSpan={columns.length + (showActions ? 1 : 0)} className="p-20 text-center italic text-sm" style={{ color: 'var(--ac-text-muted)' }}>Aucun résultat correspondant.</td></tr>
            ) : (
              sortedData.map((row, idx) => {
                const isMale = row.gender === 'M' || row.gender === 'Masculin';
                const isFemale = row.gender === 'F' || row.gender === 'Féminin';
                const isInsured = row.insurer || row.policyNumber || row.isInsured;

                const rowBg = isMale ? 'rgba(26,127,151,0.03)' : isFemale ? 'rgba(192,57,43,0.03)' : 'transparent';

                return (
                  <tr key={idx}
                    className="transition-all duration-150 group cursor-pointer"
                    style={{ background: rowBg, fontWeight: isInsured ? '800' : '400' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'var(--ac-teal-50)'; e.currentTarget.style.boxShadow = 'inset 4px 0 0 var(--ac-teal-400)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = rowBg; e.currentTarget.style.boxShadow = ''; }}
                  >
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="p-3 px-4 whitespace-nowrap">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                    {showActions && (
                      <td className="p-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {extraActions && extraActions(row)}
                          {onBill && <button onClick={() => onBill(row)} title="Facturer" className="p-1.5 bg-white rounded border shadow-sm transition-colors" style={{ color: 'var(--ac-green-600)', borderColor: 'var(--ac-border)' }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--ac-green-50)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                          ><CreditCard size={14} /></button>}
                          {onView && <button onClick={() => onView(row)} title="Consulter" className="p-1.5 bg-white rounded border shadow-sm transition-colors" style={{ color: 'var(--ac-teal-600)', borderColor: 'var(--ac-border)' }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--ac-teal-50)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                          ><Eye size={14} /></button>}
                          {onEdit && <button onClick={() => onEdit(row)} title="Modifier" className="p-1.5 bg-white rounded border shadow-sm transition-colors" style={{ color: '#92400e', borderColor: 'var(--ac-border)' }}
                            onMouseOver={e => { e.currentTarget.style.background = '#fffbeb'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                          ><Edit3 size={14} /></button>}
                          {onDelete && <button onClick={() => onDelete(row)} title="Supprimer" className="p-1.5 bg-white rounded border shadow-sm transition-colors" style={{ color: 'var(--ac-red)', borderColor: 'var(--ac-border)' }}
                            onMouseOver={e => { e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
                          ><Trash2 size={14} /></button>}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="p-4 bg-white border-t flex flex-wrap justify-between items-center gap-4" style={{ borderColor: 'var(--ac-border)' }}>
          <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--ac-text-muted)' }}>
            Affichage de <span style={{ color: 'var(--ac-teal-500)' }}>{startEntry}</span> à <span style={{ color: 'var(--ac-teal-500)' }}>{endEntry}</span> sur <span style={{ color: 'var(--ac-text-primary)' }}>{totalElements || 0}</span> {entryLabel}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ac-text-muted)' }}>
              Page {currentPage + 1} / {totalPages || 1}
            </div>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 0}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-3 py-1.5 rounded-lg bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1 text-[11px] font-bold"
                style={{ border: '1px solid var(--ac-border)', color: 'var(--ac-text-primary)' }}
                onMouseOver={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--ac-teal-50)'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
              >
                <ChevronLeft size={14} /> Précédent
              </button>
              <button
                disabled={currentPage >= totalPages - 1}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-3 py-1.5 rounded-lg bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1 text-[11px] font-bold"
                style={{ border: '1px solid var(--ac-border)', color: 'var(--ac-text-primary)' }}
                onMouseOver={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'var(--ac-teal-50)'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}
              >
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
