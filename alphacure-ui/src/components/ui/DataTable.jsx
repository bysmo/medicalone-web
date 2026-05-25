import React, { useState, useEffect } from 'react';
import {
  Search, Plus, Menu, ChevronRight, ChevronLeft, ChevronDown,
  Eye, Edit3, CreditCard, Trash2, Loader2
} from 'lucide-react';

const DataTable = ({
  title,
  columns,
  data,
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
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fade-in">
      {(title || onCreate) && (
        <div className="bg-[#1e293b] p-4 flex justify-between items-center border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Menu className="text-sky-400" size={18} />
            <h3 className="text-white font-black uppercase tracking-widest text-[11px]">{title || "Liste"}</h3>
          </div>
          {onCreate && (
            <button onClick={onCreate} className="bg-white text-slate-900 px-4 py-2 rounded text-[10px] font-black uppercase flex items-center gap-2 hover:bg-sky-50 transition-colors shadow-lg">
              <Plus size={14} /> {createLabel}
            </button>
          )}
        </div>
      )}

      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex-1 min-w-[300px] flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-600 transition-colors" size={18} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all shadow-sm font-semibold"
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
            <button onClick={() => onSearch(searchValue)} className="bg-sky-700 text-white px-6 py-2 rounded-lg text-[11px] font-black uppercase hover:bg-sky-800 transition-all shadow-lg flex items-center gap-2">
              Rechercher
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {pagination && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
              <span>Afficher</span>
              <select 
                className="outline-none bg-transparent cursor-pointer text-sky-600 font-black"
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
            className={`p-2.5 rounded-lg border transition-all shadow-sm ${showFilters ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            title="Filtres par colonne"
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e293b] text-white border-b border-slate-700">
              {columns.map((col, idx) => (
                <th key={idx} className="p-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  <div className="flex flex-col gap-2">
                    <div 
                      className={`flex items-center gap-2 transition-colors ${col.key ? 'cursor-pointer hover:text-sky-400' : ''} ${sortConfig.key === col.key ? 'text-sky-400' : ''}`}
                      onClick={() => col.key && handleSort(col.key)}
                    >
                      {col.label}
                      {col.key && (
                        <div className="flex flex-col -space-y-1">
                          <ChevronDown size={10} className={`transform rotate-180 ${sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'text-sky-400' : 'text-slate-500'}`} />
                          <ChevronDown size={10} className={`${sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'text-sky-400' : 'text-slate-500'}`} />
                        </div>
                      )}
                    </div>
                    {showFilters && col.key && (
                      <input
                        type="text"
                        placeholder={`Filtrer...`}
                        className="font-normal normal-case p-1.5 border border-slate-700 rounded text-[11px] outline-none focus:border-sky-500 bg-slate-800 text-white"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setFilters({...filters, [col.key]: e.target.value})}
                      />
                    )}
                  </div>
                </th>
              ))}
              {showActions && (
                <th className="p-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={columns.length + (showActions ? 1 : 0)} className="p-20 text-center"><Loader2 className="animate-spin inline text-sky-600 mb-2" size={32}/><div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Récupération des données...</div></td></tr>
            ) : sortedData.length === 0 ? (
              <tr><td colSpan={columns.length + (showActions ? 1 : 0)} className="p-20 text-center text-slate-400 italic text-sm">Aucun résultat correspondant.</td></tr>
            ) : (
              sortedData.map((row, idx) => {
                const isMale = row.gender === 'M' || row.gender === 'Masculin';
                const isFemale = row.gender === 'F' || row.gender === 'Féminin';
                const isInsured = row.insurer || row.policyNumber || row.isInsured;

                const rowBgClass = isMale ? 'bg-sky-50/50' : isFemale ? 'bg-rose-50/50' : 'hover:bg-slate-50';
                const textWeightClass = isInsured ? 'font-black text-slate-900' : 'text-slate-600';

                return (
                  <tr key={idx} className={`${rowBgClass} ${textWeightClass} transition-all duration-150 group hover:!bg-emerald-50 hover:shadow-[inset_4px_0_0_#10b981] cursor-pointer`}>
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="p-3 px-4 whitespace-nowrap">
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                    {showActions && (
                      <td className="p-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {extraActions && extraActions(row)}
                          {onBill && <button onClick={() => onBill(row)} title="Facturer" className="p-1.5 bg-white hover:bg-emerald-100 text-emerald-600 rounded border border-slate-200 shadow-sm transition-colors"><CreditCard size={14} /></button>}
                          {onView && <button onClick={() => onView(row)} title="Consulter" className="p-1.5 bg-white hover:bg-sky-100 text-sky-600 rounded border border-slate-200 shadow-sm transition-colors"><Eye size={14} /></button>}
                          {onEdit && <button onClick={() => onEdit(row)} title="Modifier" className="p-1.5 bg-white hover:bg-amber-100 text-amber-600 rounded border border-slate-200 shadow-sm transition-colors"><Edit3 size={14} /></button>}
                          {onDelete && <button onClick={() => onDelete(row)} title="Supprimer" className="p-1.5 bg-white hover:bg-rose-100 text-rose-600 rounded border border-slate-200 shadow-sm transition-colors"><Trash2 size={14} /></button>}
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
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-4 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
            Affichage de <span className="text-sky-600">{startEntry}</span> à <span className="text-sky-600">{endEntry}</span> sur <span className="text-slate-800">{totalElements || 0}</span> {entryLabel}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
              Page {currentPage + 1} / {totalPages || 1}
            </div>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 0}
                onClick={() => onPageChange(currentPage - 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1 text-[11px] font-bold"
              >
                <ChevronLeft size={14} /> Précédent
              </button>
              <button
                disabled={currentPage >= totalPages - 1}
                onClick={() => onPageChange(currentPage + 1)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-1 text-[11px] font-bold"
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
