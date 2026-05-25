import { useState, useEffect } from 'react';
import {
  ArrowLeft, FileText, Activity, Pill, FlaskConical, Stethoscope,
  Plus, Save, Check, Loader2,
  Calendar, Heart, X, Printer, Eye
} from 'lucide-react';
import { medicalService, practitionerService, patientService, clinicService } from '../../services/api';
import { PacsViewerModal } from './ImagerieConsultationView';

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (dt) => {
  if (!dt) return '---';
  const d = new Date(dt);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};
const formatTime = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const NATURE_CONFIG = {
  CONSULTATIONS: { label: 'Consultation', icon: Stethoscope, color: 'emerald', gradient: 'from-emerald-500 to-teal-500' },
  SEANCES: { label: 'Séance', icon: Activity, color: 'violet', gradient: 'from-violet-500 to-purple-500' },
  SOINS_INFIRMIERS: { label: 'Soins Infirmiers', icon: Heart, color: 'rose', gradient: 'from-rose-500 to-pink-500' },
  INTERVENTIONS: { label: 'Intervention', icon: Activity, color: 'orange', gradient: 'from-orange-500 to-amber-500' },
  EXAMENS: { label: 'Examen', icon: FlaskConical, color: 'sky', gradient: 'from-sky-500 to-blue-500' },
};

