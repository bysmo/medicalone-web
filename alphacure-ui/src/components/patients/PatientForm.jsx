import React, { useState } from 'react';
import {
  Plus, UserCircle, Phone, Save, ShieldCheck,
  Loader2, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { InputSection } from '../ui/index';
import { patientService } from '../../services/api';

const PatientFormView = ({ onBack, onSave, patient = null, isViewOnly = false, showToast, onAddInsurer, onAddSubscriber, insurers = [], subscribers = [] }) => {
  const [isInsured, setIsInsured] = useState(patient?.insurer ? true : false);
  const [formData, setFormData] = useState(patient || {
    dossierNumber: 'DOS-' + Math.floor(1000 + Math.random() * 9000),
    ssn: '', firstName: '', lastName: '', gender: 'M', birthDate: '', birthPlace: '',
    phone1: '', phone2: '', phone3: '', email: '', address: '',
    insurer: '', subscriber: '', mainInsured: '', policyNumber: '',
    coverageRate: 0, insuranceStartDate: '', insuranceEndDate: '', isActive: true
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    if (isViewOnly) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewOnly) return;
    setLoading(true);
    const payload = {
      ...formData,
      birthDate: formData.birthDate || null,
      insurer: isInsured ? formData.insurer : null,
      subscriber: isInsured ? formData.subscriber : null,
      mainInsured: isInsured ? formData.mainInsured : null,
      policyNumber: isInsured ? formData.policyNumber : null,
      coverageRate: isInsured ? (parseInt(formData.coverageRate) || 0) : 0,
      insuranceStartDate: isInsured ? (formData.insuranceStartDate || null) : null,
      insuranceEndDate: isInsured ? (formData.insuranceEndDate || null) : null,
    };

    try {
      if (patient?.id) {
        await patientService.update(patient.id, payload);
        showToast("Modification réussie !", "success");
      } else {
        await patientService.create(payload);
        showToast("Enregistrement réussi !", "success");
      }
      onSave();
      onBack();
    } catch (err) {
      console.error("ERREUR:", err.response?.data || err.message);
      showToast("Une erreur est survenue lors de l'opération.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-2 text-slate-600">
        <ArrowLeft size={20} className="cursor-pointer hover:text-sky-600 transition-colors" onClick={onBack} />
        <h2 className="text-lg font-black uppercase tracking-tight text-slate-800">
          {isViewOnly ? 'Consulter Dossier' : (patient ? 'Modifier Dossier' : 'Créer un Dossier')}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
          <div className="bg-sky-700 rounded shadow-lg p-6 text-white grid grid-cols-3 gap-6 items-center">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 block">N° Dossier Physique</label>
              <input type="text" readOnly className="w-full bg-white/10 border border-white/20 rounded p-3 text-lg font-bold outline-none cursor-not-allowed" value={formData.dossierNumber} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 block text-emerald-300">N° Sécurité Sociale</label>
              <input type="text" readOnly={isViewOnly} placeholder="Saisie libre" className={`w-full bg-white/10 border border-white/20 rounded p-3 text-lg font-bold outline-none ${isViewOnly ? 'cursor-not-allowed' : 'focus:bg-white/20'}`} value={formData.ssn || ''} onChange={e => handleChange('ssn', e.target.value)} />
            </div>
            <div className="border-l border-white/10 pl-8 h-full flex flex-col justify-center">
              <div className="flex items-center gap-3 bg-white/10 p-2 rounded border border-white/10">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-widest">{formData.isActive ? 'Actif' : 'Inactif'}</span>
              </div>
            </div>
          </div>

          <InputSection icon={UserCircle} title="État Civil">
            <div className="grid grid-cols-2 gap-4">
              <input required readOnly={isViewOnly} placeholder="Prénom *" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} />
              <input required readOnly={isViewOnly} placeholder="Nom *" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <select disabled={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.gender || 'M'} onChange={e => handleChange('gender', e.target.value)}>
                <option value="M">Masculin</option><option value="F">Féminin</option>
              </select>
              <input type="date" readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value)} />
              <input readOnly={isViewOnly} placeholder="Lieu de naissance" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.birthPlace || ''} onChange={e => handleChange('birthPlace', e.target.value)} />
            </div>
          </InputSection>

          <InputSection icon={Phone} title="Coordonnées">
            <div className="grid grid-cols-3 gap-4">
              <input required readOnly={isViewOnly} placeholder="Téléphone 1 *" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.phone1 || ''} onChange={e => handleChange('phone1', e.target.value)} />
              <input readOnly={isViewOnly} placeholder="Téléphone 2" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.phone2 || ''} onChange={e => handleChange('phone2', e.target.value)} />
              <input readOnly={isViewOnly} placeholder="Urgence (Tél 3)" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.phone3 || ''} onChange={e => handleChange('phone3', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input readOnly={isViewOnly} placeholder="Email" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} />
              <input readOnly={isViewOnly} placeholder="Adresse complète" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none focus:border-sky-500" value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} />
            </div>
          </InputSection>

          <InputSection icon={ShieldCheck} title="Assurance">
            <div className="flex items-center gap-3 mb-6 p-3 bg-sky-50 rounded border border-sky-100">
              <div onClick={() => !isViewOnly && setIsInsured(!isInsured)} className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${isInsured ? 'bg-sky-600' : 'bg-slate-300'} ${isViewOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${isInsured ? 'translate-x-6' : ''}`}></div>
              </div>
              <span className="text-xs font-black uppercase text-slate-700">Patient Assuré ?</span>
            </div>

            {isInsured && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    <select disabled={isViewOnly} className="flex-1 bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none" value={formData.insurer || ''} onChange={e => handleChange('insurer', e.target.value)}>
                      <option value="">-- Assureur --</option>
                      {insurers.map((ins, idx) => <option key={idx} value={ins}>{ins}</option>)}
                    </select>
                    {!isViewOnly && <button type="button" onClick={onAddInsurer} className="p-2 bg-sky-100 text-sky-600 rounded hover:bg-sky-200 shadow-sm transition-all active:scale-95"><Plus size={16} /></button>}
                  </div>
                  <div className="flex gap-2">
                    <select disabled={isViewOnly} className="flex-1 bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none" value={formData.subscriber || ''} onChange={e => handleChange('subscriber', e.target.value)}>
                      <option value="">-- Souscripteur --</option>
                      {subscribers.map((sub, idx) => <option key={idx} value={sub}>{sub}</option>)}
                    </select>
                    {!isViewOnly && <button type="button" onClick={onAddSubscriber} className="p-2 bg-sky-100 text-sky-600 rounded hover:bg-sky-200 shadow-sm transition-all active:scale-95"><Plus size={16} /></button>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <input readOnly={isViewOnly} placeholder="Assuré Principal" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none" value={formData.mainInsured || ''} onChange={e => handleChange('mainInsured', e.target.value)} />
                  <input readOnly={isViewOnly} placeholder="N° Police" className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none" value={formData.policyNumber || ''} onChange={e => handleChange('policyNumber', e.target.value)} />
                  <div className="relative">
                    <input type="number" readOnly={isViewOnly} placeholder="Taux %" className="w-full bg-slate-50 border border-slate-200 rounded p-2 pr-8 text-sm outline-none" value={formData.coverageRate || 0} onChange={e => handleChange('coverageRate', e.target.value)} />
                    <span className="absolute right-3 top-2 text-slate-400 text-xs font-bold">%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Date début couverture</label>
                    <input type="date" readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none" value={formData.insuranceStartDate || ''} onChange={e => handleChange('insuranceStartDate', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block text-rose-400">Date d'expiration</label>
                    <input type="date" readOnly={isViewOnly} className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-sm outline-none border-rose-100" value={formData.insuranceEndDate || ''} onChange={e => handleChange('insuranceEndDate', e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </InputSection>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button type="button" onClick={onBack} className="bg-slate-400 text-white px-8 py-2.5 rounded text-[11px] font-black uppercase hover:bg-slate-500">
              {isViewOnly ? 'Fermer' : 'Annuler'}
            </button>
            {!isViewOnly && (
              <button type="submit" disabled={loading} className="bg-sky-700 text-white px-12 py-2.5 rounded text-[11px] font-black uppercase flex items-center gap-2 hover:bg-sky-800 shadow-lg">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} {patient ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            )}
          </div>
        </form>

        <div className="lg:col-span-1 space-y-4 sticky top-20">
          <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-[#1e293b] text-white p-3 text-[10px] font-black uppercase tracking-widest">Guide Expert</div>
            <div className="p-4 text-[11px] text-slate-500 space-y-4">
              <p className="italic">Le mode "Cash" est activé par défaut. Activez le toggle si le patient présente une carte d'assurance valide.</p>
              {isViewOnly && <p className="text-amber-600 font-bold">Mode lecture seule activé.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientFormView;
