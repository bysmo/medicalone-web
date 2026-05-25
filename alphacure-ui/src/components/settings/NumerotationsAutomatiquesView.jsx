import React, { useState, useEffect } from 'react';
import {
  Hash, Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp, GripVertical
} from 'lucide-react';
import { clinicService } from '../../services/api';

const SEGMENT_TYPES = [
  { value: 'INCREMENT', label: 'Compteur séquentiel' },
  { value: 'DAY', label: 'Jour (JJ)' },
  { value: 'MONTH', label: 'Mois (MM)' },
  { value: 'YEAR', label: 'Année (AAAA)' },
  { value: 'YEAR_SHORT', label: 'Année (AA)' },
  { value: 'SEPARATOR', label: 'Séparateur' },
  { value: 'LITERAL', label: 'Texte libre' },
];

const needsValue = (type) => type === 'SEPARATOR' || type === 'LITERAL';
const needsPad = (type) => type === 'INCREMENT';

const emptySegment = () => ({ type: 'LITERAL', value: '', padLength: 5 });

const buildPreview = (segments, nextSequence = 1) => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  const yearShort = year.slice(-2);
  let out = '';
  for (const seg of segments) {
    switch (seg.type) {
      case 'INCREMENT': {
        const pad = seg.padLength > 0 ? seg.padLength : 5;
        out += String(nextSequence).padStart(pad, '0');
        break;
      }
      case 'DAY': out += day; break;
      case 'MONTH': out += month; break;
      case 'YEAR': out += year; break;
      case 'YEAR_SHORT': out += yearShort; break;
      case 'SEPARATOR':
      case 'LITERAL':
        out += seg.value || '';
        break;
      default:
        break;
    }
  }
  return out;
};

const NumerotationsAutomatiquesView = ({ showToast }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await clinicService.getNumbering();
      const list = res.data || [];
      setRules(list.map((r) => ({
        ...r,
        segments: r.segments?.length ? r.segments : [emptySegment()],
      })));
      const exp = {};
      list.forEach((r) => { exp[r.documentType] = true; });
      setExpanded(exp);
    } catch (err) {
      console.error(err);
      showToast('Impossible de charger les numérotations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateRule = (docType, patch) => {
    setRules((prev) => prev.map((r) =>
      r.documentType === docType ? { ...r, ...patch } : r
    ));
  };

  const updateSegment = (docType, index, patch) => {
    setRules((prev) => prev.map((r) => {
      if (r.documentType !== docType) return r;
      const segments = [...r.segments];
      segments[index] = { ...segments[index], ...patch };
      if (patch.type && !needsValue(patch.type)) {
        segments[index].value = segments[index].value || '';
      }
      if (patch.type === 'INCREMENT' && !segments[index].padLength) {
        segments[index].padLength = 5;
      }
      return { ...r, segments };
    }));
  };

  const addSegment = (docType) => {
    setRules((prev) => prev.map((r) =>
      r.documentType === docType
        ? { ...r, segments: [...r.segments, emptySegment()] }
        : r
    ));
  };

  const removeSegment = (docType, index) => {
    setRules((prev) => prev.map((r) => {
      if (r.documentType !== docType) return r;
      if (r.segments.length <= 1) return r;
      return { ...r, segments: r.segments.filter((_, i) => i !== index) };
    }));
  };

  const handleSave = async () => {
    for (const r of rules) {
      if (!r.segments.some((s) => s.type === 'INCREMENT')) {
        showToast(`« ${r.documentLabel} » : ajoutez un compteur séquentiel`, 'error');
        return;
      }
    }
    setSaving(true);
    try {
      await clinicService.updateNumbering({ rules });
      showToast('Numérotations enregistrées');
      load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Erreur lors de l\'enregistrement';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/30 outline-none';

  if (loading) {
    return (
      <div className="flex justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={24} /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-violet-800 to-indigo-900 p-6 rounded-2xl shadow-lg text-white">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <Hash className="text-violet-300" size={24} /> Numérotations automatiques
          </h2>
          <p className="text-xs text-violet-200/80 mt-1 font-medium max-w-xl">
            Composez chaque numéro avec des segments : texte, dates, séparateur et compteur.
            Les règles par défaut sont créées à l&apos;activation de la clinique.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-violet-900 font-black text-xs uppercase tracking-widest disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer tout
        </button>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => {
          const isOpen = expanded[rule.documentType];
          const preview = buildPreview(rule.segments, rule.nextSequence || 1);
          return (
            <div key={rule.documentType} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 text-left"
                onClick={() => setExpanded((e) => ({ ...e, [rule.documentType]: !isOpen }))}
              >
                <div>
                  <p className="font-black text-sm text-slate-800 uppercase tracking-wide">
                    {rule.documentLabel}
                  </p>
                  <p className="text-[11px] text-sky-600 font-mono mt-0.5">
                    Aperçu : <span className="font-bold">{preview}</span>
                  </p>
                </div>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 border-t border-slate-100 space-y-4">
                  <div className="flex flex-wrap items-center gap-4 pt-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <input
                        type="checkbox"
                        checked={rule.active !== false}
                        onChange={(e) => updateRule(rule.documentType, { active: e.target.checked })}
                      />
                      Règle active
                    </label>
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Prochain compteur
                      <input
                        type="number"
                        min={1}
                        className={`${inputClass} w-24 ml-2`}
                        value={rule.nextSequence ?? 1}
                        onChange={(e) => updateRule(rule.documentType, {
                          nextSequence: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })}
                      />
                    </label>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Segments (ordre de composition)
                  </p>

                  {rule.segments.map((seg, idx) => (
                    <div
                      key={idx}
                      className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <GripVertical size={14} className="text-slate-300 mb-2 shrink-0" />
                      <div className="flex-1 min-w-[140px]">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Type</span>
                        <select
                          className={inputClass}
                          value={seg.type}
                          onChange={(e) => updateSegment(rule.documentType, idx, { type: e.target.value })}
                        >
                          {SEGMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      {needsValue(seg.type) && (
                        <div className="flex-1 min-w-[120px]">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {seg.type === 'SEPARATOR' ? 'Séparateur' : 'Texte'}
                          </span>
                          <input
                            className={inputClass}
                            value={seg.value || ''}
                            placeholder={seg.type === 'SEPARATOR' ? '-' : 'DOS-'}
                            onChange={(e) => updateSegment(rule.documentType, idx, { value: e.target.value })}
                          />
                        </div>
                      )}
                      {needsPad(seg.type) && (
                        <div className="w-24">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Largeur</span>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            className={inputClass}
                            value={seg.padLength ?? 5}
                            onChange={(e) => updateSegment(rule.documentType, idx, {
                              padLength: parseInt(e.target.value, 10) || 5,
                            })}
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSegment(rule.documentType, idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg mb-0.5"
                        title="Supprimer le segment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addSegment(rule.documentType)}
                    className="flex items-center gap-1 text-xs font-bold text-sky-600 uppercase"
                  >
                    <Plus size={14} /> Ajouter un segment
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NumerotationsAutomatiquesView;
