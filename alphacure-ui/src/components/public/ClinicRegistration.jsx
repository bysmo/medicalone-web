import React, { useState } from 'react';
import { 
  Building2, ShieldCheck, Mail, Lock, User, 
  MapPin, Phone, CheckCircle, ArrowRight, ArrowLeft, Loader2, Sparkles
} from 'lucide-react';
import { clinicService } from '../../services/api';

const ClinicRegistration = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    address: '',
    country: 'Burkina Faso',
    city: 'Ouagadougou',
    planName: 'BASIC',
    adminUsername: '',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: ''
  });

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slugCode = name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^A-Z0-9]/g, "_")    // Replace special chars/spaces with _
      .slice(0, 30);
    
    setFormData(prev => ({
      ...prev,
      name: name,
      code: slugCode
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await clinicService.register(formData);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || 
        "Une erreur s'est produite lors de l'enregistrement de la clinique. Veuillez vérifier vos données."
      );
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'BASIC',
      name: 'Plan Basique',
      price: '50 000 FCFA',
      period: '/ mois',
      color: 'from-sky-500 to-indigo-500',
      features: ['Jusqu\'à 3 Praticiens', 'Gestion des dossiers patients', 'Facturation simplifiée', '1 clinique incluse']
    },
    {
      id: 'PREMIUM',
      name: 'Plan Professionnel',
      price: '120 000 FCFA',
      period: '/ mois',
      color: 'from-emerald-500 to-teal-500',
      popular: true,
      features: ['Praticiens illimités', 'Dossiers patients avancés', 'Trésorerie & Sessions de caisse', 'Module de remboursement', 'Support prioritaire 24/7']
    },
    {
      id: 'ENTERPRISE',
      name: 'Plan Entreprise',
      price: 'Sur devis',
      period: '',
      color: 'from-purple-600 to-pink-600',
      features: ['Cliniques Multi-sites', 'Hébergement dédié / sur site', 'API & Intégrations sur mesure', 'Gestionnaire de compte dédié']
    }
  ];

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-emerald-500/20 max-w-lg w-full rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10 animate-bounce">
            <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Inscription Enregistrée !</h2>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            Votre demande d'inscription pour la clinique <strong className="text-emerald-400">{formData.name}</strong> a été enregistrée avec succès. 
          </p>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 mb-8 text-left text-xs text-slate-400 space-y-2">
            <p>📋 <strong className="text-white">Statut :</strong> En attente de validation administrative.</p>
            <p>📧 <strong className="text-white">Compte Admin :</strong> Créé sous l'identifiant <span className="font-mono text-sky-400">{formData.adminUsername}</span> (désactivé jusqu'à l'approbation de l'abonnement).</p>
            <p>⚡ <strong className="text-white">Étape suivante :</strong> Dès validation par notre équipe, vous recevrez un e-mail d'activation pour commencer la configuration.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-all"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black font-sans">
      
      {/* Premium Header */}
      <div className="text-center mb-8 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-400 text-xs font-bold mb-4 uppercase tracking-widest">
          <Sparkles size={12} /> AlphaCure SaaS Clinic Portal
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none">
          Enregistrez votre Clinique
        </h1>
        <p className="text-sm text-slate-400 mt-2 font-medium">
          Rejoignez l'écosystème médical de référence et configurez votre espace de soin en 3 étapes.
        </p>
      </div>

      <div className="w-full max-w-4xl bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl -z-10" />
        
        {/* Left Info Panel */}
        <div className="md:w-80 bg-slate-900/60 p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Étapes d'inscription</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${step >= 1 ? 'bg-sky-500/20 border-sky-400 text-sky-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>1</div>
                <div>
                  <p className="text-xs font-bold text-white">Établissement</p>
                  <p className="text-[10px] text-slate-500">Coordonnées de la clinique</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${step >= 2 ? 'bg-sky-500/20 border-sky-400 text-sky-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>2</div>
                <div>
                  <p className="text-xs font-bold text-white">Souscription</p>
                  <p className="text-[10px] text-slate-500">Choix du forfait</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${step >= 3 ? 'bg-sky-500/20 border-sky-400 text-sky-400' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>3</div>
                <div>
                  <p className="text-xs font-bold text-white">Administrateur</p>
                  <p className="text-[10px] text-slate-500">Création des accès d'administration</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-800/60 text-[11px] text-slate-500 leading-relaxed">
            🛡️ Les serveurs AlphaCure garantissent la conformité HIPAA/RGPD de toutes vos données médicales confidentielles.
          </div>
        </div>

        {/* Right Form Wizard */}
        <div className="flex-1 p-8 md:p-10">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl p-4 mb-6 font-bold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            
            {/* STEP 1: Clinic Coordinates */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Building2 className="text-sky-400" size={20} /> Détails de l'établissement
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Nom de la clinique *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name} 
                      onChange={handleNameChange}
                      placeholder="Ex: Clinique AlphaCure Burkina" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Code Unique * (Généré automatiquement)</label>
                    <input 
                      type="text" 
                      required
                      readOnly
                      value={formData.code} 
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Adresse Email *</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="Ex: contact@clinique-alphacure.com" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Téléphone de contact</label>
                    <input 
                      type="text" 
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      placeholder="Ex: +226 25 30 00 00" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Adresse physique</label>
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Ex: Rue de la Chance, Zone du Bois" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Pays</label>
                    <input 
                      type="text" 
                      value={formData.country} 
                      onChange={e => setFormData({...formData, country: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Ville</label>
                    <input 
                      type="text" 
                      value={formData.city} 
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    type="button"
                    disabled={!formData.name || !formData.email}
                    onClick={() => setStep(2)}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-40"
                  >
                    Sélectionner le forfait <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Plan Selection */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">
                    Choisissez votre forfait
                  </h2>
                  <span className="text-xs text-slate-400">Étape 2 sur 3</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((p) => {
                    const isSelected = formData.planName === p.id;
                    return (
                      <div 
                        key={p.id}
                        onClick={() => setFormData({...formData, planName: p.id})}
                        className={`cursor-pointer rounded-2xl p-5 border text-left flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${isSelected ? `bg-slate-900 border-sky-500 shadow-lg shadow-sky-500/5 ring-1 ring-sky-500` : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                      >
                        {p.popular && (
                          <span className="absolute top-2 right-2 bg-emerald-500 text-slate-950 text-[8px] font-black uppercase tracking-wider py-0.5 px-2 rounded-full">
                            Populaire
                          </span>
                        )}
                        <div>
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} opacity-40 mb-3`} />
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">{p.name}</h4>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-lg font-black text-white">{p.price}</span>
                            <span className="text-[10px] text-slate-500">{p.period}</span>
                          </div>
                          
                          <ul className="mt-4 space-y-2 border-t border-slate-800/80 pt-3">
                            {p.features.map((f, i) => (
                              <li key={i} className="text-[10px] text-slate-400 flex items-start gap-1.5 leading-snug">
                                <span className="text-sky-400 shrink-0">✓</span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-800/60">
                  <button 
                    type="button"
                    onClick={() => setStep(1)}
                    className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Retour
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStep(3)}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-500/10 cursor-pointer"
                  >
                    Identifiants de l'administrateur <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Admin Accounts */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="text-sky-400" size={20} /> Administrateur de la clinique
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Prénom de l'admin</label>
                    <input 
                      type="text" 
                      value={formData.adminFirstName} 
                      onChange={e => setFormData({...formData, adminFirstName: e.target.value})}
                      placeholder="Ex: Jean" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Nom de l'admin</label>
                    <input 
                      type="text" 
                      value={formData.adminLastName} 
                      onChange={e => setFormData({...formData, adminLastName: e.target.value})}
                      placeholder="Ex: Kaboré" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Nom d'utilisateur Admin *</label>
                    <input 
                      type="text" 
                      required
                      value={formData.adminUsername} 
                      onChange={e => setFormData({...formData, adminUsername: e.target.value})}
                      placeholder="Ex: jkabore" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Email personnel de l'admin *</label>
                    <input 
                      type="email" 
                      required
                      value={formData.adminEmail} 
                      onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                      placeholder="Ex: j.kabore@clinique-alphacure.com" 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Mot de passe de l'admin *</label>
                  <input 
                    type="password" 
                    required
                    value={formData.adminPassword} 
                    onChange={e => setFormData({...formData, adminPassword: e.target.value})}
                    placeholder="Saisissez un mot de passe sécurisé" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 outline-none focus:border-sky-500 transition-colors"
                  />
                </div>

                <div className="flex justify-between pt-4 border-t border-slate-800/60">
                  <button 
                    type="button"
                    onClick={() => setStep(2)}
                    className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Retour
                  </button>
                  <button 
                    type="submit"
                    disabled={loading || !formData.adminUsername || !formData.adminEmail || !formData.adminPassword}
                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-8 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 cursor-pointer disabled:opacity-40 min-w-[160px]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Enregistrement...
                      </>
                    ) : (
                      <>
                        Finaliser l'inscription
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
          </form>
        </div>
      </div>
      
      {/* Footer Back Link */}
      <div className="mt-6 text-slate-500 text-xs">
        Déjà membre ? <a href="/" className="text-sky-400 hover:underline">Se connecter à l'espace de soin</a>
      </div>

    </div>
  );
};

export default ClinicRegistration;
