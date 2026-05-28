import React, { useState, useEffect } from 'react';
import {
  Building2, Save, Loader2, Plus,
  Landmark, FileText, Printer, Globe
} from 'lucide-react';
import { clinicService, nomenclatureService } from '../../services/api';
import ImageUploadField from '../ui/ImageUploadField';
import { notifyClinicBrandingUpdated } from '../../context/ClinicBrandingContext';

const TABS = [
  { id: 'general', label: 'Général', icon: Building2 },
  { id: 'bank', label: 'Comptes de règlement', icon: Landmark },
  { id: 'fiscal', label: 'Fiscal & juridique', icon: FileText },
  { id: 'print', label: 'Impressions A4/A5', icon: Printer },
  { id: 'web', label: 'Web & réseaux', icon: Globe },
];

const LEGAL_REGIMES = [
  '', 'Entreprise individuelle', 'SARL', 'SA', 'SAS', 'GIE', 'Association', 'ONG', 'Autre'
];

const emptyBankAccount = () => ({
  id: Math.random().toString(36).substring(2, 9),
  name: '',
  type: 'VIREMENT_BANCAIRE',
  primary: false,
  eligibleCaisseCodes: [],
  providerName: '',
  phoneNumber: '',
  bankName: '',
  accountHolder: '',
  accountNumber: '',
  iban: '',
  swift: '',
  branch: '',
});


const emptyForm = () => ({
  name: '',
  phone: '',
  email: '',
  address: '',
  country: '',
  city: '',
  legalName: '',
  slogan: '',
  logoDataUrl: '',
  currencyCode: 'XOF',
  currencySymbol: 'FCFA',
  postalCode: '',
  region: '',
  contactEmail: '',
  contactPhone: '',
  whatsappNumber: '',
  websiteUrl: '',
  legalRegime: '',
  taxIdentificationNumber: '',
  vatNumber: '',
  tradeRegisterNumber: '',
  fiscalYearEnd: '',
  fiscalNotes: '',
  bankAccounts: [emptyBankAccount()],
  printHeaderA4: '',
  printFooterA4: '',
  printHeaderA5: '',
  printFooterA5: '',
  socialLinks: {
    facebook: '',
    instagram: '',
    linkedin: '',
    twitter: '',
    youtube: '',
    tiktok: '',
  },
});

