import React, { useState, useEffect } from 'react';
import {
  Save, Landmark, Tag, Stethoscope, Search, Loader2, Info, Check, RefreshCw
} from 'lucide-react';
import { medicalActService, nomenclatureService } from '../../services/api';
import DataTable from '../ui/DataTable';

const ActTariffsManagement = ({ showToast }) => {
  const [tariffTypes, setTariffTypes] = useState([]);
  const [selectedTariffType, setSelectedTariffType] = useState('');
  
  const [acts, setActs] = useState([]);
  const [allTariffs, setAllTariffs] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [natures, setNatures] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterNature, setFilterNature] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Editable prices state: { [actId]: price_string_or_number }
  const [editedPrices, setEditedPrices] = useState({});

  const normalizeTariffType = (type) => {
    if (!type) return '';
    const upper = type.toUpperCase();
    if (upper === 'ASSURE_NAT' || upper === 'ASSURE_NATIONAL' || upper === 'NATIONAL') return 'ASSURE_NATIONAL';
    if (upper === 'ASSURE_INT' || upper === 'ASSURE_INTERNATIONAL' || upper === 'INTERNATIONAL') return 'ASSURE_INTERNATIONAL';
    return upper;
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedTariffType) {
      // Re-map prices when selected tariff type changes
      const mapped = {};
      acts.forEach(act => {
        const tariff = allTariffs.find(t => 
          t.actId === act.id && 
          normalizeTariffType(t.tariffType) === normalizeTariffType(selectedTariffType)
        );
        mapped[act.id] = tariff ? tariff.amount : '';
      });
      setEditedPrices(mapped);
    }
  }, [selectedTariffType, acts, allTariffs]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch tariff types from nomenclature
      const tariffRes = await nomenclatureService.search('TARIF', 'FINANCES');
      const tariffsList = tariffRes.data || [];
      setTariffTypes(tariffsList);
      if (tariffsList.length > 0) {
        setSelectedTariffType(tariffsList[0].code);
      }

      // Fetch acts, specialties, natures, and stored tariffs
      const [actsRes, specsRes, naturesRes, tariffsRes] = await Promise.all([
        medicalActService.getAll(),
        nomenclatureService.search('SPECIALITE', 'MEDICAL'),
        nomenclatureService.search('NATURE_ACTE', 'MEDICAL'),
        medicalActService.getAllTariffs()
      ]);

      setActs(actsRes.data || []);
      setSpecialties(specsRes.data || []);
      setNatures(naturesRes.data || []);
      setAllTariffs(tariffsRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors du chargement des données.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (actId, value) => {
    setEditedPrices(prev => ({
      ...prev,
      [actId]: value
    }));
  };

  const handleSaveAll = async () => {
    if (!selectedTariffType) return;
    setSaving(true);
    try {
      const payload = [];
      Object.entries(editedPrices).forEach(([actId, price]) => {
        if (price !== '' && price !== null && price !== undefined) {
          payload.push({
            actId: actId,
            tariffType: normalizeTariffType(selectedTariffType),
            amount: parseFloat(price) || 0
          });
        }
      });

      const res = await medicalActService.saveTariffsBatch(payload);
      setAllTariffs(res.data || []);
      showToast("Grille tarifaire enregistrée avec succès !", "success");
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement de la tarification", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredActs = acts.filter(act => {
    const matchesNature = !filterNature || act.nature === filterNature;
    const matchesSpecialty = !filterSpecialty || act.specialty === filterSpecialty;
    const matchesSearch = !searchTerm || 
      act.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      act.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesNature && matchesSpecialty && matchesSearch;
  });

  const paginatedActs = filteredActs.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const selectedTariffLabel = tariffTypes.find(t => t.code === selectedTariffType)?.string1 || selectedTariffType;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Landmark size={28} className="text-emerald-600" /> Tarification des Actes Médicaux
        </h2>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2 tracking-widest">
            Type de Tarification
          </label>
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" size={18} />
            <select
              value={selectedTariffType}
              onChange={e => setSelectedTariffType(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-emerald-500 bg-slate-50 text-slate-800 appearance-none cursor-pointer"
            >
              <option value="" disabled>-- Choisir le type de tarif --</option>
              {tariffTypes.map(t => <option key={t.code} value={t.code}>{t.string1}</option>)}
            </select>
          </div>
        </div>

        {selectedTariffType && (
          <div className="flex-none w-full md:w-auto">
            <button
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-75"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Enregistrer cette grille
            </button>
          </div>
        )}
      </div>

      {selectedTariffType ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope size={18} className="text-sky-600" />
                <span className="font-bold text-slate-700">Prix configurés pour la catégorie : <span className="text-emerald-700 font-black">{selectedTariffLabel}</span></span>
              </div>
            </div>

            {/* Dropdowns Filter Row */}
            <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200/60 flex flex-wrap items-center gap-3">
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Filtrer par :</div>
              <div className="relative flex-1 min-w-[200px]">
                <select
                  value={filterNature}
                  onChange={e => {
                    setFilterNature(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="">Toutes les natures</option>
                  {natures.map(n => (
                    <option key={n.code} value={n.code}>{n.string1}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <select
                  value={filterSpecialty}
                  onChange={e => {
                    setFilterSpecialty(e.target.value);
                    setCurrentPage(0);
                  }}
                  className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <option value="">Toutes les spécialités</option>
                  {specialties.map(spec => (
                    <option key={spec.id} value={spec.code}>{spec.string1}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => { setFilterNature(''); setFilterSpecialty(''); setSearchTerm(''); setCurrentPage(0); }}
                className="text-[10px] text-slate-400 font-black uppercase hover:text-rose-500 transition-colors py-2 px-4 bg-white border border-slate-200 rounded-lg shadow-sm"
              >
                Réinitialiser
              </button>
            </div>

            {/* Modern Data Table */}
            <DataTable
              columns={[
                {
                  label: "Acte Médical",
                  key: "name",
                  render: (row) => (
                    <div>
                      <div className="font-bold text-slate-700">{row.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono">{row.code}</div>
                    </div>
                  )
                },
                {
                  label: "Nature",
                  key: "nature",
                  render: (row) => {
                    const actNatureLabel = natures.find(n => n.code === row.nature)?.string1 || row.nature;
                    return (
                      <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-[9px] font-black uppercase whitespace-nowrap">
                        {actNatureLabel}
                      </span>
                    );
                  }
                },
                {
                  label: "Spécialité",
                  key: "specialty",
                  render: (row) => {
                    const actSpecialty = specialties.find(s => s.code === row.specialty)?.string1 || row.specialty || '-';
                    return (
                      <span className="text-[11px] text-slate-500 font-medium">
                        {actSpecialty}
                      </span>
                    );
                  }
                },
                {
                  label: "Tarif (FCFA)",
                  key: "price",
                  render: (row) => {
                    const priceValue = editedPrices[row.id] !== undefined ? editedPrices[row.id] : '';
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          value={priceValue}
                          placeholder="Non défini (0)"
                          onChange={(e) => handlePriceChange(row.id, e.target.value)}
                          className="w-48 text-right border-2 border-slate-200 focus:border-emerald-500 focus:bg-emerald-50/10 rounded-lg px-3 py-1.5 text-sm font-bold outline-none transition-all"
                        />
                        {priceValue !== '' && parseFloat(priceValue) > 0 && (
                          <Check size={16} className="text-emerald-500" />
                        )}
                      </div>
                    );
                  }
                }
              ]}
              data={paginatedActs}
              loading={loading}
              onSearch={(query) => {
                setSearchTerm(query);
                setCurrentPage(0);
              }}
              searchPlaceholder="Rechercher un acte..."
              entryLabel="actes"
              pagination={{
                currentPage,
                totalPages: Math.ceil(filteredActs.length / pageSize),
                totalElements: filteredActs.length,
                pageSize,
                onPageChange: (page) => setCurrentPage(page),
                onPageSizeChange: (size) => {
                  setPageSize(size);
                  setCurrentPage(0);
                }
              }}
            />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <Landmark size={32} className="text-emerald-300" />
          </div>
          <h3 className="text-lg font-black text-slate-700 mb-2">Aucun type de tarif sélectionné</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Veuillez sélectionner un type de tarification dans le menu déroulant ci-dessus pour configurer les tarifs de votre clinique.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActTariffsManagement;
