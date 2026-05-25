import React, { useState, useEffect } from 'react';
import {
  Search, CreditCard, ChevronRight, ChevronLeft,
  Stethoscope, FlaskConical, X, Trash2, Eye, Loader2
} from 'lucide-react';
import { STATUS_CONFIG, LAB_EXAMS, formatCurrency } from '../../data/constants';
import { prestationService, practitionerService, patientService, invoiceService, medicalActService, medicalService } from '../../services/api';
import { filterEligiblePractitioners } from '../../utils/specialtyUtils';
import DataTable from '../ui/DataTable';

const PrestationsView = ({ showToast }) => {
  const [prestations, setPrestations] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [todayOnly, setTodayOnly] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [motif, setMotif] = useState('');
  const [prestPage, setPrestPage] = useState(0);
  const [prestPageSize, setPrestPageSize] = useState(10);
  const [affectModal, setAffectModal] = useState(null);
  const [eligiblePractitioners, setEligiblePractitioners] = useState([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);

  const loadData = async () => {
      setLoading(true);
      try {
          // Load all necessary details in parallel
          const [prestRes, practRes, patientsRes, invoicesRes, actsRes, consultationsRes] = await Promise.all([
              todayOnly ? prestationService.getToday() : prestationService.getAll(statusFilter !== 'all' ? statusFilter.toUpperCase() : null),
              practitionerService.getAll(),
              patientService.search('', 0, 1000),
              invoiceService.getAll(),
              medicalActService.getAll(),
              medicalService.getSeancesConsultations().catch(() => ({ data: [] }))
          ]);

          const loadedPractitioners = practRes.data || [];
          setPractitioners(loadedPractitioners);

          const loadedPatients = patientsRes.data.content || [];
          const loadedInvoices = invoicesRes.data || [];
          const loadedActs = actsRes.data || [];
          const rawConsultations = consultationsRes.data || [];
          const rawPrestations = prestRes.data || [];

          // Map regular prestations (InvoiceLines)
          const mappedPrestations = rawPrestations.map(line => {
              const matchedPractitioner = loadedPractitioners.find(pr => pr.id === line.practitionerId);
              const matchedInvoice = loadedInvoices.find(inv => inv.id === line.invoiceId);
              const matchedPatient = matchedInvoice ? loadedPatients.find(pat => pat.id === matchedInvoice.patientId) : null;
              const matchedAct = loadedActs.find(act => act.id === line.actId);

              return {
                  id: line.id,
                  actId: line.actId,
                  invoiceRef: matchedInvoice ? matchedInvoice.invoiceRef : ('FAC-' + line.invoiceId.substring(0, 6)),
                  patientName: matchedPatient ? matchedPatient.fullName : 'Patient inconnu',
                  patientCode: matchedPatient ? matchedPatient.patientCode : 'PAT-XXXX',
                  actName: line.actName,
                  nature: line.nature,
                  specialty: matchedAct ? matchedAct.specialty : null,
                  price: line.unitPrice * line.quantity,
                  status: line.status.toLowerCase(),
                  practitionerId: line.practitionerId,
                  practitioner: matchedPractitioner ? matchedPractitioner.fullName : null,
                  date: line.createdAt ? line.createdAt.split('T')[0] : '',
                  time: line.createdAt ? line.createdAt.split('T')[1].substring(0, 5) : '00:00',
                  cancelReason: '',
                  abandonReason: '',
                  isLabExam: matchedAct ? matchedAct.isLabExam : false,
                  isConsultation: false
              };
          });

          // Map consultations (scheduled sessions)
          const todayStr = new Date().toISOString().split('T')[0];
          const mappedConsultations = rawConsultations
              .filter(cons => {
                  // Only display consultations of nature SEANCES with status EN_ATTENTE or DEMARREE (not TERMINEE)
                  if (cons.medicalStatus === 'TERMINEE') return false;
                  // If todayOnly, only show those created today
                  if (todayOnly) {
                      return cons.createdAt && cons.createdAt.split('T')[0] === todayStr;
                  }
                  return true;
              })
              .map(cons => {
                  const matchedPractitioner = loadedPractitioners.find(pr => pr.id === cons.practitionerId);
                  const matchedPatient = loadedPatients.find(pat => pat.id === cons.patientId);
                  
                  let invoiceRef = 'SEANCE';
                  let parentLine = null;
                  if (cons.prestationId) {
                      parentLine = rawPrestations.find(line => line.id === cons.prestationId);
                      if (parentLine) {
                          const matchedInvoice = loadedInvoices.find(inv => inv.id === parentLine.invoiceId);
                          if (matchedInvoice) {
                              invoiceRef = matchedInvoice.invoiceRef;
                          }
                      }
                  }

                  const matchedAct = parentLine ? loadedActs.find(act => act.id === parentLine.actId) : null;

                  return {
                      id: cons.id,
                      isConsultation: true,
                      actId: parentLine ? parentLine.actId : null,
                      invoiceRef: invoiceRef,
                      patientName: matchedPatient ? matchedPatient.fullName : 'Patient inconnu',
                      patientCode: matchedPatient ? matchedPatient.patientCode : 'PAT-XXXX',
                      actName: cons.actName, // starts with "Séance:"
                      nature: 'SEANCES',
                      specialty: matchedAct ? matchedAct.specialty : null,
                      price: parentLine ? (parentLine.unitPrice * 1) : 0, // 1 session price
                      status: 'reglee', // already paid
                      practitionerId: cons.practitionerId,
                      practitioner: matchedPractitioner ? matchedPractitioner.fullName : null,
                      date: cons.createdAt ? cons.createdAt.split('T')[0] : '',
                      time: cons.createdAt ? cons.createdAt.split('T')[1].substring(0, 5) : '00:00',
                      cancelReason: '',
                      abandonReason: '',
                      isLabExam: false
                  };
              });

          const mapped = [...mappedPrestations, ...mappedConsultations].filter(p => {
              // Hide laboratory acts from prestations list (processed directly in lab sessions)
              if (p.isLabExam) {
                  return false;
              }
              // Hide parent session package purchases from prestations list (only display actual scheduled sessions starting with "Séance:")
              if (p.nature === 'SEANCES' && !p.actName.startsWith('Séance:')) {
                  return false;
              }
              return true;
          });
          
          setPrestations(mapped);
      } catch (err) {
          console.error("Error loading prestations", err);
          showToast("Erreur de chargement des prestations", "error");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      loadData();
  }, [todayOnly]); // Reload from backend only when date filter changes

  const fmt = formatCurrency;

  const filtered = prestations.filter(p => {
    // 1. Filter by status
    if (statusFilter !== 'all' && p.status !== statusFilter) {
      return false;
    }
    // 2. Filter by search term
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      return p.patientName.toLowerCase().includes(s) || p.actName.toLowerCase().includes(s) || p.invoiceRef.toLowerCase().includes(s) || p.patientCode.toLowerCase().includes(s);
    }
    return true;
  }).sort((a, b) => b.time.localeCompare(a.time)); // Sort desc by time

  const totalFiltered = filtered.length;
  const totalPrestPages = Math.ceil(totalFiltered / prestPageSize) || 1;
  const paginatedData = filtered.slice(prestPage * prestPageSize, (prestPage + 1) * prestPageSize);
  const startEntry = totalFiltered === 0 ? 0 : prestPage * prestPageSize + 1;
  const endEntry = Math.min((prestPage + 1) * prestPageSize, totalFiltered);

  const statusCounts = prestations.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const handleAbandon = async () => {
    if (!motif.trim()) { showToast('Veuillez saisir un motif', 'error'); return; }
    try {
        if (actionModal.prestation.isConsultation) {
            await medicalService.deleteConsultation(actionModal.prestation.id);
        } else {
            await prestationService.abandon(actionModal.prestation.id, { reason: motif, requestedBy: 'Receptionist' });
        }
        showToast('Prestation abandonnée', 'success');
        setActionModal(null); setMotif('');
        loadData();
    } catch (err) {
        showToast('Erreur lors de l\'abandon', 'error');
    }
  };

  const handleAnnuler = async () => {
    if (!motif.trim()) { showToast('Veuillez saisir un motif', 'error'); return; }
    try {
        if (actionModal.prestation.isConsultation) {
            await medicalService.deleteConsultation(actionModal.prestation.id);
        } else {
            await prestationService.cancel(actionModal.prestation.id, { reason: motif, requestedBy: 'Receptionist' });
        }
        showToast('Prestation annulée', 'success');
        setActionModal(null); setMotif('');
        loadData();
    } catch (err) {
        showToast('Erreur lors de l\'annulation', 'error');
    }
  };
  
  const openAffectModal = async (prestation) => {
    setAffectModal(prestation);
    setEligiblePractitioners([]);
    if (!prestation.actId) {
      showToast('Acte médical introuvable sur cette prestation', 'error');
      return;
    }
    setEligibleLoading(true);
    try {
      const res = await prestationService.getEligiblePractitioners(prestation.actId);
      const fromApi = res.data || [];
      const fallback = filterEligiblePractitioners(practitioners, {
        specialty: prestation.specialty,
        actName: prestation.actName,
      });
      setEligiblePractitioners(fromApi.length > 0 ? fromApi : fallback);
    } catch (err) {
      console.error(err);
      setEligiblePractitioners(filterEligiblePractitioners(practitioners, {
        specialty: prestation.specialty,
        actName: prestation.actName,
      }));
    } finally {
      setEligibleLoading(false);
    }
  };

  const handleAffect = async (practitionerId, practitionerName) => {
      try {
          if (affectModal.isConsultation) {
              await medicalService.assignConsultation(affectModal.id, practitionerId);
          } else {
              await prestationService.assign(affectModal.id, { practitionerId, assignedBy: 'Receptionist' });
          }
          showToast(`Prestation affectée à ${practitionerName}`, 'success');
          setAffectModal(null);
          loadData();
      } catch (err) {
          const msg = err.response?.data?.detail || err.response?.data?.message || "Erreur lors de l'affectation";
          showToast(msg, "error");
      }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
        <CreditCard size={28} className="text-sky-600" /> Prestations Patients
      </h2>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setTodayOnly(!todayOnly)}
          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${todayOnly ? 'bg-sky-600 text-white border-sky-600 shadow-lg' : 'bg-white text-slate-500 border-slate-200'}`}>
          {todayOnly ? '📅 Aujourd\'hui' : '📅 Toutes les dates'}
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1"></div>
        <button onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${statusFilter === 'all' ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-500 border border-slate-200'}`}>
          Tous ({Object.values(statusCounts).reduce((a, b) => a + b, 0)})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${statusFilter === key ? `${cfg.bg} ${cfg.text} shadow ${cfg.border} border` : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>
            {cfg.label} ({statusCounts[key] || 0})
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          {
            label: "Heure",
            key: "time",
            render: (p) => <span className="font-mono font-bold text-slate-600">{p.time}</span>
          },
          {
            label: "Facture",
            key: "invoiceRef",
            render: (p) => <span className="font-mono text-sky-600 font-bold text-[11px]">{p.invoiceRef}</span>
          },
          {
            label: "Patient",
            key: "patientName",
            render: (p) => (
              <div>
                <div className="font-bold text-slate-800">{p.patientName}</div>
                <div className="text-[9px] text-slate-400">{p.patientCode}</div>
              </div>
            )
          },
          {
            label: "Acte / Prestation",
            key: "actName",
            render: (p) => <span className="font-bold text-slate-700">{p.actName}</span>
          },
          {
            label: "Nature",
            key: "nature",
            render: (p) => <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold uppercase">{p.nature}</span>
          },
          {
            label: "Montant",
            key: "price",
            render: (p) => <span className="font-black text-slate-800">{fmt(p.price)}</span>
          },
          {
            label: "Praticien",
            key: "practitioner",
            render: (p) => p.practitioner ? <span className="text-emerald-700 font-bold text-[11px]">{p.practitioner}</span> : <span className="text-slate-300 text-[10px] italic">Non affecté</span>
          },
          {
            label: "Statut",
            key: "status",
            render: (p) => {
              const cfg = STATUS_CONFIG[p.status];
              return <span className={`${cfg.bg} ${cfg.text} ${cfg.border} border px-2 py-0.5 rounded text-[9px] font-black uppercase`}>{cfg.label}</span>;
            }
          }
        ]}
        data={paginatedData}
        loading={loading}
        onSearch={(val) => { setSearchTerm(val); setPrestPage(0); }}
        searchPlaceholder="Rechercher patient, acte, facture..."
        entryLabel="prestations"
        extraActions={(p) => (
          <>
            {!p.practitioner && (p.status === 'en_attente' || p.status === 'reglee') && p.nature !== 'EXAMENS' && p.nature !== 'Examens' && (
              <button onClick={() => openAffectModal(p)} title="Affecter praticien" className="p-1.5 bg-white hover:bg-sky-100 text-sky-600 rounded border border-slate-200 shadow-sm transition-colors">
                <Stethoscope size={13} />
              </button>
            )}
            {p.status === 'en_attente' && (
              <button onClick={() => { setActionModal({ type: 'abandon', prestation: p }); setMotif(''); }} title="Abandonner"
                className="p-1.5 bg-white hover:bg-slate-200 text-slate-500 rounded border border-slate-200 shadow-sm transition-colors"><X size={13} /></button>
            )}
            {p.status === 'reglee' && (
              <button onClick={() => { setActionModal({ type: 'annuler', prestation: p }); setMotif(''); }} title="Annuler (remboursement)"
                className="p-1.5 bg-white hover:bg-rose-100 text-rose-600 rounded border border-slate-200 shadow-sm transition-colors"><Trash2 size={13} /></button>
            )}
            <button title="Consulter" className="p-1.5 bg-white hover:bg-emerald-100 text-emerald-600 rounded border border-slate-200 shadow-sm transition-colors"><Eye size={13} /></button>
          </>
        )}
        pagination={{
          currentPage: prestPage,
          totalPages: totalPrestPages,
          totalElements: totalFiltered,
          pageSize: prestPageSize,
          onPageChange: (page) => setPrestPage(page),
          onPageSizeChange: (size) => {
            setPrestPageSize(size);
            setPrestPage(0);
          }
        }}
      />

      {/* Abandon / Cancel Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className={`p-4 flex justify-between items-center ${actionModal.type === 'abandon' ? 'bg-slate-700' : 'bg-rose-700'}`}>
              <h3 className="text-white text-[11px] font-black uppercase tracking-widest">
                {actionModal.type === 'abandon' ? 'Abandonner la prestation' : (actionModal.prestation.nature === 'SEANCES' ? 'Annuler la séance' : 'Annuler la prestation (remboursement)')}
              </h3>
              <button onClick={() => setActionModal(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                <div className="font-bold text-slate-800">{actionModal.prestation.actName}</div>
                <div className="text-[11px] text-slate-500">{actionModal.prestation.patientName} — {actionModal.prestation.invoiceRef}</div>
                <div className="text-[11px] font-bold mt-1">{fmt(actionModal.prestation.price)}</div>
              </div>
              {actionModal.type === 'annuler' && (
                actionModal.prestation.nature === 'SEANCES' ? (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-[11px] text-sky-700 font-bold">
                    ℹ Cette séance a été réglée. L'annulation remettra la séance dans le lot disponible pour programmation (sans remboursement monétaire).
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-700 font-bold">
                    ⚠ Cette prestation a été réglée. L'annulation génèrera une demande de remboursement soumise à validation.
                  </div>
                )
              )}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1">Motif (obligatoire) *</label>
                <textarea value={motif} onChange={e => setMotif(e.target.value)} rows={3} placeholder="Saisissez le motif..."
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-sky-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActionModal(null)} className="flex-1 bg-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase">Annuler</button>
                <button onClick={actionModal.type === 'abandon' ? handleAbandon : handleAnnuler}
                  className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase text-white ${actionModal.type === 'abandon' ? 'bg-slate-700 hover:bg-slate-800' : 'bg-rose-600 hover:bg-rose-700'}`}>
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Affectation Praticien Modal */}
      {affectModal && (() => {
        const isLabExam = affectModal.nature === 'EXAMEN' && LAB_EXAMS.includes(affectModal.actName);
        const eligible = eligiblePractitioners;
        const getWaitingCount = (prId) => prestations.filter(p => p.practitionerId === prId && p.status === 'en_attente').length;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
              <div className="bg-sky-700 p-4 flex justify-between items-center">
                <h3 className="text-white text-[11px] font-black uppercase tracking-widest">Affecter un praticien</h3>
                <button onClick={() => setAffectModal(null)} className="text-white/60 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                  <div className="font-bold text-slate-800">{affectModal.actName}</div>
                  <div className="text-[11px] text-slate-500">{affectModal.patientName} — {affectModal.invoiceRef}</div>
                  <div className="text-[9px] text-slate-400 mt-1">{affectModal.nature} • {affectModal.time}</div>
                </div>
                {isLabExam ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                    <FlaskConical size={28} className="mx-auto mb-2 text-amber-500" />
                    <div className="text-[11px] font-bold text-amber-700">Examen de laboratoire</div>
                    <div className="text-[10px] text-amber-600 mt-1">Cet acte est traité directement au laboratoire. Aucune affectation nécessaire.</div>
                  </div>
                ) : eligibleLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="animate-spin text-sky-500" size={24} /></div>
                ) : eligible.length === 0 ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-center">
                    <div className="text-[11px] font-bold text-rose-600">Aucun médecin de cette spécialité n'est enregistré dans la clinique.</div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Praticiens éligibles ({eligible.length})</div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {eligible.sort((a, b) => getWaitingCount(a.id) - getWaitingCount(b.id)).map(pr => {
                        const waiting = getWaitingCount(pr.id);
                        const loadColor = waiting === 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : waiting <= 2 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-rose-100 text-rose-700 border-rose-200';
                        return (
                          <div key={pr.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 transition-all cursor-pointer group"
                            onClick={() => handleAffect(pr.id, pr.fullName)}>
                            <div>
                              <div className="text-sm font-bold text-slate-800 group-hover:text-sky-700">{pr.fullName}</div>
                              <div className="text-[10px] text-slate-400">{(pr.specialty || '').split('|')[1] || pr.specialty}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`${loadColor} border px-2 py-0.5 rounded text-[9px] font-black`}>
                                {waiting === 0 ? 'Libre' : `${waiting} en attente`}
                              </div>
                              <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ChevronRight size={14} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button onClick={() => setAffectModal(null)} className="w-full bg-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase">Fermer</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PrestationsView;