const MaCliniqueView = ({ showToast }) => {
  const [activeSection, setActiveSection] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicCode, setClinicCode] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [caisses, setCaisses] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [res, caissesRes] = await Promise.all([
        clinicService.getMyProfile(),
        nomenclatureService.search('CAISSES_TRESORERIE', 'FINANCES').catch(() => ({ data: [] }))
      ]);
      setCaisses(caissesRes.data || []);
      const { clinic, profile } = res.data || {};
      setClinicCode(clinic?.code || '');
      setForm({
        name: clinic?.name || '',
        phone: clinic?.phone || '',
        email: clinic?.email || '',
        address: clinic?.address || '',
        country: clinic?.country || '',
        city: clinic?.city || '',
        legalName: profile?.legalName || '',
        slogan: profile?.slogan || '',
        logoDataUrl: profile?.logoDataUrl || '',
        currencyCode: profile?.currencyCode || 'XOF',
        currencySymbol: profile?.currencySymbol || 'FCFA',
        postalCode: profile?.postalCode || '',
        region: profile?.region || '',
        contactEmail: profile?.contactEmail || clinic?.email || '',
        contactPhone: profile?.contactPhone || clinic?.phone || '',
        whatsappNumber: profile?.whatsappNumber || '',
        websiteUrl: profile?.websiteUrl || '',
        legalRegime: profile?.legalRegime || '',
        taxIdentificationNumber: profile?.taxIdentificationNumber || '',
        vatNumber: profile?.vatNumber || '',
        tradeRegisterNumber: profile?.tradeRegisterNumber || '',
        fiscalYearEnd: profile?.fiscalYearEnd || '',
        fiscalNotes: profile?.fiscalNotes || '',
        bankAccounts: profile?.bankAccounts?.length
          ? profile.bankAccounts.map(acc => ({
              ...emptyBankAccount(),
              ...acc,
              id: acc.id || Math.random().toString(36).substring(2, 9),
              type: acc.type || 'VIREMENT_BANCAIRE'
            }))
          : [emptyBankAccount()],
        printHeaderA4: profile?.printHeaderA4 || '',
        printFooterA4: profile?.printFooterA4 || '',
        printHeaderA5: profile?.printHeaderA5 || '',
        printFooterA5: profile?.printFooterA5 || '',
        socialLinks: {
          facebook: profile?.socialLinks?.facebook || '',
          instagram: profile?.socialLinks?.instagram || '',
          linkedin: profile?.socialLinks?.linkedin || '',
          twitter: profile?.socialLinks?.twitter || '',
          youtube: profile?.socialLinks?.youtube || '',
          tiktok: profile?.socialLinks?.tiktok || '',
        },
      });
    } catch (err) {
      console.error(err);
      showToast('Impossible de charger le profil de la clinique', 'error');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    load();
  }, []);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateSocial = (field, value) =>
    setForm((f) => ({ ...f, socialLinks: { ...f.socialLinks, [field]: value } }));

  const onImageError = (msg) => showToast(msg, 'error');

  const addBankAccount = () =>
    setForm((f) => ({ ...f, bankAccounts: [...f.bankAccounts, emptyBankAccount()] }));

  const removeBankAccount = (index) =>
    setForm((f) => ({
      ...f,
      bankAccounts: f.bankAccounts.filter((_, i) => i !== index),
    }));

  const updateBank = (index, field, value) =>
    setForm((f) => {
      const accounts = [...f.bankAccounts];
      accounts[index] = { ...accounts[index], [field]: value };
      if (field === 'primary' && value) {
        accounts.forEach((a, i) => { if (i !== index) a.primary = false; });
      }
      return { ...f, bankAccounts: accounts };
    });

  const handleSave = async () => {
    if (!form.name?.trim()) {
      showToast('Le nom de la clinique est obligatoire', 'error');
      return;
    }
    setSaving(true);
    try {
      await clinicService.updateMyProfile(form);
      showToast('Profil de la clinique enregistré');
      notifyClinicBrandingUpdated();
      load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400 outline-none';
  const labelClass = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={24} /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-900 p-6 rounded-2xl shadow-lg text-white">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <Building2 className="text-emerald-300" size={24} /> Ma clinique
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1 font-medium">
            Identité, logo, devise, comptes bancaires, fiscalité, en-têtes d&apos;impression et présence en ligne.
            {clinicCode && (
              <span className="ml-2 font-mono bg-white/10 px-2 py-0.5 rounded">Code : {clinicCode}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-emerald-900 font-black text-xs uppercase tracking-widest hover:bg-emerald-50 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${
              activeSection === id
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
        {activeSection === 'general' && (
          <>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="shrink-0 w-40">
                <ImageUploadField
                  label="Logo"
                  value={form.logoDataUrl}
                  onChange={(v) => update('logoDataUrl', v)}
                  onError={onImageError}
                  previewClass="h-32 w-32"
                />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>Nom affiché *</label>
                  <input className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Raison sociale</label>
                  <input className={inputClass} value={form.legalName} onChange={(e) => update('legalName', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Slogan / devise</label>
                  <input className={inputClass} value={form.slogan} onChange={(e) => update('slogan', e.target.value)} placeholder="Ex. Votre santé, notre priorité" />
                </div>
                <div>
                  <label className={labelClass}>Code devise</label>
                  <input className={inputClass} value={form.currencyCode} onChange={(e) => update('currencyCode', e.target.value)} placeholder="XOF" />
                </div>
                <div>
                  <label className={labelClass}>Symbole devise</label>
                  <input className={inputClass} value={form.currencySymbol} onChange={(e) => update('currencySymbol', e.target.value)} placeholder="FCFA" />
                </div>
                <div>
                  <label className={labelClass}>Téléphone</label>
                  <input className={inputClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input type="email" className={inputClass} value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Adresse</label>
                  <textarea className={inputClass} rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Ville</label>
                  <input className={inputClass} value={form.city} onChange={(e) => update('city', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Région</label>
                  <input className={inputClass} value={form.region} onChange={(e) => update('region', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Code postal</label>
                  <input className={inputClass} value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Pays</label>
                  <input className={inputClass} value={form.country} onChange={(e) => update('country', e.target.value)} />
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'bank' && (
          <div className="space-y-4">
            {form.bankAccounts.map((acc, idx) => (
              <div key={acc.id || idx} className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 shadow-inner animate-in fade-in duration-150">
                <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                  <span className="text-xs font-black text-slate-700 uppercase">Compte de Règlement {idx + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!acc.primary}
                        onChange={(e) => updateBank(idx, 'primary', e.target.checked)}
                      />
                      Principal
                    </label>
                    {form.bankAccounts.length > 1 && (
                      <button type="button" onClick={() => removeBankAccount(idx)} className="text-rose-600 text-xs font-black uppercase hover:text-rose-700">
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nom / Libellé du compte de règlement *</label>
                    <input
                      className={inputClass}
                      value={acc.name || ''}
                      onChange={(e) => updateBank(idx, 'name', e.target.value)}
                      placeholder="Ex: Caisse Principale, Orange Money Clinique, BOA"
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Mode de règlement</label>
                    <select
                      className={inputClass}
                      value={acc.type || 'VIREMENT_BANCAIRE'}
                      onChange={(e) => updateBank(idx, 'type', e.target.value)}
                    >
                      <option value="ESPECES">Espèces (Caisses)</option>
                      <option value="MOBILE_MONEY">Mobile Money</option>
                      <option value="VIREMENT_BANCAIRE">Virement Bancaire</option>
                    </select>
                  </div>
                </div>

                {acc.type === 'ESPECES' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 animate-in slide-in-from-top-1 duration-150">
                    <label className={`${labelClass} mb-2`}>Caisses éligibles *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {caisses.map(c => {
                        const isChecked = (acc.eligibleCaisseCodes || []).includes(c.code);
                        return (
                          <label key={c.code} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer p-2 bg-slate-50 border border-slate-100 rounded-lg hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentCodes = acc.eligibleCaisseCodes || [];
                                const newCodes = e.target.checked
                                  ? [...currentCodes, c.code]
                                  : currentCodes.filter(code => code !== c.code);
                                updateBank(idx, 'eligibleCaisseCodes', newCodes);
                              }}
                            />
                            <div>
                              <span className="block font-bold">{c.string1}</span>
                              <span className="text-[9px] text-slate-400 font-mono">{c.code}</span>
                            </div>
                          </label>
                        );
                      })}
                      {caisses.length === 0 && (
                        <p className="text-xs text-slate-400 italic col-span-2">Aucune caisse configurée dans la nomenclature</p>
                      )}
                    </div>
                  </div>
                )}

                {acc.type === 'MOBILE_MONEY' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white border border-slate-200 rounded-xl p-4 animate-in slide-in-from-top-1 duration-150">
                    <div>
                      <label className={labelClass}>Nom du Fournisseur *</label>
                      <input
                        className={inputClass}
                        value={acc.providerName || ''}
                        onChange={(e) => updateBank(idx, 'providerName', e.target.value)}
                        placeholder="Ex: Orange Money, MTN MoMo, Wave"
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Numéro de Téléphone *</label>
                      <input
                        className={inputClass}
                        value={acc.phoneNumber || ''}
                        onChange={(e) => updateBank(idx, 'phoneNumber', e.target.value)}
                        placeholder="Ex: 77883344"
                        required
                      />
                    </div>
                  </div>
                )}

                {acc.type === 'VIREMENT_BANCAIRE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-slate-200 rounded-xl p-4 animate-in slide-in-from-top-1 duration-150">
                    <div>
                      <label className={labelClass}>Banque</label>
                      <input className={inputClass} value={acc.bankName || ''} onChange={(e) => updateBank(idx, 'bankName', e.target.value)} placeholder="Ex: BOA" />
                    </div>
                    <div>
                      <label className={labelClass}>Titulaire</label>
                      <input className={inputClass} value={acc.accountHolder || ''} onChange={(e) => updateBank(idx, 'accountHolder', e.target.value)} placeholder="Ex: Clinique CTE" />
                    </div>
                    <div>
                      <label className={labelClass}>N° compte</label>
                      <input className={inputClass} value={acc.accountNumber || ''} onChange={(e) => updateBank(idx, 'accountNumber', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Agence</label>
                      <input className={inputClass} value={acc.branch || ''} onChange={(e) => updateBank(idx, 'branch', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>IBAN</label>
                      <input className={inputClass} value={acc.iban || ''} onChange={(e) => updateBank(idx, 'iban', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>SWIFT / BIC</label>
                      <input className={inputClass} value={acc.swift || ''} onChange={(e) => updateBank(idx, 'swift', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addBankAccount}
              className="flex items-center gap-2 text-xs font-bold text-sky-600 uppercase hover:text-sky-700 mt-2"
            >
              <Plus size={14} /> Ajouter un compte de règlement
            </button>
          </div>
        )}

        {activeSection === 'fiscal' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Régime juridique</label>
              <select className={inputClass} value={form.legalRegime} onChange={(e) => update('legalRegime', e.target.value)}>
                {LEGAL_REGIMES.map((r) => (
                  <option key={r} value={r}>{r || '— Sélectionner —'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fin d&apos;exercice fiscal</label>
              <input className={inputClass} placeholder="31/12" value={form.fiscalYearEnd} onChange={(e) => update('fiscalYearEnd', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>N° identification fiscale (NIF / IFU)</label>
              <input className={inputClass} value={form.taxIdentificationNumber} onChange={(e) => update('taxIdentificationNumber', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>N° TVA</label>
              <input className={inputClass} value={form.vatNumber} onChange={(e) => update('vatNumber', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>RCCM / registre du commerce</label>
              <input className={inputClass} value={form.tradeRegisterNumber} onChange={(e) => update('tradeRegisterNumber', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Notes fiscales</label>
              <textarea className={inputClass} rows={3} value={form.fiscalNotes} onChange={(e) => update('fiscalNotes', e.target.value)} />
            </div>
          </div>
        )}

        {activeSection === 'print' && (
          <div className="space-y-8">
            <p className="text-xs text-slate-500">
              Chargez des images pour les en-têtes et pieds de page (factures, reçus, ordonnances). Formats recommandés : PNG ou JPG, fond transparent si possible, max 400 Ko par image.
            </p>
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase mb-4">Format A4</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUploadField
                  label="En-tête A4"
                  wide
                  value={form.printHeaderA4}
                  onChange={(v) => update('printHeaderA4', v)}
                  onError={onImageError}
                  hint="Bandeau haut de page A4"
                  previewClass="h-24"
                />
                <ImageUploadField
                  label="Pied de page A4"
                  wide
                  value={form.printFooterA4}
                  onChange={(v) => update('printFooterA4', v)}
                  onError={onImageError}
                  hint="Bandeau bas de page A4"
                  previewClass="h-24"
                />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-700 uppercase mb-4">Format A5</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUploadField
                  label="En-tête A5"
                  wide
                  value={form.printHeaderA5}
                  onChange={(v) => update('printHeaderA5', v)}
                  onError={onImageError}
                  hint="Bandeau haut de page A5"
                  previewClass="h-20"
                />
                <ImageUploadField
                  label="Pied de page A5"
                  wide
                  value={form.printFooterA5}
                  onChange={(v) => update('printFooterA5', v)}
                  onError={onImageError}
                  hint="Bandeau bas de page A5"
                  previewClass="h-20"
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'web' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelClass}>Site web</label>
              <input className={inputClass} type="url" placeholder="https://..." value={form.websiteUrl} onChange={(e) => update('websiteUrl', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>E-mail contact</label>
              <input type="email" className={inputClass} value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Téléphone contact</label>
              <input className={inputClass} value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>WhatsApp principal (international, ex. +22670123456)</label>
              <input className={inputClass} value={form.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value)} />
            </div>
            {[
              ['facebook', 'Facebook'],
              ['instagram', 'Instagram'],
              ['linkedin', 'LinkedIn'],
              ['twitter', 'X (Twitter)'],
              ['youtube', 'YouTube'],
              ['tiktok', 'TikTok'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className={labelClass}>{label}</label>
                <input
                  className={inputClass}
                  type="url"
                  placeholder="https://"
                  value={form.socialLinks[key] || ''}
                  onChange={(e) => updateSocial(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 text-white font-black text-xs uppercase tracking-widest hover:bg-sky-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
};

export default MaCliniqueView;