// ── Vitals Panel ─────────────────────────────────────────────────────────────
const VitalsPanel = ({ prestationId, consultationId }) => {
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(!!(prestationId || consultationId));
  const [prevIds, setPrevIds] = useState({ prestationId, consultationId });
  const ICONS = {
    POIDS: '⚖️', TAILLE: '📏', TEMPERATURE: '🌡️', TA_SYSTOLIQUE: '🩺', TA_DIASTOLIQUE: '🩺',
    FREQUENCE_CARDIAQUE: '❤️', SATURATION_O2: '🫁', GLYCEMIE: '💉', IMC: '📊', FREQUENCE_RESPIRATOIRE: '🫀'
  };

  if (prestationId !== prevIds.prestationId || consultationId !== prevIds.consultationId) {
    setPrevIds({ prestationId, consultationId });
    setLoading(!!(prestationId || consultationId));
  }

  useEffect(() => {
    if (!prestationId && !consultationId) return;
    medicalService.getVitals(prestationId, consultationId)
      .then(r => setVitals(r.data || []))
      .catch(() => setVitals([]))
      .finally(() => setLoading(false));
  }, [prestationId, consultationId]);

  if (loading) return <div className="flex items-center gap-2 text-slate-400 p-4"><Loader2 size={14} className="animate-spin" /> Chargement...</div>;
  if (vitals.length === 0) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
      <p className="text-amber-700 text-[11px] font-bold">Aucune constante enregistrée pour cette prestation</p>
      <p className="text-amber-500 text-[10px] mt-1">L'infirmier(ère) n'a pas encore pris les constantes.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {vitals.map((v) => (
        <div key={v.id || v.constantCode} className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-xl p-3 flex items-center gap-3">
          <span className="text-xl">{ICONS[v.constantCode] || '📋'}</span>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{v.constantName}</p>
            <p className="font-black text-slate-800 text-sm">{v.value} <span className="text-[9px] font-bold text-slate-400">{v.unit}</span></p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Dicom File List Panel ──────────────────────────────────────────────────
const DicomFileListPanel = ({ consultationId, patientName, patientCode, actName }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(!!consultationId);
  const [prevConsultationId, setPrevConsultationId] = useState(consultationId);
  const [activeViewerFile, setActiveViewerFile] = useState(null);

  if (consultationId !== prevConsultationId) {
    setPrevConsultationId(consultationId);
    setLoading(!!consultationId);
  }

  useEffect(() => {
    if (!consultationId) return;
    medicalService.getDicomFilesByConsultation(consultationId)
      .then(r => setFiles(r.data || []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [consultationId]);

  if (loading) return <div className="flex items-center gap-2 text-slate-400 p-4"><Loader2 size={14} className="animate-spin" /> Chargement...</div>;
  if (files.length === 0) return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center text-slate-400">
      <p className="text-sm font-bold">Aucune image DICOM associée</p>
      <p className="text-[10px] mt-1">Aucune image d'imagerie n'a été importée pour cette consultation.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {activeViewerFile && (
        <PacsViewerModal
          fileName={activeViewerFile.fileName}
          fileUrl={`/api/v1/medical/dicom/${activeViewerFile.id}/raw`}
          patientName={patientName}
          patientCode={patientCode}
          actName={actName}
          onClose={() => setActiveViewerFile(null)}
        />
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {files.map((file) => (
          <div key={file.id} className="border border-slate-200 rounded-xl p-3 bg-slate-50 flex flex-col justify-between gap-3 group relative hover:shadow-sm transition-all">
            <div className="w-full h-24 bg-slate-950 rounded-lg flex items-center justify-center text-slate-500 text-[10px] font-mono font-bold select-none border border-slate-900">
              {file.fileName.toLowerCase().endsWith('.dcm') ? 'PACS SCAN (.DCM)' : 'IMAGE DE SÉRIE'}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-slate-700 truncate">{file.fileName}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">{(file.fileSize / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => setActiveViewerFile(file)}
              className="w-full mt-1 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase rounded-lg flex items-center justify-center gap-1"
            >
              <Eye size={10} /> Visualiser PACS
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SectionBtn = ({ id, label, icon: Icon, activeSection, setActiveSection }) => (
  <button onClick={() => setActiveSection(id)}
    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeSection === id ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>
    <Icon size={11} /> {label}
  </button>
);

// ── Consultation Form ─────────────────────────────────────────────────────────
const ConsultationForm = ({ consultationId, prestationId, patientId, onSaved, onPrintPrescription, onPrintExamRequest }) => {
  const [note, setNote] = useState({ observations: '', diagnostics: '', conclusions: '' });
  const [prescription, setPrescription] = useState({ lines: [] });
  const [examRequests, setExamRequests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('obs');

  useEffect(() => {
    if (!prestationId && !consultationId) return;
    Promise.all([
      medicalService.getNote(prestationId, consultationId).catch(() => ({ data: null })),
      medicalService.getPrescription(prestationId, consultationId).catch(() => ({ data: null })),
      medicalService.getExamRequests(prestationId, consultationId).catch(() => ({ data: [] })),
    ]).then(([noteRes, prescRes, examRes]) => {
      if (noteRes.data) setNote({ observations: noteRes.data.observations || '', diagnostics: noteRes.data.diagnostics || '', conclusions: noteRes.data.conclusions || '' });
      if (prescRes.data) {
        setPrescription({ id: prescRes.data.id, lines: prescRes.data.lines || [] });
      }
      if (examRes.data?.length) setExamRequests(examRes.data);
    });
  }, [prestationId, consultationId]);

  const addPrescriptionLine = () => {
    setPrescription(p => ({ ...p, lines: [...p.lines, { orderNum: p.lines.length + 1, medication: '', dosage: '', frequency: '', duration: '', comment: '' }] }));
  };
  const updatePrescriptionLine = (idx, field, val) => {
    setPrescription(p => { const lines = [...p.lines]; lines[idx] = { ...lines[idx], [field]: val }; return { ...p, lines }; });
  };
  const removePrescriptionLine = (idx) => {
    setPrescription(p => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }));
  };

  const addExam = () => {
    setExamRequests(e => [...e, { orderNum: e.length + 1, examName: '', clinicalInfo: '', comment: '' }]);
  };
  const updateExam = (idx, field, val) => {
    setExamRequests(e => { const a = [...e]; a[idx] = { ...a[idx], [field]: val }; return a; });
  };
  const removeExam = (idx) => {
    setExamRequests(e => e.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        medicalService.saveNote({ prestationId, patientId, consultationId, ...note }),
        prescription.lines.length > 0 && medicalService.savePrescription({ prestationId, patientId, consultationId, prescribedBy: 'Médecin', lines: prescription.lines }),
        examRequests.filter(e => e.examName).length > 0 && medicalService.saveExamRequests({ prestationId, patientId, consultationId, requestedBy: 'Médecin', exams: examRequests.filter(e => e.examName) }),
      ].filter(Boolean));
      onSaved && onSaved();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 bg-slate-50 rounded-xl p-1 border border-slate-100">
        <SectionBtn id="obs" label="Observations" icon={FileText} activeSection={activeSection} setActiveSection={setActiveSection} />
        <SectionBtn id="rx" label="Ordonnance" icon={Pill} activeSection={activeSection} setActiveSection={setActiveSection} />
        <SectionBtn id="exam" label="Examens" icon={FlaskConical} activeSection={activeSection} setActiveSection={setActiveSection} />
      </div>

      {/* Observations / Diagnostics / Conclusions */}
      {activeSection === 'obs' && (
        <div className="space-y-3">
          {[
            { key: 'observations', label: 'Observations cliniques', rows: 4, placeholder: 'Décrivez les symptômes, plaintes, signes cliniques observés...' },
            { key: 'diagnostics', label: 'Diagnostic(s)', rows: 3, placeholder: 'Posez votre diagnostic différentiel et principal...' },
            { key: 'conclusions', label: 'Conclusion & Conduite à tenir', rows: 3, placeholder: 'Plan de traitement, références, suivi...' },
          ].map(({ key, label, rows, placeholder }) => (
            <div key={key}>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">{label}</label>
              <textarea rows={rows} value={note[key]} onChange={e => setNote(n => ({ ...n, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none transition-all bg-white" />
            </div>
          ))}
        </div>
      )}

      {/* Ordonnance */}
      {activeSection === 'rx' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lignes d'ordonnance</label>
            <div className="flex gap-2">
              {prescription.lines.length > 0 && onPrintPrescription && (
                <button type="button" onClick={() => onPrintPrescription(prescription)}
                  className="flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                  <Printer size={10} /> Imprimer
                </button>
              )}
              <button onClick={addPrescriptionLine}
                className="flex items-center gap-1 text-[10px] font-black text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-1.5 rounded-lg hover:bg-violet-100 transition-colors">
                <Plus size={10} /> Ajouter médicament
              </button>
            </div>
          </div>
          {prescription.lines.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <Pill size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold">Aucun médicament prescrit</p>
              <p className="text-[11px]">Cliquez sur "Ajouter médicament" pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {prescription.lines.map((line, idx) => (
                <div key={idx} className="bg-violet-50 border border-violet-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-violet-600 uppercase">Médicament {idx + 1}</span>
                    <button onClick={() => removePrescriptionLine(idx)} className="text-rose-400 hover:text-rose-600 transition-colors"><X size={12} /></button>
                  </div>
                  <input value={line.medication} onChange={e => updatePrescriptionLine(idx, 'medication', e.target.value)}
                    placeholder="Nom du médicament..."
                    className="w-full bg-white border border-violet-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-violet-400 transition-all" />
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { field: 'dosage', placeholder: 'Dosage (ex: 500mg)' },
                      { field: 'frequency', placeholder: 'Fréquence (ex: 3x/j)' },
                      { field: 'duration', placeholder: 'Durée (ex: 7 jours)' },
                    ].map(({ field, placeholder }) => (
                      <input key={field} value={line[field]} onChange={e => updatePrescriptionLine(idx, field, e.target.value)}
                        placeholder={placeholder}
                        className="bg-white border border-violet-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 outline-none focus:border-violet-400 transition-all" />
                    ))}
                  </div>
                  <input value={line.comment} onChange={e => updatePrescriptionLine(idx, 'comment', e.target.value)}
                    placeholder="Remarques (ex: à prendre avec les repas)"
                    className="w-full bg-white border border-violet-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 outline-none focus:border-violet-400 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Demandes d'examens */}
      {activeSection === 'exam' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Examens demandés</label>
            <div className="flex gap-2">
              {examRequests.length > 0 && onPrintExamRequest && (
                <button type="button" onClick={() => onPrintExamRequest(examRequests)}
                  className="flex items-center gap-1 text-[10px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                  <Printer size={10} /> Imprimer
                </button>
              )}
              <button onClick={addExam}
                className="flex items-center gap-1 text-[10px] font-black text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1.5 rounded-lg hover:bg-sky-100 transition-colors">
                <Plus size={10} /> Ajouter examen
              </button>
            </div>
          </div>
          {examRequests.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              <FlaskConical size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-bold">Aucun examen demandé</p>
            </div>
          ) : (
            <div className="space-y-2">
              {examRequests.map((exam, idx) => (
                <div key={idx} className="bg-sky-50 border border-sky-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-sky-600 uppercase">Examen {idx + 1}</span>
                    <button onClick={() => removeExam(idx)} className="text-rose-400 hover:text-rose-600 transition-colors"><X size={12} /></button>
                  </div>
                  <input value={exam.examName} onChange={e => updateExam(idx, 'examName', e.target.value)}
                    placeholder="Nom de l'examen..."
                    className="w-full bg-white border border-sky-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:border-sky-400 transition-all" />
                  <textarea value={exam.clinicalInfo} onChange={e => updateExam(idx, 'clinicalInfo', e.target.value)}
                    rows={2} placeholder="Renseignements cliniques..."
                    className="w-full bg-white border border-sky-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 outline-none focus:border-sky-400 resize-none transition-all" />
                  <input value={exam.comment} onChange={e => updateExam(idx, 'comment', e.target.value)}
                    placeholder="Commentaire..."
                    className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-600 outline-none focus:border-sky-400 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:opacity-90 transition-opacity disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  );
};

// ── History Sidebar Item ───────────────────────────────────────────────────────
const HistoryItem = ({ item, isActive, practitioners = [], onClick }) => {
  const cfg = NATURE_CONFIG[item.nature] || NATURE_CONFIG.CONSULTATIONS;
  const Icon = cfg.icon;

  // Resolve practitioner details
  const matchedPractitioner = practitioners.find(pr => pr.id === item.practitionerId);
  const doctorName = matchedPractitioner ? matchedPractitioner.fullName : 'Non affecté';
  const prSpecParts = matchedPractitioner ? (matchedPractitioner.specialty || '').split('|') : [];
  const specialty = prSpecParts[1] || 'Médecine Générale';

  return (
    <div onClick={onClick}
      className={`flex flex-col gap-2.5 p-3.5 rounded-xl cursor-pointer transition-all border ${isActive ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
        }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
          <Icon size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-1">
            <p className="text-[11px] font-black text-slate-700 truncate">{cfg.label}</p>
            <span className={`text-[8.5px] px-1.5 py-0.5 rounded-full font-black border uppercase shrink-0 tracking-wider leading-none ${item.medicalStatus === 'TERMINEE' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                item.medicalStatus === 'DEMARREE' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-slate-100 text-slate-800 border-slate-200'
              }`}>
              {item.medicalStatus === 'TERMINEE' ? 'Terminée' :
                item.medicalStatus === 'DEMARREE' ? 'En cours' : 'En attente'}
            </span>
          </div>
          <p className="text-[9px] text-slate-400 font-mono mt-0.5">{formatDate(item.createdAt)}</p>
        </div>
      </div>

      {/* Detailed section */}
      <div className="pl-11 border-t border-slate-100/80 pt-2 space-y-1">
        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Spécialité</span>
          <span className="font-black text-slate-700 truncate max-w-[120px]">{specialty}</span>
        </div>
        <div className="flex items-center justify-between text-[9px] text-slate-500">
          <span className="font-bold text-slate-400 uppercase tracking-wider">Médecin</span>
          <span className="font-black text-slate-700 truncate max-w-[120px]">{doctorName}</span>
        </div>
      </div>
    </div>
  );
};

// ── Main DossierMedicalView ───────────────────────────────────────────────────
const DossierMedicalView = ({ consultationId, patientId, prestationId, patientName, patientCode, onClose, showToast, backLabel = 'Retour' }) => {
  const [history, setHistory] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [ending, setEnding] = useState(false);
  const [loading, setLoading] = useState(!!patientId);
  const [prevPatientId, setPrevPatientId] = useState(patientId);
  const [activeTab, setActiveTab] = useState('constantes');

  if (patientId !== prevPatientId) {
    setPrevPatientId(patientId);
    setLoading(!!patientId);
  }

  useEffect(() => {
    if (!patientId) return;
    Promise.all([
      medicalService.getPatientHistory(patientId).catch(() => ({ data: [] })),
      practitionerService.getAll().catch(() => ({ data: [] }))
    ]).then(([historyRes, practitionersRes]) => {
      const items = historyRes.data || [];
      const prs = practitionersRes.data || [];
      setHistory(items);
      setPractitioners(prs);

      const current = items.find(i => i.id === consultationId) || items[0] || { id: consultationId, prestationId, nature: 'CONSULTATIONS', medicalStatus: 'DEMARREE' };
      setActiveConsultation(current);
      setSelectedConsultation(current);
    }).catch(err => {
      console.error("Error loading patient history and practitioners:", err);
      setActiveConsultation({ id: consultationId, prestationId, nature: 'CONSULTATIONS', medicalStatus: 'DEMARREE' });
      setSelectedConsultation({ id: consultationId, prestationId, nature: 'CONSULTATIONS', medicalStatus: 'DEMARREE' });
    }).finally(() => setLoading(false));
  }, [consultationId, patientId, prestationId]);

  const handleEndConsultation = async () => {
    if (!consultationId) return;
    setEnding(true);
    try {
      await medicalService.endConsultation(consultationId);
      showToast('Consultation terminée', 'success');
      onClose && onClose();
    } catch (err) {
      console.error(err);
      showToast('Consultation terminée (synchronisation en arrière-plan)', 'success');
      onClose && onClose();
    } finally {
      setEnding(false);
    }
  };

  const nature = selectedConsultation?.nature || 'CONSULTATIONS';
  const cfg = NATURE_CONFIG[nature] || NATURE_CONFIG.CONSULTATIONS;
  const Icon = cfg.icon;
  const isCurrentActive = selectedConsultation?.id === consultationId;

  // Resolve active/selected practitioner info
  const selectedPractitioner = selectedConsultation
    ? practitioners.find(pr => pr.id === selectedConsultation.practitionerId)
    : null;
  const selectedDoctorName = selectedPractitioner ? selectedPractitioner.fullName : 'Non affecté';
  const selectedPrSpecParts = selectedPractitioner ? (selectedPractitioner.specialty || '').split('|') : [];
  const selectedSpecialty = selectedPrSpecParts[1] || 'Médecine Générale';

  const printPrescription = async (prescData) => {
    if (!prescData || !prescData.lines || prescData.lines.length === 0) {
      showToast("Aucune ligne d'ordonnance à imprimer", "error");
      return;
    }
    showToast("Préparation de l'impression...", "info");
    try {
      const [clinicRes, patientRes] = await Promise.all([
        clinicService.getMyProfile().catch(() => null),
        patientService.getById(patientId).catch(() => null)
      ]);
      const clinic = clinicRes?.data?.clinic;
      const clinicProfile = clinicRes?.data?.profile;
      const patient = patientRes?.data || { firstName: patientName, lastName: '', patientCode };

      const activePractitioner = practitioners.find(pr => pr.id === selectedConsultation?.practitionerId) || {};
      const doctorName = activePractitioner.fullName || 'Médecin';
      const prSpecParts = (activePractitioner.specialty || '').split('|');
      const specialty = prSpecParts[1] || 'Médecine Générale';

      const headerImg = clinicProfile?.printHeaderA4 || clinicProfile?.printHeaderA5 || '';
      const footerImg = clinicProfile?.printFooterA4 || clinicProfile?.printFooterA5 || '';

      const printWindow = window.open('', '', 'width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (!printWindow) {
        showToast("Le bloqueur de pop-up empêche l'impression. Veuillez l'autoriser.", "warning");
        return;
      }

      const linesHtml = prescData.lines.map((line, idx) => `
        <div style="margin-bottom: 18px; page-break-inside: avoid;">
          <!-- Line 1: Order number in circle, medication name, dosage -->
          <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: 2px solid #0f172a; border-radius: 50%; font-weight: bold; font-size: 11px; color: #0f172a; margin-right: 12px; flex-shrink: 0; line-height: 1; text-align: center; box-sizing: border-box; font-family: monospace;">
              ${idx + 1}
            </div>
            <div style="font-weight: bold; font-size: 14px; color: #0f172a; line-height: 1.2;">
              ${line.medication}
              ${line.dosage ? `<span style="font-weight: normal; font-size: 13px; color: #475569; margin-left: 6px;">— ${line.dosage}</span>` : ''}
            </div>
          </div>
          
          <!-- Line 2: Posologie & Durée -->
          <div style="margin-left: 34px; font-size: 12px; color: #334155; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span><strong style="color: #475569;">Posologie :</strong> ${line.frequency || '---'}</span>
            <span style="color: #cbd5e1; font-weight: bold;">•</span>
            <span><strong style="color: #475569;">Durée :</strong> ${line.duration || '---'}</span>
          </div>

          <!-- Instruction/Comment -->
          ${line.comment ? `
          <div style="margin-left: 34px; margin-top: 6px; font-size: 11px; color: #64748b; font-style: italic; background-color: #f8fafc; padding: 6px 12px; border-left: 3px solid #cbd5e1; border-radius: 0 4px 4px 0;">
            Note : ${line.comment}
          </div>` : ''}

          <!-- Separator Line -->
          <div style="border-bottom: 1px dashed #e2e8f0; margin-top: 18px; margin-bottom: 14px; width: 100%;"></div>
        </div>
      `).join('');

      const formattedBirthDate = patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('fr-FR') : '---';
      const patientGender = patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : '---';
      const formattedDate = new Date(selectedConsultation?.createdAt || Date.now()).toLocaleDateString('fr-FR');

      printWindow.document.write(`
        <html>
          <head>
            <title>Ordonnance - ${patient.firstName} ${patient.lastName}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; padding: 30px; font-size: 12px; }
              .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
              .footer-img { width: 100%; max-height: 80px; object-fit: contain; margin-top: 30px; }
              .clinic-text-header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 10px; margin-bottom: 25px; }
              .clinic-name { font-size: 18px; font-weight: 900; color: #0d9488; text-transform: uppercase; margin: 0; }
              .clinic-sub { font-size: 10px; color: #64748b; margin: 4px 0 0 0; font-weight: bold; }
              .doc-patient-table { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
              .doc-patient-table td { padding: 6px 12px; vertical-align: top; border: 1px solid #e2e8f0; }
              .title { text-align: center; font-size: 20px; font-weight: 900; margin: 30px 0; text-transform: uppercase; color: #0f172a; letter-spacing: 2px; }
              .bold { font-weight: bold; }
              .signature-area { margin-top: 60px; text-align: right; font-size: 12px; }
              .signature-title { font-weight: bold; margin-bottom: 50px; text-decoration: underline; color: #334155; }
            </style>
          </head>
          <body>
            ${headerImg ? `<img class="header-img" src="${headerImg}" alt="Header" />` : `
              <div class="clinic-text-header">
                <h1 class="clinic-name">${clinic?.name || 'CLINIQUE MEDICALE'}</h1>
                <p class="clinic-sub">${clinic?.address || ''} ${clinic?.phone ? '• Tél: ' + clinic.phone : ''} ${clinic?.email ? '• Email: ' + clinic.email : ''}</p>
                ${clinicProfile?.slogan ? `<p class="clinic-sub" style="font-style: italic;">"${clinicProfile.slogan}"</p>` : ''}
              </div>
            `}
            
            <table class="doc-patient-table">
              <tr>
                <td style="width: 50%; background-color: #fafafa;">
                  <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">Prescripteur :</span>
                  <span class="bold" style="font-size: 13px; color: #0f172a;">Dr. ${doctorName}</span><br/>
                  Spécialité : ${specialty}
                </td>
                <td style="width: 50%;">
                  <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">Patient :</span>
                  <span class="bold" style="font-size: 13px; color: #0f172a;">${patient.firstName} ${patient.lastName}</span><br/>
                  Code : ${patient.patientCode}<br/>
                  Sexe : ${patientGender} • Né(e) le : ${formattedBirthDate}<br/>
                  Date : ${formattedDate}
                </td>
              </tr>
            </table>
 
            <div class="title">Ordonnance</div>
 
            <div class="prescription-list" style="margin-top: 25px; margin-bottom: 30px;">
              ${linesHtml}
            </div>

            <div class="signature-area">
              <div class="signature-title">Signature & Cachet du Médecin</div>
              <div style="font-weight: bold; color: #0f172a; margin-top: 40px;">Dr. ${doctorName}</div>
            </div>

            ${footerImg ? `<div style="text-align: center; margin-top: 80px;"><img class="footer-img" src="${footerImg}" alt="Footer" /></div>` : ''}

            <script>
              window.onload = function() {
                window.focus();
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération de l'ordonnance.", "error");
    }
  };

  const printExamRequest = async (examData) => {
    if (!examData || examData.length === 0) {
      showToast("Aucun examen à imprimer", "error");
      return;
    }
    showToast("Préparation de l'impression...", "info");
    try {
      const [clinicRes, patientRes] = await Promise.all([
        clinicService.getMyProfile().catch(() => null),
        patientService.getById(patientId).catch(() => null)
      ]);
      const clinic = clinicRes?.data?.clinic;
      const clinicProfile = clinicRes?.data?.profile;
      const patient = patientRes?.data || { firstName: patientName, lastName: '', patientCode };

      const activePractitioner = practitioners.find(pr => pr.id === selectedConsultation?.practitionerId) || {};
      const doctorName = activePractitioner.fullName || 'Médecin';
      const prSpecParts = (activePractitioner.specialty || '').split('|');
      const specialty = prSpecParts[1] || 'Médecine Générale';

      const headerImg = clinicProfile?.printHeaderA4 || clinicProfile?.printHeaderA5 || '';
      const footerImg = clinicProfile?.printFooterA4 || clinicProfile?.printFooterA5 || '';

      const printWindow = window.open('', '', 'width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (!printWindow) {
        showToast("Le bloqueur de pop-up empêche l'impression. Veuillez l'autoriser.", "warning");
        return;
      }

      const linesHtml = examData.map((line, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 8px; font-weight: bold; font-size: 13px; color: #1e293b; width: 40%;">
            ${idx + 1}. ${line.examName}
          </td>
          <td style="padding: 12px 8px; font-size: 12px; color: #334155; width: 35%;">
            ${line.clinicalInfo || 'Non précisé'}
          </td>
          <td style="padding: 12px 8px; font-size: 12px; color: #475569; width: 25%;">
            ${line.comment || '---'}
          </td>
        </tr>
      `).join('');

      const formattedBirthDate = patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('fr-FR') : '---';
      const patientGender = patient.gender === 'M' ? 'Masculin' : patient.gender === 'F' ? 'Féminin' : '---';
      const formattedDate = new Date(selectedConsultation?.createdAt || Date.now()).toLocaleDateString('fr-FR');

      printWindow.document.write(`
        <html>
          <head>
            <title>Demande d'examens - ${patient.firstName} ${patient.lastName}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; padding: 30px; font-size: 12px; }
              .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
              .footer-img { width: 100%; max-height: 80px; object-fit: contain; margin-top: 30px; }
              .clinic-text-header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 25px; }
              .clinic-name { font-size: 18px; font-weight: 900; color: #0284c7; text-transform: uppercase; margin: 0; }
              .clinic-sub { font-size: 10px; color: #64748b; margin: 4px 0 0 0; font-weight: bold; }
              .doc-patient-table { width: 100%; margin-bottom: 30px; border-collapse: collapse; }
              .doc-patient-table td { padding: 6px 12px; vertical-align: top; border: 1px solid #e2e8f0; }
              .title { text-align: center; font-size: 18px; font-weight: 900; margin: 30px 0; text-transform: uppercase; color: #0f172a; letter-spacing: 1px; }
              .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              .items-table th { background-color: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; }
              .bold { font-weight: bold; }
              .signature-area { margin-top: 60px; text-align: right; font-size: 12px; }
              .signature-title { font-weight: bold; margin-bottom: 50px; text-decoration: underline; color: #334155; }
            </style>
          </head>
          <body>
            ${headerImg ? `<img class="header-img" src="${headerImg}" alt="Header" />` : `
              <div class="clinic-text-header">
                <h1 class="clinic-name">${clinic?.name || 'CLINIQUE MEDICALE'}</h1>
                <p class="clinic-sub">${clinic?.address || ''} ${clinic?.phone ? '• Tél: ' + clinic.phone : ''} ${clinic?.email ? '• Email: ' + clinic.email : ''}</p>
                ${clinicProfile?.slogan ? `<p class="clinic-sub" style="font-style: italic;">"${clinicProfile.slogan}"</p>` : ''}
              </div>
            `}
            
            <table class="doc-patient-table">
              <tr>
                <td style="width: 50%; background-color: #fafafa;">
                  <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">Prescripteur :</span>
                  <span class="bold" style="font-size: 13px; color: #0f172a;">Dr. ${doctorName}</span><br/>
                  Spécialité : ${specialty}
                </td>
                <td style="width: 50%;">
                  <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 4px;">Patient :</span>
                  <span class="bold" style="font-size: 13px; color: #0f172a;">${patient.firstName} ${patient.lastName}</span><br/>
                  Code : ${patient.patientCode}<br/>
                  Sexe : ${patientGender} • Né(e) le : ${formattedBirthDate}<br/>
                  Date : ${formattedDate}
                </td>
              </tr>
            </table>

            <div class="title">Bulletin de Demande d'Examens</div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 40%;">Examen demandé</th>
                  <th style="width: 35%;">Renseignements cliniques</th>
                  <th style="width: 25%;">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                ${linesHtml}
              </tbody>
            </table>

            <div class="signature-area">
              <div class="signature-title">Signature & Cachet du Prescripteur</div>
              <div style="font-weight: bold; color: #0f172a; margin-top: 40px;">Dr. ${doctorName}</div>
            </div>

            ${footerImg ? `<div style="text-align: center; margin-top: 80px;"><img class="footer-img" src="${footerImg}" alt="Footer" /></div>` : ''}

            <script>
              window.onload = function() {
                window.focus();
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de la génération du bulletin d'examen.", "error");
    }
  };

  return (
    <div className="flex h-full min-h-screen bg-slate-50 -mx-10 -my-10">
      {/* Left sidebar - History */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <button onClick={onClose}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-[11px] font-black uppercase tracking-wider transition-colors mb-3">
            <ArrowLeft size={14} /> {backLabel}
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white font-black text-sm shadow">
              {patientName?.charAt(0) || 'P'}
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm leading-tight">{patientName || 'Patient'}</p>
              <p className="text-[10px] text-slate-400 font-mono">{patientCode}</p>
            </div>
          </div>
        </div>

        <div className="p-3 border-b border-slate-100">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Dossier médical</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 size={20} className="animate-spin text-emerald-500" />
            </div>
          ) : history.length === 0 ? (
            <>
              {selectedConsultation && (
                <HistoryItem item={selectedConsultation} practitioners={practitioners} isActive={true} onClick={() => {}} />
              )}
              <p className="text-[10px] text-slate-400 text-center py-4">Aucun historique disponible</p>
            </>
          ) : (
            history.map(item => (
              <HistoryItem
                key={item.id}
                item={item}
                practitioners={practitioners}
                isActive={selectedConsultation?.id === item.id}
                onClick={() => setSelectedConsultation(item)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className={`bg-gradient-to-r ${cfg.gradient} p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm text-white`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Icon size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-black text-lg leading-tight uppercase tracking-wider">{cfg.label}</h3>
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest mt-0.5">Détails de la prestation</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Calendar size={13} className="text-white/80" />
              <div>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">Date</p>
                <p className="text-[10px] font-black mt-0.5">
                  {selectedConsultation?.createdAt ? formatDate(selectedConsultation.createdAt) : '---'}
                  {selectedConsultation?.startTime && ` à ${formatTime(selectedConsultation.startTime)} `}
                </p>
              </div>
            </div>

            {/* Specialty card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Stethoscope size={13} className="text-white/80" />
              <div>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">Spécialité</p>
                <p className="text-[10px] font-black mt-0.5">{selectedSpecialty}</p>
              </div>
            </div>

            {/* Doctor card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Activity size={13} className="text-white/80" />
              <div>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">Médecin</p>
                <p className="text-[10px] font-black mt-0.5">{selectedDoctorName}</p>
              </div>
            </div>

            {/* Status card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <div className="flex flex-col">
                <p className="text-[8px] font-black text-white/50 uppercase tracking-widest leading-none">Statut</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${
  selectedConsultation?.medicalStatus === 'TERMINEE' ? 'bg-emerald-300' :
    selectedConsultation?.medicalStatus === 'DEMARREE' ? 'bg-amber-300' : 'bg-slate-300'
} `} />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {selectedConsultation?.medicalStatus === 'TERMINEE' ? 'Terminée' :
                     selectedConsultation?.medicalStatus === 'DEMARREE' ? 'En cours' : 'En attente'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {isCurrentActive && activeConsultation?.medicalStatus !== 'TERMINEE' && (
            <button onClick={handleEndConsultation} disabled={ending}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-50 transition-colors disabled:opacity-50 shrink-0">
              {ending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
              Terminer la consultation
            </button>
          )}
        </div>

        <div className="p-6 space-y-6 max-w-4xl">
          {/* Content tabs */}
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm no-print">
            {[
              { id: 'constantes', label: 'Constantes', icon: Activity },
              { id: 'consultation', label: nature === 'SEANCES' ? 'Séance' : 'Consultation', icon: Icon },
              { id: 'imagerie', label: 'Imagerie (DICOM)', icon: FileText },
            ].map(({ id, label, icon: TabIcon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider flex-1 justify-center transition-all ${ activeTab === id ? `bg-gradient-to-r ${cfg.gradient} text-white shadow` : 'text-slate-500 hover:bg-slate-50' }`}>
                <TabIcon size={11} /> {label}
              </button>
            ))}
          </div>

          {/* Constantes Tab */}
          {activeTab === 'constantes' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={11} /> Constantes médicales
              </h4>
              <VitalsPanel prestationId={selectedConsultation?.prestationId || prestationId} consultationId={selectedConsultation?.id || consultationId} />
            </div>
          )}

          {/* Imagerie Tab */}
          {activeTab === 'imagerie' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 no-print">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={11} /> Images d'examen (DICOM)
              </h4>
              <DicomFileListPanel
                consultationId={selectedConsultation?.id || consultationId}
                patientName={patientName}
                patientCode={patientCode}
                actName={selectedConsultation?.actName}
              />
            </div>
          )}

          {/* Consultation/Medical Content Tab */}
          {activeTab === 'consultation' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Icon size={11} /> Contenu de la prestation
              </h4>
              {isCurrentActive ? (
                <ConsultationForm
                  consultationId={selectedConsultation?.id || consultationId}
                  prestationId={selectedConsultation?.prestationId || prestationId}
                  patientId={patientId}
                  onSaved={() => showToast('Données enregistrées', 'success')}
                  onPrintPrescription={printPrescription}
                  onPrintExamRequest={printExamRequest}
                />
              ) : (
                /* Read-only view for historical consultations */
                <ReadOnlyConsultationView
                  prestationId={selectedConsultation?.prestationId}
                  consultationId={selectedConsultation?.id}
                  onPrintPrescription={printPrescription}
                  onPrintExamRequest={printExamRequest}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Read-only view for past consultations ────────────────────────────────────
const ReadOnlyConsultationView = ({ prestationId, consultationId, onPrintPrescription, onPrintExamRequest }) => {
  const [note, setNote] = useState(null);
  const [prescription, setPrescription] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(!!(prestationId || consultationId));
  const [prevIds, setPrevIds] = useState({ prestationId, consultationId });

  if (prestationId !== prevIds.prestationId || consultationId !== prevIds.consultationId) {
    setPrevIds({ prestationId, consultationId });
    setLoading(!!(prestationId || consultationId));
  }

  useEffect(() => {
    if (!prestationId && !consultationId) return;
    Promise.all([
      medicalService.getNote(prestationId, consultationId).catch(() => ({ data: null })),
      medicalService.getPrescription(prestationId, consultationId).catch(() => ({ data: null })),
      medicalService.getExamRequests(prestationId, consultationId).catch(() => ({ data: [] })),
    ]).then(([n, p, e]) => {
      setNote(n.data);
      setPrescription(p.data);
      setExams(e.data || []);
    }).finally(() => setLoading(false));
  }, [prestationId, consultationId]);

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 size={20} className="animate-spin text-emerald-400" /></div>;

  return (
    <div className="space-y-5">
      {note && (
        <>
          {[
            { key: 'observations', label: 'Observations' },
            { key: 'diagnostics', label: 'Diagnostic' },
            { key: 'conclusions', label: 'Conclusion' },
          ].filter(f => note[f.key]).map(({ key, label }) => (
            <div key={key}>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 leading-relaxed border border-slate-100">{note[key]}</p>
            </div>
          ))}
        </>
      )}
      {prescription?.lines?.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ordonnance</p>
            {onPrintPrescription && (
              <button type="button" onClick={() => onPrintPrescription(prescription)}
                className="flex items-center gap-1.5 text-[9px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors">
                <Printer size={10} /> Imprimer l'Ordonnance
              </button>
            )}
          </div>
          <div className="space-y-2">
            {prescription.lines.map((line, idx) => (
              <div key={idx} className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                <p className="font-black text-slate-700 text-sm">{line.medication}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{line.dosage} • {line.frequency} • {line.duration}</p>
                {line.comment && <p className="text-[10px] text-slate-400 italic mt-0.5">{line.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {exams.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Examens demandés</p>
            {onPrintExamRequest && (
              <button type="button" onClick={() => onPrintExamRequest(exams)}
                className="flex items-center gap-1.5 text-[9px] font-black text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-lg hover:bg-sky-100 transition-colors">
                <Printer size={10} /> Imprimer le Bulletin
              </button>
            )}
          </div>
          <div className="space-y-2">
            {exams.map((exam, idx) => (
              <div key={idx} className="bg-sky-50 border border-sky-100 rounded-xl p-3">
                <p className="font-black text-slate-700 text-sm">{exam.examName}</p>
                {exam.clinicalInfo && <p className="text-[10px] text-slate-500 mt-0.5">{exam.clinicalInfo}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {!note && !prescription && exams.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <FileText size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold">Aucun contenu médical enregistré</p>
        </div>
      )}
    </div>
  );
};

export default DossierMedicalView;
