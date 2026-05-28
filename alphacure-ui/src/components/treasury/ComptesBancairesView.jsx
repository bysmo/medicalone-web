import React, { useState, useEffect } from 'react';
import {
  Landmark, Coins, ArrowUpRight, ArrowDownRight, CheckCircle2,
  AlertTriangle, Loader2, Save, RefreshCw, XCircle, Info, Calendar, User, Check, X
} from 'lucide-react';
import { cashSessionService, clinicService } from '../../services/api';
import DataTable from '../ui/DataTable';
import { useClientTable } from '../../hooks/useClientTable';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR').format(amount || 0);
};

const formatFCFA = (amount) => {
  return `${formatCurrency(amount)} FCFA`;
};

const ComptesBancairesView = ({ showToast }) => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [balances, setBalances] = useState({ caisses: {}, comptes: {} });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingBalanceId, setUpdatingBalanceId] = useState(null);
  const [newActualBalance, setNewActualBalance] = useState('');
  
  // Selected bank account state for detail log
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [clinicProfile, setClinicProfile] = useState(null);
  
  const [processingTxId, setProcessingTxId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, balRes, txRes] = await Promise.all([
        clinicService.getMyProfile().catch(() => null),
        cashSessionService.getBalances().catch(() => ({ data: { caisses: {}, comptes: {} } })),
        cashSessionService.getAllTransactions().catch(() => ({ data: [] }))
      ]);

      const profile = profileRes?.data?.profile || profileRes?.data || null;
      setClinicProfile(profile);
      const accounts = profile?.bankAccounts || [];
      setBankAccounts(accounts);
      setBalances(balRes.data || { caisses: {}, comptes: {} });
      setTransactions(txRes.data || []);
      
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast("Impossible de charger les comptes bancaires et opérations.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateActualBalance = async (accId) => {
    if (newActualBalance === '' || isNaN(Number(newActualBalance))) {
      showToast("Veuillez entrer un montant valide.", "warning");
      return;
    }

    setUpdatingBalanceId(accId);
    try {
      const updatedAccounts = bankAccounts.map(acc => {
        if (acc.id === accId) {
          return { ...acc, actualBalance: Number(newActualBalance) };
        }
        return acc;
      });

      const updatedProfile = {
        ...clinicProfile,
        bankAccounts: updatedAccounts
      };

      await clinicService.updateMyProfile(updatedProfile);
      showToast("Solde réel mis à jour avec succès !", "success");
      setNewActualBalance('');
      await loadData();
    } catch (err) {
      console.error(err);
      showToast("Échec de la mise à jour du solde.", "error");
    } finally {
      setUpdatingBalanceId(null);
    }
  };

  const handleValidateTx = async (txId) => {
    setProcessingTxId(txId);
    try {
      await cashSessionService.validateTransaction(txId);
      showToast("Opération validée et enregistrée en trésorerie.", "success");
      await loadData();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Erreur de validation de la transaction.";
      showToast(errMsg, "error");
    } finally {
      setProcessingTxId(null);
    }
  };

  const handleRejectTx = async (txId) => {
    setProcessingTxId(txId);
    try {
      await cashSessionService.deleteTransaction(txId);
      showToast("Opération rejetée et annulée.", "info");
      await loadData();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors du rejet de la transaction.", "error");
    } finally {
      setProcessingTxId(null);
    }
  };

  const activeAccount = bankAccounts.find(a => a.id === selectedAccountId);
  
  // Filter transactions for the selected account
  const accountTransactions = transactions.filter(t => t.bankAccountCode === selectedAccountId);
  const pendingTxs = accountTransactions.filter(t => t.status === 'PENDING');
  const validatedTxs = accountTransactions.filter(t => t.status === 'VALIDATED');

  const pendingColumns = [
    {
      label: "Date",
      key: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleDateString('fr-FR')
    },
    {
      label: "Type",
      key: "expenseCategory",
      render: (row) => {
        const isDisbursement = row.type === 'DECAISSEMENT';
        const isTransfer = row.expenseCategory === 'TRANSFERT_BANQUE';
        const isReplenish = row.expenseCategory === 'APPROVISIONNEMENT_BANQUE';
        
        let operationLabel = 'Opération Banque';
        if (isTransfer) operationLabel = 'Transfert Caisse';
        else if (isReplenish) operationLabel = 'Approv Caisse';
        else if (row.expenseCategory === 'SALAIRE') operationLabel = 'Salaire';

        return (
          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
            isDisbursement ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {operationLabel}
          </span>
        );
      }
    },
    {
      label: "Justification",
      key: "label",
      render: (row) => <span className="font-bold text-slate-700">{row.label}</span>
    },
    {
      label: "Montant",
      key: "amount",
      render: (row) => {
        const isDisbursement = row.type === 'DECAISSEMENT';
        return (
          <span className={`font-mono font-black ${isDisbursement ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isDisbursement ? '-' : '+'}{formatFCFA(row.amount)}
          </span>
        );
      }
    }
  ];

  const validatedColumns = [
    {
      label: "Date / Heure",
      key: "createdAt",
      render: (row) => new Date(row.createdAt).toLocaleString('fr-FR')
    },
    {
      label: "Type",
      key: "expenseCategory",
      render: (row) => {
        const isDisbursement = row.type === 'DECAISSEMENT';
        const isTransfer = row.expenseCategory === 'TRANSFERT_BANQUE';
        const isReplenish = row.expenseCategory === 'APPROVISIONNEMENT_BANQUE';
        
        let operationLabel = row.paymentMethod || 'Opération';
        if (isTransfer) operationLabel = 'Trsf Caisse';
        else if (isReplenish) operationLabel = 'Approv Caisse';
        else if (row.expenseCategory === 'SALAIRE') operationLabel = 'Salaire';

        return (
          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
            isDisbursement ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100/50 text-emerald-800'
          }`}>
            {operationLabel}
          </span>
        );
      }
    },
    {
      label: "Libellé",
      key: "label",
      render: (row) => (
        <div>
          <span className="font-bold text-slate-700">{row.label}</span>
          {row.receiptNumber && (
            <span className="block font-mono text-[9px] text-slate-400">Reçu: {row.receiptNumber}</span>
          )}
        </div>
      )
    },
    {
      label: "Montant",
      key: "amount",
      render: (row) => {
        const isDisbursement = row.type === 'DECAISSEMENT';
        return (
          <span className={`font-mono font-black ${isDisbursement ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isDisbursement ? '-' : '+'}{formatFCFA(row.amount)}
          </span>
        );
      }
    }
  ];

  const { onSearch: onSearchPending, paginated: paginatedPending, pagination: pendingPagination } = useClientTable(pendingTxs, {
    searchKeys: ['label', 'expenseCategory', 'type'],
    initialPageSize: 10,
  });

  const { onSearch: onSearchValidated, paginated: paginatedValidated, pagination: validatedPagination } = useClientTable(validatedTxs, {
    searchKeys: ['label', 'expenseCategory', 'type', 'paymentMethod'],
    initialPageSize: 10,
  });

  const renderPendingActions = (row) => (
    <div className="flex justify-center gap-1.5">
      <button
        onClick={() => handleValidateTx(row.id)}
        disabled={processingTxId !== null}
        title="Valider l'écriture"
        className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded transition-colors"
      >
        <Check size={14} />
      </button>
      <button
        onClick={() => handleRejectTx(row.id)}
        disabled={processingTxId !== null}
        title="Rejeter l'écriture"
        className="p-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-white p-20 rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-sky-600 mb-3" size={36} />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">
          Chargement des comptes bancaires...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
          <Landmark size={28} className="text-sky-600" /> Comptes de règlement bancaire
        </h2>
        <p className="text-slate-500 text-xs mt-1">
          Visualisez les soldes, effectuez des rapprochements bancaires et validez les transferts ou approvisionnements de caisse.
        </p>
      </div>

      {bankAccounts.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Landmark size={28} />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
              Aucun compte bancaire configuré
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Veuillez configurer les comptes de règlement de la clinique dans les paramètres de la clinique (Onglet Paramétrage &rarr; Ma clinique &rarr; Comptes de règlement).
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Side: Accounts List */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Liste des comptes de règlement
            </h3>

            <div className="space-y-3">
              {bankAccounts.map((acc) => {
                const sysBalance = balances.comptes[acc.id] || 0;
                const actBalance = acc.actualBalance || 0;
                const discrepancy = actBalance - sysBalance;
                const isSelected = selectedAccountId === acc.id;

                let labelText = '';
                if (acc.type === 'ESPECES') {
                  labelText = `Caisses: ${(acc.eligibleCaisseCodes || []).join(', ')}`;
                } else if (acc.type === 'MOBILE_MONEY') {
                  labelText = `${acc.providerName} - ${acc.phoneNumber}`;
                } else {
                  labelText = `${acc.bankName} - ${acc.accountNumber}`;
                }

                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setNewActualBalance('');
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          isSelected ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700'
                        }`}>
                          {acc.type === 'VIREMENT_BANCAIRE' ? 'Virement bancaire' : acc.type === 'MOBILE_MONEY' ? 'Mobile Money' : 'Espèces'}
                        </span>
                        <h4 className="font-black text-sm uppercase mt-2 tracking-tight">
                          {acc.name || 'Compte de règlement'}
                        </h4>
                        <span className={`text-[10px] font-mono block mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                          {labelText}
                        </span>
                      </div>
                      {acc.primary && (
                        <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          Principal
                        </span>
                      )}
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-700/20 divide-y divide-slate-700/10 text-xs space-y-2">
                      <div className="flex justify-between pt-2">
                        <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>Solde Système</span>
                        <span className="font-mono font-bold">{formatFCFA(sysBalance)}</span>
                      </div>
                      <div className="flex justify-between pt-2">
                        <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>Solde Réel</span>
                        <span className="font-mono font-black">{formatFCFA(actBalance)}</span>
                      </div>
                      {discrepancy !== 0 && (
                        <div className="flex justify-between pt-2">
                          <span className={isSelected ? 'text-slate-400' : 'text-slate-500'}>Écart</span>
                          <span className={`font-mono font-bold ${discrepancy < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {discrepancy > 0 ? '+' : ''}{formatFCFA(discrepancy)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Account Details & Operations */}
          {activeAccount && (
            <div className="lg:col-span-2 space-y-6">
              {/* Account Details / Rapprochement Box */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-start pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">
                      {activeAccount.name || 'Détails du compte'}
                    </h3>
                    <p className="text-slate-400 text-xs font-mono mt-0.5">
                      {activeAccount.type === 'VIREMENT_BANCAIRE'
                        ? `${activeAccount.bankName} — A/C: ${activeAccount.accountNumber}`
                        : activeAccount.type === 'MOBILE_MONEY'
                        ? `${activeAccount.providerName} — ${activeAccount.phoneNumber}`
                        : 'Gestion Caisse'
                      }
                    </p>
                  </div>
                </div>

                {/* Balance Update Form */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    Rapprochement & Solde Réel
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Mettre à jour le solde réel (Relevé bancaire)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="Saisissez le solde réel de votre relevé"
                          value={newActualBalance}
                          onChange={(e) => setNewActualBalance(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-sky-500 bg-white"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          FCFA
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleUpdateActualBalance(activeAccount.id)}
                      disabled={updatingBalanceId === activeAccount.id || newActualBalance === ''}
                      className="py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
                    >
                      {updatingBalanceId === activeAccount.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      Mettre à jour le solde
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Transactions Section */}
              <DataTable
                title={`Opérations en attente de validation par le Manager (${pendingTxs.length})`}
                columns={pendingColumns}
                data={paginatedPending}
                loading={false}
                pagination={pendingPagination}
                onSearch={onSearchPending}
                extraActions={renderPendingActions}
                searchPlaceholder="Rechercher justification..."
              />

              {/* Bank Journal / Validated Transactions */}
              <DataTable
                title="Journal de Banque (Opérations validées)"
                columns={validatedColumns}
                data={paginatedValidated}
                loading={false}
                pagination={validatedPagination}
                onSearch={onSearchValidated}
                searchPlaceholder="Rechercher libellé..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComptesBancairesView;
