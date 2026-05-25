import React, { useState } from 'react';
import { Award, Plus, Edit3, Trash2, X, Check, Save } from 'lucide-react';
import { packagesStore } from '../../services/packagesStore';

const PackagesList = () => {
  const [packages, setPackages] = useState(() => packagesStore.getPackages());
  const [editingPack, setEditingPack] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [description, setDescription] = useState('');
  const [maxUsers, setMaxUsers] = useState('');
  const [maxActs, setMaxActs] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  const reload = () => {
    setPackages(packagesStore.getPackages());
  };

  const handleOpenAdd = () => {
    setName('');
    setPrice('');
    setBillingCycle('monthly');
    setDescription('');
    setMaxUsers('10');
    setMaxActs('1000');
    setFeaturesText('');
    setShowAddModal(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const featuresList = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const newPack = {
      name,
      price: Number(price),
      billingCycle,
      description,
      maxUsers: Number(maxUsers),
      maxActs: Number(maxActs),
      features: featuresList.length > 0 ? featuresList : ['Fonctionnalité standard']
    };

    packagesStore.addPackage(newPack);
    setShowAddModal(false);
    reload();
  };

  const handleOpenEdit = (pack) => {
    setEditingPack(pack);
    setName(pack.name);
    setPrice(pack.price.toString());
    setBillingCycle(pack.billingCycle);
    setDescription(pack.description);
    setMaxUsers(pack.maxUsers.toString());
    setMaxActs(pack.maxActs.toString());
    setFeaturesText(pack.features.join('\n'));
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    const featuresList = featuresText
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    const updatedPack = {
      ...editingPack,
      name,
      price: Number(price),
      billingCycle,
      description,
      maxUsers: Number(maxUsers),
      maxActs: Number(maxActs),
      features: featuresList.length > 0 ? featuresList : editingPack.features
    };

    packagesStore.updatePackage(updatedPack);
    setEditingPack(null);
    reload();
  };

  const handleDelete = (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir archiver cette offre de souscription ?")) {
      packagesStore.deletePackage(id);
      reload();
    }
  };

  const activePackages = packages.filter(p => p.status === 'ACTIVE');
  const archivedPackages = packages.filter(p => p.status === 'ARCHIVED');

  return (
    <div className="space-y-8">
      {/* Page Header Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Catalogue des Forfaits</h3>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Ajustez vos prix et capacités SaaS</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-500/10 transition-all flex items-center gap-2 cursor-pointer active:scale-95 text-xs"
        >
          <Plus size={14} />
          Créer un Forfait
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activePackages.map((pack) => (
          <div key={pack.id} className="glass-card rounded-3xl border border-slate-200/80 shadow-lg overflow-hidden flex flex-col hover:scale-[1.01] transition-all duration-200 relative group">
            {/* Package details */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex-1 space-y-4">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center">
                  <Award size={20} />
                </div>
                {/* Actions quick controls */}
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenEdit(pack)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-all cursor-pointer shadow-sm"
                    title="Modifier"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button 
                    onClick={() => handleDelete(pack.id)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shadow-sm"
                    title="Archiver"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-base font-extrabold text-slate-800 tracking-tight">{pack.name}</h4>
                <p className="text-[11px] text-slate-400 font-semibold">{pack.description}</p>
              </div>

              <div className="flex items-baseline gap-1 pt-2">
                <span className="text-3xl font-black text-slate-800">{pack.price} €</span>
                <span className="text-xs font-bold text-slate-400">/ mois</span>
              </div>

              {/* Technical Limits */}
              <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100/80 text-[11px] font-bold">
                <div className="bg-slate-100/50 p-2 rounded-lg text-slate-700">
                  <span className="block text-[9px] text-slate-400 uppercase">Utilisateurs Max</span>
                  {pack.maxUsers === 999 ? 'Illimité' : `${pack.maxUsers} max`}
                </div>
                <div className="bg-slate-100/50 p-2 rounded-lg text-slate-700">
                  <span className="block text-[9px] text-slate-400 uppercase">Actes / mois</span>
                  {pack.maxActs === 999999 ? 'Illimité' : `${pack.maxActs.toLocaleString()} actes`}
                </div>
              </div>

              {/* Features checklist */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inclus dans l'offre :</p>
                <ul className="space-y-1.5 text-xs text-slate-600 font-medium">
                  {pack.features.map((feat, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Archived Packages section if any */}
      {archivedPackages.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-200">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Offres Archivées ({archivedPackages.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {archivedPackages.map(pack => (
              <div key={pack.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center text-xs opacity-65">
                <div>
                  <p className="font-extrabold text-slate-700">{pack.name}</p>
                  <p className="text-[10px] text-slate-400">{pack.price} €/mois • {pack.maxUsers} utilisateurs</p>
                </div>
                <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded">Archivé</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Package Modal Backdrop */}
      {(showAddModal || editingPack) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {showAddModal ? 'Créer un Forfait' : 'Modifier le Forfait'}
                </h4>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider -mt-0.5">Configurez les limites du package</p>
              </div>
              <button
                onClick={() => { setShowAddModal(false); setEditingPack(null); }}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={showAddModal ? handleAddSubmit : handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nom du Forfait</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Plan Pro Plus"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tarif (€ / mois)</label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="ex: 450"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Description courte</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex: Idéal pour les centres multi-praticiens..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Utilisateurs Max</label>
                  <input
                    type="number"
                    required
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Actes mensuels Max</label>
                  <input
                    type="number"
                    required
                    value={maxActs}
                    onChange={(e) => setMaxActs(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Liste des avantages (1 par ligne)</label>
                <textarea
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder="ex: Dossiers patients illimités&#10;Télétransmission intégrée&#10;Multi-agendas interactifs"
                  rows={4}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-xs font-semibold text-slate-700 font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingPack(null); }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Save size={13} />
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagesList;
