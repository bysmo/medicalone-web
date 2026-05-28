import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock,
  Filter, HeartPulse, Loader2, Play, Search, Users, Stethoscope, AlertCircle, Sparkles
} from 'lucide-react';
import { formatCurrency } from '../../data/constants';
import { prestationService, patientService, medicalService, practitionerService, nomenclatureService, medicalActService } from '../../services/api';
import DataTable from '../ui/DataTable';
import { filterEligiblePractitioners } from '../../utils/specialtyUtils';

const SuiviSeancesView = ({ showToast }) => {
  const [activeTab, setActiveTab] = useState('seances'); // 'seances' | 'controles'
  const [sessionsData, setSessionsData] = useState([]);
  const [controlesData, setControlesData] = useState([]);
  const [practitioners, setPractitioners] = useState([]);
  const [controlDelay, setControlDelay] = useState(15); // Default 15 days
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal for Scheduling / Practitioner Selection
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Pagination states
  const [seancePage, setSeancePage] = useState(0);
  const [seancePageSize, setSeancePageSize] = useState(10);
  const [controlPage, setControlPage] = useState(0);
  const [controlPageSize, setControlPageSize] = useState(10);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all clinic prestations, patients, practitioners, and control delay in parallel
      const [prestRes, patientsRes, practRes, delayRes, actsRes] = await Promise.all([
        prestationService.getAll(),
        patientService.search('', 0, 1000),
        practitionerService.getAll(),
        nomenclatureService.search('CONFIG_DELAIS', 'MEDICAL').catch(() => ({ data: [] })),
        medicalActService.getAll().catch(() => ({ data: [] }))
      ]);

      const rawPrestations = prestRes.data || [];
      const patientsList = patientsRes.data.content || [];
      const loadedPractitioners = practRes.data || [];
      setPractitioners(loadedPractitioners);

      // Parse control delay from nomenclature
      if (delayRes.data && delayRes.data.length > 0) {
        const found = delayRes.data.find(n => n.code === 'DELAI_CONTROLE');
        if (found && found.int1) {
          setControlDelay(found.int1);
        }
      }

      const patientsMap = {};
      patientsList.forEach(p => { patientsMap[p.id] = p; });

      // 2. Filter lines
      const parentSessionLines = rawPrestations.filter(line =>
        line.nature === 'SEANCES' &&
        (line.status === 'REGLEE' || line.status === 'EN_ATTENTE') &&
        !line.actName.startsWith('Séance:') &&
        Number(line.unitPrice) > 0
      );

      const parentConsultationLines = rawPrestations.filter(line =>
        line.nature === 'CONSULTATIONS' &&
        line.status === 'REGLEE'
      );

      // 3. Fetch patient medical histories in parallel to count realizations
      const allPatientIds = [
        ...new Set([
          ...parentSessionLines.map(l => l.patientId),
          ...parentConsultationLines.map(l => l.patientId)
        ])
      ].filter(Boolean);

      const histories = await Promise.all(
        allPatientIds.map(async (patId) => {
          try {
            const res = await medicalService.getPatientHistory(patId);
            return { patId, consultations: res.data || [] };
          } catch (e) {
            return { patId, consultations: [] };
          }
        })
      );

      const historiesMap = {};
      histories.forEach(h => { historiesMap[h.patId] = h.consultations; });

      // 4. Map Sessions
      const mappedSessions = parentSessionLines.map(line => {
        const matchedPatient = line.patientId ? patientsMap[line.patientId] : null;
        const patientConsultations = historiesMap[line.patientId] || [];
        const matchedAct = (actsRes?.data || []).find(act => act.id === line.actId);

        // Count consultations linked to this prestation
        const realizedConsultations = patientConsultations.filter(c => c.prestationId === line.id);
        const realized = realizedConsultations.length;
        const totalPurchased = Number(line.quantity || 1);
        const remaining = Math.max(0, totalPurchased - realized);

        return {
          id: line.id,
          actId: line.actId,
          actName: line.actName,
          specialty: matchedAct ? matchedAct.specialty : null,
          patientId: line.patientId,
          patientName: matchedPatient ? matchedPatient.fullName : 'Patient inconnu',
          patientCode: matchedPatient ? matchedPatient.patientCode : 'PAT-XXXX',
          gender: matchedPatient ? matchedPatient.gender : 'M',
          paymentDate: line.createdAt ? line.createdAt.split('T')[0] : '---',
          totalPurchased,
          realized,
          remaining,
          unitPrice: Number(line.unitPrice || 0)
        };
      });

      // 5. Map Controls
      const mappedControles = parentConsultationLines.map(line => {
        const matchedPatient = line.patientId ? patientsMap[line.patientId] : null;
        const patientConsultations = historiesMap[line.patientId] || [];

        // Find consultations linked to this prestation
        const linkedConsultations = patientConsultations.filter(c => c.prestationId === line.id);

        // Calculate age of the paid invoice in days
        const paymentDate = new Date(line.createdAt);
        const today = new Date();
        const diffTime = Math.abs(today - paymentDate);
        const ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const delay = controlDelay;
        const isEligible = ageInDays <= delay;

        return {
          id: line.id,
          actId: line.actId,
          actName: line.actName,
          patientId: line.patientId,
          patientName: matchedPatient ? matchedPatient.fullName : 'Patient inconnu',
          patientCode: matchedPatient ? matchedPatient.patientCode : 'PAT-XXXX',
          gender: matchedPatient ? matchedPatient.gender : 'M',
          paymentDate: line.createdAt ? line.createdAt.split('T')[0] : '---',
          ageInDays,
          daysLeft: Math.max(0, delay - ageInDays),
          isEligible,
          realizationsCount: linkedConsultations.length
        };
      });

      setSessionsData(mappedSessions);
      setControlesData(mappedControles);
    } catch (err) {
      console.error("Error loading session/control tracking data:", err);
      showToast("Erreur lors du chargement des données de suivi.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [controlDelay]);

  const openScheduleModal = (item) => {
    setSelectedItem(item);
    setSelectedPractitionerId('');
    setModalOpen(true);
  };

  const handleConfirmSchedule = async () => {
    if (!selectedPractitionerId) {
      showToast("Veuillez sélectionner un praticien.", "error");
      return;
    }

    setScheduling(true);
    try {
      const isSeance = activeTab === 'seances';

      const payload = {
        prestationId: selectedItem.id,
        patientId: selectedItem.patientId,
        practitionerId: selectedPractitionerId,
        nature: isSeance ? 'SEANCES' : 'CONSULTATIONS',
        actName: isSeance ? `Séance: ${selectedItem.actName}` : `Contrôle: ${selectedItem.actName}`,
        forceNew: "true"
      };

      await medicalService.createConsultation(payload);
      showToast(
        isSeance
          ? "Séance programmée et ajoutée à la file d'attente du praticien avec succès !"
          : "Consultation de contrôle programmée et ajoutée à la file d'attente avec succès !",
        "success"
      );
      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Error scheduling:", err);
      showToast("Erreur lors de la programmation médicale.", "error");
    } finally {
      setScheduling(false);
    }
  };

  // Filter Data
  const getFilteredData = (data) => {
    const term = searchTerm.toLowerCase();
    return data.filter(s =>
      s.patientName.toLowerCase().includes(term) ||
      s.patientCode.toLowerCase().includes(term) ||
      s.actName.toLowerCase().includes(term)
    );
  };

  const filteredSessions = getFilteredData(sessionsData);
  const filteredControles = getFilteredData(controlesData);

  // Statistics
  const totalRemainingSessions = sessionsData.reduce((sum, s) => sum + s.remaining, 0);
  const totalCompletedSessions = sessionsData.reduce((sum, s) => sum + s.realized, 0);
  const eligibleControlsCount = controlesData.filter(c => c.isEligible).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <HeartPulse size={28} className="text-sky-600 animate-pulse" /> Suivi des séances et des contrôles
        </h2>

        {/* Tab Bar */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl border border-slate-300/40">
          <button
            onClick={() => { setActiveTab('seances'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'seances' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Séances de thérapie
          </button>
          <button
            onClick={() => { setActiveTab('controles'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === 'controles' ? 'bg-sky-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Contrôles après consultation
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600"><Users size={24} /></div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Traitements actifs</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {activeTab === 'seances' ? sessionsData.length : controlesData.length}
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 size={24} /></div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
              {activeTab === 'seances' ? "Séances réalisées" : "Contrôles programmés"}
            </div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {activeTab === 'seances' ? totalCompletedSessions : controlesData.reduce((sum, c) => sum + c.realizationsCount, 0)}
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600"><Clock size={24} /></div>
          <div>
            <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
              {activeTab === 'seances' ? "Séances restantes" : `Contrôles éligibles (max ${controlDelay}j)`}
            </div>
            <div className="text-2xl font-black text-slate-800 mt-0.5 font-sans">
              {activeTab === 'seances' ? totalRemainingSessions : eligibleControlsCount}
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'seances' ? (
        <DataTable
          columns={[
            {
              label: "Patient",
              key: "patientName",
              render: (s) => (
                <div>
                  <div className="font-bold text-slate-800">{s.patientName}</div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono">{s.patientCode}</span>
                    <span>•</span>
                    <span className={`px-1 rounded text-[8px] font-black uppercase ${s.gender === 'M' || s.gender === 'Masculin' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                      {s.gender === 'M' || s.gender === 'Masculin' ? 'M' : 'F'}
                    </span>
                  </div>
                </div>
              )
            },
            {
              label: "Date d'achat",
              key: "paymentDate",
              render: (s) => <span className="font-mono font-bold text-slate-600">{s.paymentDate}</span>
            },
            {
              label: "Acte / Forfait",
              key: "actName",
              render: (s) => <span className="font-bold text-slate-700">{s.actName}</span>
            },
            {
              label: "Séances Réalisées",
              key: "realized",
              render: (s) => {
                const completionRate = Math.min(100, Math.round((s.realized / s.totalPurchased) * 100));
                return (
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-700 text-xs">{s.realized} / {s.totalPurchased}</span>
                    <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full transition-all" style={{ width: `${completionRate}%` }}></div>
                    </div>
                  </div>
                );
              }
            },
            {
              label: "Séances Restantes",
              key: "remaining",
              render: (s) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${s.remaining === 0 ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                  {s.remaining} restante(s)
                </span>
              )
            }
          ]}
          data={filteredSessions.slice(seancePage * seancePageSize, (seancePage + 1) * seancePageSize)}
          loading={loading}
          onSearch={(val) => { setSearchTerm(val); setSeancePage(0); }}
          searchPlaceholder="Rechercher patient ou forfait..."
          entryLabel="forfaits"
          extraActions={(s) => (
            <button
              onClick={() => openScheduleModal(s)}
              disabled={s.remaining <= 0}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 shadow-sm"
            >
              <Calendar size={11} />
              Programmer séance
            </button>
          )}
          pagination={{
            currentPage: seancePage,
            totalPages: Math.ceil(filteredSessions.length / seancePageSize) || 1,
            totalElements: filteredSessions.length,
            pageSize: seancePageSize,
            onPageChange: (p) => setSeancePage(p),
            onPageSizeChange: (size) => {
              setSeancePageSize(size);
              setSeancePage(0);
            }
          }}
        />
      ) : (
        <DataTable
          columns={[
            {
              label: "Patient",
              key: "patientName",
              render: (s) => (
                <div>
                  <div className="font-bold text-slate-800">{s.patientName}</div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="font-mono">{s.patientCode}</span>
                    <span>•</span>
                    <span className={`px-1 rounded text-[8px] font-black uppercase ${s.gender === 'M' || s.gender === 'Masculin' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
                      {s.gender === 'M' || s.gender === 'Masculin' ? 'M' : 'F'}
                    </span>
                  </div>
                </div>
              )
            },
            {
              label: "Date Facture",
              key: "paymentDate",
              render: (s) => <span className="font-mono font-bold text-slate-600">{s.paymentDate}</span>
            },
            {
              label: "Acte Initial",
              key: "actName",
              render: (s) => <span className="font-bold text-slate-700">{s.actName}</span>
            },
            {
              label: "Statut Délai",
              key: "isEligible",
              render: (s) => (
                s.isEligible ? (
                  <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-black uppercase inline-flex items-center gap-1">
                    <Sparkles size={10} /> Valide ({s.daysLeft}j restants)
                  </span>
                ) : (
                  <span className="bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-black uppercase inline-flex items-center gap-1">
                    <AlertCircle size={10} /> Expiré ({s.ageInDays}j écoulés)
                  </span>
                )
              )
            },
            {
              label: "Visites / Contrôles",
              key: "realizationsCount",
              render: (s) => (
                <span className="font-black text-slate-600 text-sm">
                  {s.realizationsCount} passage(s)
                </span>
              )
            }
          ]}
          data={filteredControles.slice(controlPage * controlPageSize, (controlPage + 1) * controlPageSize)}
          loading={loading}
          onSearch={(val) => { setSearchTerm(val); setControlPage(0); }}
          searchPlaceholder="Rechercher patient ou consultation..."
          entryLabel="prestations"
          extraActions={(s) => (
            <button
              onClick={() => openScheduleModal(s)}
              disabled={!s.isEligible}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-[10px] font-black uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 shadow-sm"
            >
              <Stethoscope size={11} />
              Programmer contrôle
            </button>
          )}
          pagination={{
            currentPage: controlPage,
            totalPages: Math.ceil(filteredControles.length / controlPageSize) || 1,
            totalElements: filteredControles.length,
            pageSize: controlPageSize,
            onPageChange: (p) => setControlPage(p),
            onPageSizeChange: (size) => {
              setControlPageSize(size);
              setControlPage(0);
            }
          }}
        />
      )}

      {/* Practitioner Selection Modal */}
      {modalOpen && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-sky-700 p-4 flex justify-between items-center text-white">
              <h3 className="text-[11px] font-black uppercase tracking-widest">
                {activeTab === 'seances' ? "Programmer une séance" : "Programmer un contrôle"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-white/60 hover:text-white font-bold">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                <div className="font-bold text-slate-800">{selectedItem.actName}</div>
                <div className="text-[11px] text-slate-500">{selectedItem.patientName} ({selectedItem.patientCode})</div>
                <div className="text-[10px] text-slate-400 mt-1">Facture réglée le {selectedItem.paymentDate}</div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Choisir le Praticien éligible *</label>
                <select
                  value={selectedPractitionerId}
                  onChange={e => setSelectedPractitionerId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-sky-500 bg-white font-medium"
                >
                  <option value="">-- Sélectionner un médecin / praticien --</option>
                  {filterEligiblePractitioners(practitioners, {
                    specialty: selectedItem.specialty,
                    actName: selectedItem.actName
                  }).map(pr => {
                    const specialty = pr.specialty ? pr.specialty.split('|')[1] || pr.specialty : 'Généraliste';
                    return (
                      <option key={pr.id} value={pr.id}>
                        {pr.fullName} ({specialty})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmSchedule}
                  disabled={scheduling || !selectedPractitionerId}
                  className="flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 shadow-md"
                >
                  {scheduling && <Loader2 size={12} className="animate-spin" />}
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuiviSeancesView;
