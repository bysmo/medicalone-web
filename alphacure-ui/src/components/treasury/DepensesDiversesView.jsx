import { useState, useEffect } from 'react';
import {
  DollarSign, Landmark, CheckCircle2,
  AlertTriangle, Loader2, Receipt,
  Edit, Trash2, Eye, Check, X, XCircle, Printer
} from 'lucide-react';
import { cashSessionService, nomenclatureService, clinicService } from '../../services/api';
import DataTable from '../ui/DataTable';
import { useClientTable } from '../../hooks/useClientTable';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('fr-FR').format(amount || 0);
};

const DepensesDiversesView = ({ showToast }) => {
  // Authorization states
  const [activeSession, setActiveSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Form & Modal states
  const [categories, setCategories] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [settlementAccounts, setSettlementAccounts] = useState([]);
  const [selectedSettlementAccount, setSelectedSettlementAccount] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('CREATE'); // 'CREATE', 'EDIT', 'VIEW'
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // null, 'VALIDATE', 'CANCEL'

  // Input states
  const [selectedCategory, setSelectedCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('CASH'); // CASH or BANK
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('VIREMENT');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // History states
  const [expenses, setExpenses] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Table filtering
  const { onSearch, paginated, pagination } = useClientTable(expenses, {
    searchKeys: ['label', 'expenseCategory', 'paymentMethod'],
    initialPageSize: 10,
  });

  // Fetch active session and nomenclatures
  useEffect(() => {
    async function initView() {
      setLoadingSession(true);
      try {
        const sessionRes = await cashSessionService.getActive();
        const active = sessionRes.data && sessionRes.data.id ? sessionRes.data : null;
        setActiveSession(active);

        if (active && active.caisseCode === 'CAISSE_PRINCIPALE') {
          // Load categories and profile
          const [catRes, profileRes] = await Promise.all([
            nomenclatureService.search('CATEGORIES_DEPENSES', 'FINANCES').catch(() => ({ data: [] })),
            clinicService.getMyProfile().catch(() => null)
          ]);
          
          setCategories(catRes.data || []);
          if (catRes.data && catRes.data.length > 0) {
            setSelectedCategory(catRes.data[0].code);
          }

          const profile = profileRes?.data?.profile;
          const accounts = profile?.bankAccounts || [];
          setSettlementAccounts(accounts);
          setBankAccounts(accounts);
          
          if (accounts.length > 0) {
            const primaryAcc = accounts.find(a => a.primary) || accounts[0];
            setSelectedSettlementAccount(primaryAcc);
            setSelectedBankAccount(primaryAcc.id || primaryAcc.code || '');
            setSource(primaryAcc.type === 'ESPECES' ? 'CASH' : 'BANK');
          }

          // Fetch current session expenses
          fetchSessionExpenses(active.id);
        }
      } catch (err) {
        console.error("Error initializing DepensesDiversesView", err);
        showToast("Erreur lors de l'initialisation de l'écran.", "error");
      } finally {
        setLoadingSession(false);
      }
    }

    initView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSessionExpenses(sessionId) {
    setLoadingHistory(true);
    try {
      const res = await cashSessionService.getTransactions(sessionId);
      const allTx = res.data || [];
      // Filter only transactions that have an expenseCategory (which indicates a miscellaneous expense)
      const filtered = allTx.filter(t => t.expenseCategory != null);
      setExpenses(filtered);
    } catch (err) {
      console.error("Error loading expenses history", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  const getRawDescription = (tx, cats) => {
    if (!tx || !tx.label) return '';
    const catObj = cats.find(c => c.code === tx.expenseCategory);
    const categoryName = catObj ? catObj.string1 : tx.expenseCategory;
    const prefix = `Dépense [${categoryName}] - `;
    if (tx.label.startsWith(prefix)) {
      return tx.label.substring(prefix.length);
    }
    return tx.label;
  };

  const handleOpenModal = (mode, expense = null) => {
    setModalMode(mode);
    setSelectedExpense(expense);
    setConfirmAction(null);

    const eligible = settlementAccounts.filter(acc => {
      if (acc.type === 'ESPECES') {
        return (acc.eligibleCaisseCodes || []).includes('CAISSE_PRINCIPALE');
      }
      return true;
    });

    if (mode === 'CREATE') {
      if (categories.length > 0) setSelectedCategory(categories[0].code);
      setAmount('');
      const defaultAcc = eligible.find(a => a.primary) || eligible[0] || null;
      setSelectedSettlementAccount(defaultAcc);
      setLabel('');
    } else if (expense) {
      setSelectedCategory(expense.expenseCategory || '');
      setAmount(expense.amount ? expense.amount.toString() : '');
      
      const matchedAcc = settlementAccounts.find(acc => {
        if (acc.type === expense.paymentMethod) {
          if (acc.type === 'ESPECES') return true;
          return acc.id === expense.bankAccountCode;
        }
        return false;
      });
      setSelectedSettlementAccount(matchedAcc || null);
      
      const rawDesc = getRawDescription(expense, categories);
      setLabel(rawDesc);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExpense(null);
    setConfirmAction(null);
  };

  const handlePrintExpenseReceipt = async (expense) => {
    if (!expense) return;
    showToast("Préparation de l'impression...", "info");
    try {
      const clinicRes = await clinicService.getMyProfile().catch(() => null);
      const clinic = clinicRes?.data?.clinic;
      const clinicProfile = clinicRes?.data?.profile;
      const accounts = clinicProfile?.bankAccounts || [];
      const selectedAccount = accounts.find(a => a.id === expense.bankAccountCode);

      let paymentInfoHtml = '';
      if (selectedAccount) {
        if (selectedAccount.type === 'MOBILE_MONEY') {
          paymentInfoHtml = `<span>Mobile Money (${selectedAccount.providerName} - ${selectedAccount.phoneNumber})</span>`;
        } else if (selectedAccount.type === 'VIREMENT_BANCAIRE') {
          paymentInfoHtml = `<span>Virement Bancaire (${selectedAccount.bankName} - N°: ${selectedAccount.accountNumber})</span>`;
        } else if (selectedAccount.type === 'ESPECES') {
          paymentInfoHtml = `<span>Espèces (Caisse : ${activeSession?.caisseCode || 'Caisse'})</span>`;
        }
      } else {
        paymentInfoHtml = `<span>${expense.paymentMethod === 'ESPECES' ? 'Espèces' : expense.paymentMethod}</span>`;
      }

      const headerImg = clinicProfile?.printHeaderA4 || clinicProfile?.printHeaderA5 || '';
      const footerImg = clinicProfile?.printFooterA4 || clinicProfile?.printFooterA5 || '';

      const printWindow = window.open('', '', 'width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (!printWindow) {
        showToast("Le bloqueur de fenêtres contextuelles bloque l'impression. Veuillez l'autoriser.", "warning");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Bon de Dépense - \${expense.id.substring(0, 8)}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; padding: 30px; font-size: 13px; }
              .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
              .title { text-align: center; font-size: 18px; font-weight: bold; margin-top: 10px; margin-bottom: 25px; text-transform: uppercase; color: #be123c; border-bottom: 2px solid #be123c; padding-bottom: 8px; }
              .details-table { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
              .details-table td { padding: 8px 12px; border: 1px solid #e2e8f0; }
              .details-table td.label { font-weight: bold; width: 35%; background-color: #f8fafc; color: #475569; }
              .bold { font-weight: bold; }
              .font-mono { font-family: monospace; }
              .footer-signature { margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
            </style>
          </head>
          <body>
            \${headerImg ? '<img class="header-img" src="' + headerImg + '" alt="Header" />' : '<div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px;">' + (clinic?.name || 'CLINIQUE') + '</div>'}
            
            <div class="title">Bon de Dépense Diverses</div>

            <table class="details-table">
              <tr>
                <td class="label">Date / Heure :</td>
                <td>\${new Date(expense.createdAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">Objet / Descriptif :</td>
                <td class="bold">\${expense.label}</td>
              </tr>
              <tr>
                <td class="label">Mode de règlement :</td>
                <td>\${paymentInfoHtml}</td>
              </tr>
              <tr>
                <td class="label">Montant :</td>
                <td class="bold" style="color: #dc2626; font-size: 15px;">\${formatCurrency(expense.amount)} FCFA</td>
              </tr>
              <tr>
                <td class="label">Session Trésorerie :</td>
                <td class="font-mono">\${activeSession?.sessionRef || 'Session'}</td>
              </tr>
            </table>

            <div class="footer-signature">
              <table style="width: 100%;">
                <tr>
                  <td>
                    <strong>Le Caissier / Agent :</strong><br/>
                    \${activeSession?.cashierUsername || 'Caisse'}<br/><br/>
                    Signature : ______________________
                  </td>
                  <td style="text-align: right; vertical-align: top;">
                    <strong>Bénéficiaire / Destinataire :</strong><br/><br/>
                    Signature : ______________________
                  </td>
                </tr>
              </table>
            </div>

            \${footerImg ? '<div style="text-align: center; margin-top: 50px;"><img class="footer-img" src="' + footerImg + '" alt="Footer" /></div>' : ''}

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
      console.error("Error generating printout", err);
      showToast("Erreur lors de l'impression.", "error");
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (modalMode === 'VIEW' || saving) return;

    if (!amount || parseFloat(amount) <= 0) {
      showToast("Veuillez saisir un montant supérieur à 0.", "error");
      return;
    }
    if (!label.trim()) {
      showToast("Veuillez saisir un libellé descriptif.", "error");
      return;
    }

    const categoryObj = categories.find(c => c.code === selectedCategory);
    const categoryName = categoryObj ? categoryObj.string1 : selectedCategory;

    setSaving(true);
    try {
      const pm = selectedSettlementAccount ? selectedSettlementAccount.type : 'ESPECES';
      const bac = selectedSettlementAccount && selectedSettlementAccount.type !== 'ESPECES' ? selectedSettlementAccount.id : null;

      const payload = {
        type: 'DECAISSEMENT',
        amount: parseFloat(amount),
        label: `Dépense [${categoryName}] - ${label}`,
        paymentMethod: pm,
        bankAccountCode: bac,
        expenseCategory: selectedCategory
      };

      if (modalMode === 'CREATE') {
        await cashSessionService.addTransaction(payload);
        showToast("Dépense en attente créée avec succès !", "success");
      } else if (modalMode === 'EDIT') {
        await cashSessionService.updateTransaction(selectedExpense.id, payload);
        showToast("Dépense en attente modifiée avec succès !", "success");
      }

      handleCloseModal();
      if (activeSession) {
        fetchSessionExpenses(activeSession.id);
      }
    } catch (err) {
      console.error("Error saving expense", err);
      const msg = err.response?.data?.message || "Erreur lors de l'enregistrement de la dépense.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleValidateExpense = async (id) => {
    setSaving(true);
    try {
      await cashSessionService.validateTransaction(id);
      showToast("Dépense validée et solde mis à jour !", "success");
      handleCloseModal();
      if (activeSession) {
        fetchSessionExpenses(activeSession.id);
      }
    } catch (err) {
      console.error("Error validating expense", err);
      const msg = err.response?.data?.message || "Erreur lors de la validation.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelExpense = async (id) => {
    setSaving(true);
    try {
      await cashSessionService.deleteTransaction(id);
      showToast("Dépense annulée avec succès !", "success");
      handleCloseModal();
      if (activeSession) {
        fetchSessionExpenses(activeSession.id);
      }
    } catch (err) {
      console.error("Error cancelling expense", err);
      const msg = err.response?.data?.message || "Erreur lors de l'annulation.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleValidateClick = (expense) => {
    handleOpenModal('VIEW', expense);
    setConfirmAction('VALIDATE');
  };

  const handleCancelClick = (expense) => {
    handleOpenModal('VIEW', expense);
    setConfirmAction('CANCEL');
  };

  const columns = [
    {
      label: 'Date & Heure',
      key: 'createdAt',
      render: (row) => <span className="font-bold text-slate-500">{new Date(row.createdAt).toLocaleString()}</span>
    },
    {
      label: 'Catégorie',
      key: 'expenseCategory',
      render: (row) => {
        const cat = categories.find(c => c.code === row.expenseCategory);
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-100">
            {cat ? cat.string1 : row.expenseCategory}
          </span>
        );
      }
    },
    {
      label: 'Descriptif / Libellé',
      key: 'label',
      render: (row) => <span className="font-bold text-slate-700">{row.label}</span>
    },
    {
      label: 'Source Règlement',
      key: 'paymentMethod',
      render: (row) => {
        const matched = settlementAccounts.find(a => {
          if (a.type === row.paymentMethod) {
            if (a.type === 'ESPECES') return true;
            return a.id === row.bankAccountCode;
          }
          return false;
        });
        if (matched) {
          if (matched.type === 'ESPECES') {
            return (
              <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase">
                <DollarSign size={12} /> {matched.name}
              </span>
            );
          } else {
            return (
              <span className="flex items-center gap-1 text-[10px] font-black text-sky-700 uppercase">
                <Landmark size={12} /> {matched.name}
              </span>
            );
          }
        }
        if (row.paymentMethod === 'ESPECES') {
          return (
            <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase">
              <DollarSign size={12} /> Caisse Principale
            </span>
          );
        } else {
          return (
            <span className="flex items-center gap-1 text-[10px] font-black text-sky-700 uppercase">
              <Landmark size={12} /> {row.bankAccountCode || 'Compte Bancaire'}
            </span>
          );
        }
      }
    },
    {
      label: 'Montant',
      key: 'amount',
      render: (row) => <span className="font-black text-rose-600 font-mono">-{formatCurrency(row.amount)} FCFA</span>
    },
    {
      label: 'Statut',
      key: 'status',
      render: (row) => {
        const status = row.status || 'VALIDATED';
        let badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
        let labelText = "Validé";
        
        if (status === 'PENDING') {
          badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
          labelText = "En attente";
        } else if (status === 'CANCELLED') {
          badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
          labelText = "Annulé";
        } else if (status === 'VALIDATED') {
          badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
          labelText = "Validé";
        }
        
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${badgeStyle}`}>
            {labelText}
          </span>
        );
      }
    }
  ];

  if (loadingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="animate-spin text-sky-600" size={36} />
        <p className="text-slate-500 font-black uppercase text-xs tracking-widest animate-pulse">
          Vérification des habilitations de caisse...
        </p>
      </div>
    );
  }

  const isMainCashier = activeSession && activeSession.caisseCode === 'CAISSE_PRINCIPALE' && activeSession.status === 'OPEN';
  const disabled = modalMode === 'VIEW' || saving;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-900 via-slate-950 to-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-rose-400 shadow-inner">
            <Receipt size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">
              Gestion des Dépenses Diverses
            </h2>
            <p className="text-xs text-rose-200/80 mt-1 font-medium">
              Saisie et suivi des décaissements et dépenses de la clinique par catégorie de nomenclature.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Authorization Guard */}
      {!isMainCashier ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-4">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-full">
            <AlertTriangle size={36} />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Accès Restreint</h3>
          <p className="text-slate-500 text-sm max-w-md">
            Seule la caissière principale disposant d'une session active ouverte sur la <strong className="text-slate-700">CAISSE_PRINCIPALE</strong> est habilitée à enregistrer et gérer les dépenses diverses.
          </p>
          {activeSession ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-600">
              Votre caisse active actuelle : <strong className="text-sky-700 font-mono font-black">{activeSession.caisseCode}</strong>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-rose-600 font-bold">
              Vous n'avez aucune session de caisse ouverte actuellement.
            </div>
          )}
        </div>
      ) : (
        /* 3. DataTable (full width) */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <DataTable
            title="Historique des Dépenses de la Session"
            columns={columns}
            data={paginated}
            loading={loadingHistory}
            onSearch={onSearch}
            searchPlaceholder="Rechercher par objet, catégorie, mode..."
            entryLabel="dépenses"
            pagination={pagination}
            onCreate={() => handleOpenModal('CREATE')}
            createLabel="Nouvelle Dépense"
            extraActions={(row) => (
              <div className="flex items-center gap-1.5 justify-center">
                <button
                  onClick={() => handleOpenModal('VIEW', row)}
                  title="Détails"
                  className="bg-slate-50 hover:bg-slate-100 text-slate-600 p-1.5 rounded-lg border border-slate-200 transition-all flex items-center justify-center"
                >
                  <Eye size={13} />
                </button>
                <button
                  onClick={() => handlePrintExpenseReceipt(row)}
                  title="Imprimer le bon de dépense"
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 transition-all flex items-center justify-center"
                >
                  <Printer size={13} />
                </button>
                {row.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleOpenModal('EDIT', row)}
                      title="Modifier"
                      className="bg-sky-50 hover:bg-sky-100 text-sky-700 p-1.5 rounded-lg border border-sky-200/60 transition-all flex items-center justify-center"
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => handleValidateClick(row)}
                      title="Valider la dépense"
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-1.5 rounded-lg border border-emerald-200/60 transition-all flex items-center justify-center"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => handleCancelClick(row)}
                      title="Annuler la dépense"
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg border border-rose-200/60 transition-all flex items-center justify-center"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            )}
          />
        </div>
      )}

      {/* 4. Operations Modal (Create, View, Edit, Validate, Cancel) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center relative">
              <div className="flex items-center gap-3">
                <Receipt className="text-rose-400" size={20} />
                <h3 className="text-xs font-black uppercase tracking-widest">
                  {modalMode === 'CREATE' && "Nouvelle Dépense"}
                  {modalMode === 'EDIT' && "Modifier la Dépense"}
                  {modalMode === 'VIEW' && "Détails de la Dépense"}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              
              {/* Show Confirmation Banner if validating or cancelling */}
              {confirmAction === 'VALIDATE' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3 shadow-inner">
                  <div className="flex items-start gap-2.5 text-emerald-800">
                    <AlertTriangle className="shrink-0 text-emerald-600 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-emerald-900 block uppercase tracking-wider">Confirmer la validation ?</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                        Êtes-vous sûr de vouloir valider cette dépense de <strong className="font-mono text-emerald-700">{formatCurrency(parseFloat(amount))} FCFA</strong> ?
                        Une fois validée, elle impactera le solde de la caisse ou du compte bancaire, et ne pourra plus être modifiée ou annulée.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      disabled={saving}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={() => handleValidateExpense(selectedExpense.id)}
                      disabled={saving}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {saving ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                      Confirmer la validation
                    </button>
                  </div>
                </div>
              )}

              {confirmAction === 'CANCEL' && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 space-y-3 shadow-inner">
                  <div className="flex items-start gap-2.5 text-rose-800">
                    <AlertTriangle className="shrink-0 text-rose-600 mt-0.5" size={18} />
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-rose-900 block uppercase tracking-wider">Confirmer l'annulation ?</span>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                        Êtes-vous sûr de vouloir annuler cette dépense en attente ?
                        Son statut passera définitivement à <strong className="text-rose-700">ANNULÉ</strong>. Elle n'impactera pas le solde et ne pourra plus être modifiée.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      disabled={saving}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelExpense(selectedExpense.id)}
                      disabled={saving}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      {saving ? <Loader2 className="animate-spin" size={12} /> : <XCircle size={12} />}
                      Confirmer l'annulation
                    </button>
                  </div>
                </div>
              )}

              {/* Form Input fields */}
              {!confirmAction && (
                <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-bold">
                  {/* Category Selection */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
                      Catégorie de Dépense
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      disabled={disabled}
                      className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50 outline-none focus:border-rose-500 text-slate-800 disabled:opacity-75 disabled:cursor-not-allowed"
                      required
                    >
                      {categories.map(cat => (
                        <option key={cat.code} value={cat.code}>
                          {cat.string1}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <option value="">Aucune catégorie disponible</option>
                      )}
                    </select>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
                      Montant de la dépense (FCFA)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      disabled={disabled}
                      placeholder="Saisissez le montant..."
                      className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50 outline-none focus:border-rose-500 text-slate-800 font-mono disabled:opacity-75 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  {/* Compte de Règlement selection */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
                      Compte de Règlement
                    </label>
                    <select
                      value={selectedSettlementAccount?.id || ''}
                      onChange={e => {
                        const acc = settlementAccounts.find(a => a.id === e.target.value);
                        setSelectedSettlementAccount(acc || null);
                      }}
                      disabled={disabled}
                      className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50 outline-none focus:border-rose-500 text-slate-800 disabled:opacity-75 disabled:cursor-not-allowed"
                      required
                    >
                      {settlementAccounts
                        .filter(acc => {
                          if (acc.type === 'ESPECES') {
                            return (acc.eligibleCaisseCodes || []).includes('CAISSE_PRINCIPALE');
                          }
                          return true;
                        })
                        .map(acc => {
                          let labelStr = acc.name;
                          if (acc.type === 'ESPECES') {
                            labelStr = `${acc.name} (Espèces)`;
                          } else if (acc.type === 'MOBILE_MONEY') {
                            labelStr = `${acc.name} (${acc.providerName} - ${acc.phoneNumber})`;
                          } else if (acc.type === 'VIREMENT_BANCAIRE') {
                            labelStr = `${acc.name} (${acc.bankName} - ${acc.accountNumber})`;
                          }
                          return (
                            <option key={acc.id} value={acc.id}>
                              {labelStr}
                            </option>
                          );
                        })}
                      {settlementAccounts.length === 0 && (
                        <option value="">Aucun compte de règlement configuré</option>
                      )}
                    </select>
                  </div>

                  {/* Description input */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">
                      Libellé / Objet de la dépense
                    </label>
                    <textarea
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      disabled={disabled}
                      placeholder="Ex: Achat de ramettes de papier, règlement facture électricité..."
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg p-3 bg-slate-50 outline-none focus:border-rose-500 text-slate-800 leading-normal disabled:opacity-75 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  {/* Action buttons inside form */}
                  <div className="flex gap-3 pt-2">
                    {modalMode === 'VIEW' ? (
                      // VIEW MODE ACTIONS
                      <>
                        {selectedExpense?.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setModalMode('EDIT')}
                              className="flex-1 bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <Edit size={12} /> Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmAction('VALIDATE')}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <Check size={12} /> Valider
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmAction('CANCEL')}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <Trash2 size={12} /> Annuler
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={handleCloseModal}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                        >
                          Fermer
                        </button>
                      </>
                    ) : (
                      // CREATE / EDIT MODE ACTIONS
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (modalMode === 'EDIT') {
                              setModalMode('VIEW');
                            } else {
                              handleCloseModal();
                            }
                          }}
                          disabled={saving}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors"
                        >
                          Retour
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="animate-spin" size={12} />
                              Enregistrement...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={12} />
                              {modalMode === 'CREATE' ? "Créer la dépense" : "Enregistrer"}
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepensesDiversesView;
