import React, { useState, useEffect } from 'react';
import {
  Save, ShieldCheck, Building2, Copy, Info, Loader2, Filter, Search
} from 'lucide-react';
import { medicalActService, nomenclatureService, conventionService, insuranceService } from '../../services/api';
import DataTable from '../ui/DataTable';

const InsuranceConventions = ({ showToast }) => {
  const [insurers, setInsurers] = useState([]);
  const [selectedInsurer, setSelectedInsurer] = useState('');
  const [copyFromInsurer, setCopyFromInsurer] = useState('');
  const [acts, setActs] = useState([]);
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

  // conventions state: { [insurerId]: { [actId]: { isCovered: boolean, ceiling: number } } }
  const [conventions, setConventions] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const loadConventionsForInsurer = async (insurerId) => {
    if (!insurerId) return;
    setLoading(true);
    try {
      const res = await conventionService.getByInsurer(insurerId);
      const data = res.data || [];
      const mapped = {};
      data.forEach(item => {
        mapped[item.acteId] = {
          isCovered: item.isCovered,
          ceiling: item.maxAmountCovered || 0
        };
      });
      setConventions(prev => ({
        ...prev,
        [insurerId]: mapped
      }));
    } catch (err) {
      console.error("Error loading conventions:", err);
      showToast("Erreur lors du chargement des conventions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInsurer) {
      loadConventionsForInsurer(selectedInsurer);
    }
  }, [selectedInsurer]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actsRes, specsRes, naturesRes, insurersRes] = await Promise.all([
        medicalActService.getAll(),
        nomenclatureService.search('SPECIALITE', 'MEDICAL'),
        nomenclatureService.search('NATURE_ACTE', 'MEDICAL'),
        insuranceService.getAll()
      ]);

      setActs(actsRes.data || []);
      setSpecialties(specsRes.data || []);
      setNatures(naturesRes.data || []);
      setInsurers(insurersRes.data || []);
    } catch (err) {
      console.error(err);
      showToast("Erreur lors du chargement des données.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (actId, checked) => {
    if (!selectedInsurer) return;
    setConventions(prev => {
      const insurerConfig = prev[selectedInsurer] || {};
      const actConfig = insurerConfig[actId] || { ceiling: 0 };
      return {
        ...prev,
        [selectedInsurer]: {
          ...insurerConfig,
          [actId]: { ...actConfig, isCovered: checked }
        }
      };
    });
  };

  const handleCeilingChange = (actId, value) => {
    if (!selectedInsurer) return;
    const num = parseInt(value) || 0;
    setConventions(prev => {
      const insurerConfig = prev[selectedInsurer] || {};
      const actConfig = insurerConfig[actId] || { isCovered: false };
      return {
        ...prev,
        [selectedInsurer]: {
          ...insurerConfig,
          [actId]: { ...actConfig, ceiling: num }
        }
      };
    });
  };

  const applyChanges = async () => {
    if (!selectedInsurer) return;
    setSaving(true);
    try {
      const config = conventions[selectedInsurer] || {};
      const payload = Object.entries(config).map(([actId, info]) => ({
        acteId: actId,
        isCovered: !!info.isCovered,
        maxAmountCovered: info.ceiling || 0
      }));
      await conventionService.saveByInsurer(selectedInsurer, payload);
      const targetInsurerName = insurers.find(i => i.id === selectedInsurer)?.name || selectedInsurer;
      showToast(`Conventions enregistrées avec succès pour ${targetInsurerName}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    if (!selectedInsurer || !copyFromInsurer || selectedInsurer === copyFromInsurer) return;
    const sourceName = insurers.find(i => i.id === copyFromInsurer)?.name || copyFromInsurer;
    const targetName = insurers.find(i => i.id === selectedInsurer)?.name || selectedInsurer;
    if (window.confirm(`Copier les conventions de "${sourceName}" vers "${targetName}" ? Les configurations actuelles seront écrasées.`)) {
      setConventions(prev => {
        const sourceConfig = prev[copyFromInsurer] || {};
        const copiedConfig = JSON.parse(JSON.stringify(sourceConfig));
        return { ...prev, [selectedInsurer]: copiedConfig };
      });
      showToast(`Conventions copiées depuis ${sourceName}`, 'success');
      setCopyFromInsurer('');
    }
  };

  const filteredActs = acts.filter(act => {
    const matchesNature = !filterNature || act.nature === filterNature;
    const matchesSpecialty = !filterSpecialty || act.specialty === filterSpecialty;
    const matchesSearch = !searchTerm || act.name.toLowerCase().includes(searchTerm.toLowerCase()) || act.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesNature && matchesSpecialty && matchesSearch;
  });

  const paginatedActs = filteredActs.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  );

  const currentConfig = conventions[selectedInsurer] || {};
  const selectedInsurerLabel = insurers.find(i => i.id === selectedInsurer)?.name || selectedInsurer;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <ShieldCheck size={28} className="text-sky-600" /> Paramétrage des Conventions
        </h2>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2 tracking-widest">
            Sélectionner un assureur
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-sky-600" size={18} />
            <select
              value={selectedInsurer}
              onChange={e => setSelectedInsurer(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-sky-500 bg-slate-50 text-slate-800 appearance-none cursor-pointer"
            >
              <option value="" disabled>-- Choisir l'assureur à paramétrer --</option>
              {insurers.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        </div>

        {selectedInsurer && (
          <div className="flex-1 w-full bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-end">
            <label className="text-[10px] text-slate-500 font-bold uppercase block mb-2 tracking-widest flex items-center gap-1">
              <Copy size={12} /> Copier depuis un autre assureur
            </label>
            <div className="flex gap-2">
              <select
                value={copyFromInsurer}
                onChange={e => setCopyFromInsurer(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-sky-500 font-semibold text-slate-700 bg-white"
              >
                <option value="">-- Choisir un modèle --</option>
                {insurers.filter(i => i.id !== selectedInsurer).map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
              <button
                onClick={handleCopy}
                disabled={!copyFromInsurer}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-colors disabled:opacity-50"
              >
                Appliquer
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedInsurer ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span className="font-bold text-slate-700">Actes pris en charge par <span className="text-sky-700 font-black">{selectedInsurerLabel}</span></span>
              </div>
              <button
                onClick={applyChanges}
                disabled={saving}
                className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Appliquer les modifications
              </button>
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
                  className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:border-sky-500 appearance-none cursor-pointer"
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
                  className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white outline-none focus:border-sky-500 appearance-none cursor-pointer"
                >
                  <option value="">Toutes les spécialités</option>
                  {specialties.map(spec => (
                    <option key={spec.id} value={spec.code}>{spec.string1}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => { setFilterNature(''); setFilterSpecialty(''); setSearchTerm(''); setCurrentPage(0); }}
                className="text-[10px] text-slate-400 font-bold uppercase hover:text-rose-500 transition-colors py-2 px-4 bg-white border border-slate-200 rounded-lg shadow-sm font-black"
              >
                Réinitialiser
              </button>
            </div>

            {/* Modern Data Table */}
            <DataTable
              columns={[
                {
                  label: "Couvert",
                  key: "isCovered",
                  className: "w-20 text-center",
                  render: (row) => {
                    const config = currentConfig[row.id] || { isCovered: false, ceiling: 0 };
                    return (
                      <div className="flex justify-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.isCovered}
                            onChange={(e) => handleCheckboxChange(row.id, e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    );
                  }
                },
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
                  label: "Plafond (FCFA)",
                  key: "ceiling",
                  className: "w-48 text-right",
                  render: (row) => {
                    const config = currentConfig[row.id] || { isCovered: false, ceiling: 0 };
                    return (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          disabled={!config.isCovered}
                          value={config.ceiling}
                          onChange={(e) => handleCeilingChange(row.id, e.target.value)}
                          className={`w-32 text-right border rounded px-3 py-1.5 text-sm outline-none transition-colors ${config.isCovered
                              ? 'border-emerald-300 focus:border-emerald-500 bg-white font-bold text-slate-800'
                              : 'border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                        />
                        {config.ceiling === 0 && config.isCovered && (
                          <div className="group relative">
                            <Info size={14} className="text-emerald-500 cursor-help" />
                            <div className="absolute bottom-full right-0 mb-2 w-32 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center z-20">
                              0 = Illimité
                            </div>
                          </div>
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
          <div className="bg-sky-50 w-20 h-20 rounded-full flex items-center justify-center mb-4">
            <Building2 size={32} className="text-sky-300" />
          </div>
          <h3 className="text-lg font-black text-slate-700 mb-2">Aucun assureur sélectionné</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Veuillez sélectionner un assureur dans le menu déroulant ci-dessus pour paramétrer la prise en charge de ses actes médicaux.
          </p>
        </div>
      )}
    </div>
  );
};

export default InsuranceConventions;
