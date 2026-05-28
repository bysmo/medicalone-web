import { useState, useEffect, useRef } from 'react';
import {
  Activity, Landmark, Key, Unlock, Lock, AlertTriangle, FileText, CheckCircle2,
  ArrowUpRight, ArrowDownRight, RefreshCw, Printer, PlusCircle, Check, Trash2, XCircle
} from 'lucide-react';
import { cashSessionService, nomenclatureService, invoiceService, practitionerService, patientService, clinicService, prestationService } from '../../services/api';
import DataTable from '../ui/DataTable';
import { useClientTable } from '../../hooks/useClientTable';

const MaSessionView = ({ showToast, initialTab = 'ma-session' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [activeSession, setActiveSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [caisses, setCaisses] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]); // list of configured settlement accounts
  const [selectedBankAccount, setSelectedBankAccount] = useState(''); // ID of selected settlement account
  const [selectedSettlementAccount, setSelectedSettlementAccount] = useState(null);


  // Session Opening state
  const [selectedCaisse, setSelectedCaisse] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [opening, setOpening] = useState(false);

  // Session Closing state
  const [actualAmount, setActualAmount] = useState('');
  const [justification, setJustification] = useState('');
  const [closing, setClosing] = useState(false);
  const [lastClosedSession, setLastClosedSession] = useState(null);
  const [closureStep, setClosureStep] = useState('INPUT'); // 'INPUT', 'WARNING', 'JUSTIFY'

  // Transactions list
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Direct Transaction Form state
  const [txType, setTxType] = useState('DECAISSEMENT');
  const [txAmount, setTxAmount] = useState('');
  const [txLabel, setTxLabel] = useState('');
  const [savingTx, setSavingTx] = useState(false);

  // Bank Transfer Form state
  const [bankTxType, setBankTxType] = useState('TRANSFERT_BANQUE');
  const [bankTxAmount, setBankTxAmount] = useState('');
  const [bankTxLabel, setBankTxLabel] = useState('');
  const [selectedBankAccountIdForTransfer, setSelectedBankAccountIdForTransfer] = useState('');
  const [savingBankTx, setSavingBankTx] = useState(false);

  // Pending Invoices
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const { onSearch: onSearchInvoices, paginated: paginatedInvoices, pagination: invoicesPagination } = useClientTable(pendingInvoices, {
    searchKeys: ['invoiceRef', 'bordereauCode'],
    initialPageSize: 10,
  });

  // Payment Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [moyenPaiement, setMoyenPaiement] = useState('ESPECES');
  const [montantRecu, setMontantRecu] = useState('');
  const [payingInvoice, setPayingInvoice] = useState(false);

  // Active Session Encaissements
  const activeEncaissements = transactions.filter(t => t.type === 'ENCAISSEMENT');
  const { onSearch: onSearchEncaissements, paginated: paginatedEncaissements, pagination: encaissementsPagination } = useClientTable(activeEncaissements, {
    searchKeys: ['label', 'referenceId'],
    initialPageSize: 10,
  });

  // Sessions History
  const [sessionsHistory, setSessionsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { onSearch: onSearchHistory, paginated: paginatedHistory, pagination: historyPagination } = useClientTable(sessionsHistory, {
    searchKeys: ['sessionRef', 'caisseCode', 'cashierUsername'],
    initialPageSize: 10,
  });

  // Refunds (Cancellation Requests)
  const [pendingRefunds, setPendingRefunds] = useState([]);
  const [loadingRefunds, setLoadingRefunds] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [processingRefund, setProcessingRefund] = useState(false);

  const { onSearch: onSearchRefunds, paginated: paginatedRefunds, pagination: refundsPagination } = useClientTable(pendingRefunds, {
    searchKeys: ['actName', 'patientName', 'invoiceRef', 'reason'],
    initialPageSize: 10,
  });

  // Ref for print
  const printRef = useRef(null);

  // Asynchronous Fetch Helpers defined before useEffect
  async function fetchActiveSession() {
    setLoadingSession(true);
    try {
      const res = await cashSessionService.getActive();
      setActiveSession(res.data);
      setLastClosedSession(null);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setActiveSession(null);
      } else {
        console.error("Error fetching active session", err);
      }
    } finally {
      setLoadingSession(false);
    }
  }

  async function fetchCaisses() {
    try {
      const [res, sessionsRes, profileRes] = await Promise.all([
        nomenclatureService.search('CAISSES_TRESORERIE', 'FINANCES'),
        cashSessionService.getAll().catch(() => ({ data: [] })),
        clinicService.getMyProfile().catch(() => null)
      ]);
      const caissesList = res.data || [];
      const sessions = sessionsRes.data || [];
      const profile = profileRes?.data?.profile;
      const bankAccountsList = profile?.bankAccounts || [];
      
      setBankAccounts(bankAccountsList);
      if (bankAccountsList.length > 0) {
        const primaryAcc = bankAccountsList.find(a => a.primary) || bankAccountsList[0];
        setSelectedBankAccount(primaryAcc.id || primaryAcc.code || '');
        setSelectedSettlementAccount(primaryAcc);
      }


      // Get codes of all currently open cash sessions
      const openCaisseCodes = sessions
        .filter(s => s.status === 'OPEN')
        .map(s => s.caisseCode);

      // Filter out any cash register that is already open
      const caissesListFiltered = caissesList.filter(c => !openCaisseCodes.includes(c.code));
      setCaisses(caissesListFiltered);

      let matchedCode = null;
      try {
        const practitionerRes = await practitionerService.getMe();
        const practitioner = practitionerRes?.data;
        if (practitioner && practitioner.specialty) {
          const parts = practitioner.specialty.split('|');
          if (parts[0] === 'CAISSIER' && parts[1]) {
            const assignedCaisseName = parts[1].trim().toLowerCase();
            const found = caissesListFiltered.find(c =>
              c.string1?.trim().toLowerCase() === assignedCaisseName ||
              c.code?.trim().toLowerCase() === assignedCaisseName
            );
            if (found) {
              matchedCode = found.code;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching practitioner details", err);
      }

      if (matchedCode) {
        setSelectedCaisse(matchedCode);
      } else if (caissesListFiltered.length > 0) {
        setSelectedCaisse(caissesListFiltered[0].code);
      }
    } catch (err) {
      console.error("Error loading caisses", err);
    }
  }

  async function fetchTransactions(sessionId) {
    setLoadingTransactions(true);
    try {
      const res = await cashSessionService.getTransactions(sessionId);
      setTransactions(res.data || []);
    } catch (err) {
      console.error("Error loading transactions", err);
    } finally {
      setLoadingTransactions(false);
    }
  }

  async function fetchPendingInvoices() {
    setLoadingInvoices(true);
    try {
      const res = await invoiceService.getAll();
      const allInvoices = res.data || [];
      // filter only pending
      setPendingInvoices(allInvoices.filter(inv => inv.status === 'PENDING' || inv.status === 'PARTIAL'));
    } catch (err) {
      console.error("Error loading invoices", err);
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function fetchSessionsHistory() {
    setLoadingHistory(true);
    try {
      const res = await cashSessionService.getAll();
      setSessionsHistory(res.data || []);
    } catch (err) {
      console.error("Error loading sessions history", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function fetchPendingRefunds() {
    setLoadingRefunds(true);
    try {
      const res = await prestationService.getPendingCancellations();
      setPendingRefunds(res.data || []);
    } catch (err) {
      console.error("Error loading pending refunds", err);
    } finally {
      setLoadingRefunds(false);
    }
  }

  const handleApproveRefund = async (refundId) => {
    setProcessingRefund(true);
    try {
      await prestationService.approveRefund(refundId, {});
      showToast("Remboursement validé avec succès !", "success");
      setSelectedRefund(null);
      fetchPendingRefunds();
      if (activeSession) {
        fetchTransactions(activeSession.id);
        fetchActiveSession();
      }
    } catch (err) {
      console.error("Error approving refund", err);
      const errMsg = err.response?.data?.message || "Erreur lors de la validation du remboursement.";
      showToast(errMsg, "error");
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleRejectRefund = async (refundId) => {
    setProcessingRefund(true);
    try {
      await prestationService.rejectRefund(refundId, {});
      showToast("Demande de remboursement rejetée.", "info");
      setSelectedRefund(null);
      fetchPendingRefunds();
    } catch (err) {
      console.error("Error rejecting refund", err);
      showToast("Erreur lors du rejet du remboursement.", "error");
    } finally {
      setProcessingRefund(false);
    }
  };


  // UseEffects using the fetch helpers
  useEffect(() => {
    setTimeout(() => {
      setActiveTab(initialTab);
    }, 0);
  }, [initialTab]);

  useEffect(() => {
    setTimeout(() => {
      fetchActiveSession();
      fetchCaisses();
    }, 0);
  }, []);

  useEffect(() => {
    if (activeSession) {
      setTimeout(() => {
        fetchTransactions(activeSession.id);
      }, 0);
    }
  }, [activeSession]);

  useEffect(() => {
    setTimeout(() => {
      if (activeTab === 'a-encaisser') {
        fetchPendingInvoices();
      } else if (activeTab === 'encaissements') {
        fetchSessionsHistory();
      } else if (activeTab === 'remboursements') {
        fetchPendingRefunds();
      }
    }, 0);
  }, [activeTab]);

  const handleOpenSession = async (e) => {
    e.preventDefault();
    if (!selectedCaisse) {
      showToast("Veuillez sélectionner une caisse.", "error");
      return;
    }
    setOpening(true);
    try {
      const res = await cashSessionService.open({
        caisseCode: selectedCaisse,
        openingBalance: parseFloat(openingBalance) || 0
      });
      setActiveSession(res.data);
      showToast("Session de caisse ouverte avec succès !", "success");
      setOpeningBalance('');
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Erreur lors de l'ouverture de la session.";
      showToast(msg, "error");
    } finally {
      setOpening(false);
    }
  };

  const handleStartClosure = (e) => {
    if (e) e.preventDefault();
    if (!actualAmount) {
      showToast("Veuillez saisir le montant physique en main.", "error");
      return;
    }
    const actual = parseFloat(actualAmount);
    const expected = calculatedBalance;
    const diff = actual - expected;

    if (Math.abs(diff) < 0.01) {
      executeClosure(false);
    } else {
      setClosureStep('WARNING');
      showToast("Écart constaté entre le montant saisi et le montant machine !", "warning");
    }
  };

  const executeClosure = async (force = false, justificationText = null) => {
    setClosing(true);
    try {
      const res = await cashSessionService.close(activeSession.id, {
        actualAmount: parseFloat(actualAmount),
        forceClose: force,
        justification: justificationText
      });

      if (res.data.success) {
        const closedSession = res.data.session;
        setLastClosedSession(closedSession);
        setActiveSession(null);
        setTransactions([]);
        setActualAmount('');
        setJustification('');
        setClosureStep('INPUT');
        showToast("Caisse clôturée avec succès !", "success");
        // Automatically print closing slip
        setTimeout(() => {
          printClosingSlipDirect(closedSession);
        }, 300);
      } else {
        showToast("Erreur lors de la clôture de la caisse.", "error");
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Erreur lors de la clôture de la caisse.";
      showToast(msg, "error");
    } finally {
      setClosing(false);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!txAmount || parseFloat(txAmount) <= 0) {
      showToast("Veuillez entrer un montant valide supérieur à 0.", "error");
      return;
    }
    if (!txLabel.trim()) {
      showToast("Veuillez entrer un libellé.", "error");
      return;
    }
    setSavingTx(true);
    try {
      const pm = selectedSettlementAccount ? selectedSettlementAccount.type : 'ESPECES';
      const bac = selectedSettlementAccount && selectedSettlementAccount.type !== 'ESPECES' ? selectedSettlementAccount.id : null;
      await cashSessionService.addTransaction({
        type: txType,
        amount: parseFloat(txAmount),
        label: txLabel,
        paymentMethod: pm,
        bankAccountCode: bac
      });
      showToast("Opération enregistrée avec succès !", "success");
      setTxAmount('');
      setTxLabel('');
      fetchActiveSession(); // refresh expected amounts
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'enregistrement de l'opération.", "error");
    } finally {
      setSavingTx(false);
    }
  };

  const handleBankTransferSubmit = async (e) => {
    e.preventDefault();
    if (!bankTxAmount || parseFloat(bankTxAmount) <= 0) {
      showToast("Veuillez entrer un montant valide supérieur à 0.", "error");
      return;
    }
    if (!selectedBankAccountIdForTransfer) {
      showToast("Veuillez sélectionner un compte bancaire.", "error");
      return;
    }
    if (!bankTxLabel.trim()) {
      showToast("Veuillez spécifier le motif.", "error");
      return;
    }

    setSavingBankTx(true);
    try {
      const type = bankTxType === 'TRANSFERT_BANQUE' ? 'DECAISSEMENT' : 'ENCAISSEMENT';
      const label = bankTxType === 'TRANSFERT_BANQUE'
        ? `Transfert Caisse -> Banque : ${bankTxLabel}`
        : `Approvisionnement Banque -> Caisse : ${bankTxLabel}`;

      await cashSessionService.addTransaction({
        type: type,
        amount: parseFloat(bankTxAmount),
        label: label,
        paymentMethod: 'VIREMENT',
        bankAccountCode: selectedBankAccountIdForTransfer,
        expenseCategory: bankTxType
      });

      showToast("Opération soumise en validation auprès du manager.", "success");
      setBankTxAmount('');
      setBankTxLabel('');
      fetchActiveSession();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Erreur lors de la soumission de l'opération.";
      showToast(errMsg, "error");
    } finally {
      setSavingBankTx(false);
    }
  };

  const handleCancelBankTransfer = async (txId) => {
    try {
      await cashSessionService.deleteTransaction(txId);
      showToast("Opération annulée avec succès.", "info");
      fetchActiveSession();
    } catch (err) {
      console.error(err);
      showToast("Erreur lors de l'annulation de l'opération.", "error");
    }
  };

  const handlePayInvoice = (invoice) => {
    if (!activeSession) {
      showToast("Veuillez d'abord ouvrir une session de caisse.", "error");
      return;
    }
    setSelectedInvoice(invoice);
    
    // Filter eligible accounts:
    // ESPECES accounts must be eligible for activeSession.caisseCode
    const eligible = bankAccounts.filter(acc => {
      if (acc.type === 'ESPECES') {
        return (acc.eligibleCaisseCodes || []).includes(activeSession.caisseCode);
      }
      return true;
    });
    
    const defaultAcc = eligible.find(a => a.primary) || eligible[0] || null;
    setSelectedSettlementAccount(defaultAcc);
    setMoyenPaiement(defaultAcc ? defaultAcc.type : 'ESPECES');
    setSelectedBankAccount(defaultAcc ? defaultAcc.id : '');
    setMontantRecu(invoice.patientAmount.toString());
    setIsPaymentModalOpen(true);
  };

  const handlePayInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const recu = parseFloat(montantRecu) || 0;
    if (recu < selectedInvoice.patientAmount) {
      showToast("Le montant reçu doit être supérieur ou égal au montant net à payer.", "error");
      return;
    }

    setPayingInvoice(true);
    try {
      const pm = selectedSettlementAccount ? selectedSettlementAccount.type : 'ESPECES';
      const bac = selectedSettlementAccount && selectedSettlementAccount.type !== 'ESPECES' ? selectedSettlementAccount.id : null;
      await cashSessionService.payInvoice(selectedInvoice.id, {
        paymentMethod: pm,
        bankAccountCode: bac
      });
      showToast(`Facture ${selectedInvoice.invoiceRef} encaissée avec succès !`, "success");
      const paidInvoiceId = selectedInvoice.id;
      setIsPaymentModalOpen(false);
      setSelectedInvoice(null);
      setMontantRecu('');
      fetchPendingInvoices();
      fetchActiveSession();
      // Trigger printing receipt
      handlePrintReceipt(paidInvoiceId, pm, bac);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Erreur lors de l'encaissement de la facture.";
      showToast(msg, "error");
    } finally {
      setPayingInvoice(false);
    }
  };


  const handlePrintSlip = () => {
    if (lastClosedSession) {
      printClosingSlipDirect(lastClosedSession);
    }
  };

  async function printClosingSlipDirect(sessionData) {
    if (!sessionData) return;
    try {
      showToast("Génération du bordereau...", "info");
      const [clinicRes, txRes] = await Promise.all([
        clinicService.getMyProfile().catch(() => null),
        cashSessionService.getTransactions(sessionData.id).catch(() => ({ data: [] }))
      ]);

      const clinic = clinicRes?.data?.clinic;
      const clinicProfile = clinicRes?.data?.profile;
      const sessionTx = txRes.data || [];

      const totalIn = sessionTx.filter(t => t.type === 'ENCAISSEMENT').reduce((sum, t) => sum + Number(t.amount), 0);
      const totalOut = sessionTx.filter(t => t.type === 'DECAISSEMENT').reduce((sum, t) => sum + Number(t.amount), 0);

      const headerImg = clinicProfile?.printHeaderA4 || clinicProfile?.printHeaderA5 || '';
      const footerImg = clinicProfile?.printFooterA4 || clinicProfile?.printFooterA5 || '';

      const printWindow = window.open('', '', 'width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (!printWindow) {
        showToast("Le bloqueur de fenêtres bloque l'impression du bordereau.", "warning");
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Bordereau de Clôture - ${sessionData.sessionRef}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; padding: 30px; font-size: 13px; }
              .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
              .title { text-align: center; font-size: 18px; font-weight: bold; margin-top: 10px; margin-bottom: 20px; text-transform: uppercase; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 8px; }
              .details-table { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
              .details-table td { padding: 6px 10px; border: 1px solid #e2e8f0; }
              .details-table td.label { font-weight: bold; width: 30%; background-color: #f8fafc; color: #475569; }
              .finance-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              .finance-table th { background-color: #0f172a; color: white; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
              .finance-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
              .bold { font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .discrepancy-box { margin-top: 20px; padding: 15px; border-radius: 8px; border: 1px dashed; }
              .discrepancy-neg { background-color: #fff1f2; border-color: #f43f5e; color: #be123c; }
              .discrepancy-pos { background-color: #ecfdf5; border-color: #10b981; color: #047857; }
              .discrepancy-zero { background-color: #f8fafc; border-color: #cbd5e1; color: #475569; }
              .footer-signature { margin-top: 50px; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
            </style>
          </head>
          <body>
            ${headerImg ? '<img class="header-img" src="' + headerImg + '" alt="Header" />' : '<div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px;">' + (clinic?.name || 'CLINIQUE') + '</div>'}
            
            <div class="title">Bordereau de Clôture de Caisse</div>

            <table class="details-table">
              <tr>
                <td class="label">Référence Session :</td>
                <td class="bold font-mono">${sessionData.sessionRef}</td>
                <td class="label">Caisse :</td>
                <td>${sessionData.caisseCode}</td>
              </tr>
              <tr>
                <td class="label">Caissier :</td>
                <td>${sessionData.cashierUsername}</td>
                <td class="label">Statut :</td>
                <td class="bold" style="color: #64748b;">CLÔTURÉE</td>
              </tr>
              <tr>
                <td class="label">Date d'Ouverture :</td>
                <td>${new Date(sessionData.openingDate).toLocaleString()}</td>
                <td class="label">Date de Clôture :</td>
                <td>${new Date(sessionData.closingDate).toLocaleString()}</td>
              </tr>
            </table>

            <h3 style="margin-top: 25px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; color: #1e293b;">Bilan Financier</h3>
            <table class="finance-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Montant (FCFA)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Solde d'Ouverture de Caisse (A)</td>
                  <td class="text-right bold">${formatCurrency(sessionData.openingBalance)} FCFA</td>
                </tr>
                <tr>
                  <td>Total des Encaissements Réalisés (B)</td>
                  <td class="text-right bold" style="color: #16a34a;">+${formatCurrency(totalIn)} FCFA</td>
                </tr>
                <tr>
                  <td>Total des Décaissements / Dépenses (C)</td>
                  <td class="text-right bold" style="color: #dc2626;">-${formatCurrency(totalOut)} FCFA</td>
                </tr>
                <tr style="background-color: #f8fafc; font-size: 14px;">
                  <td class="bold">Solde Théorique Machine (A + B - C)</td>
                  <td class="text-right bold" style="color: #0f172a;">${formatCurrency(sessionData.expectedAmount)} FCFA</td>
                </tr>
                <tr style="background-color: #f1f5f9; font-size: 14px; border-top: 2px solid #0f172a;">
                  <td class="bold">Solde Physique Réel Constaté (Main)</td>
                  <td class="text-right bold" style="color: #0f172a;">${formatCurrency(sessionData.actualAmount)} FCFA</td>
                </tr>
              </tbody>
            </table>

            <div class="discrepancy-box ${sessionData.discrepancy < 0 ? 'discrepancy-neg' : sessionData.discrepancy > 0 ? 'discrepancy-pos' : 'discrepancy-zero'}">
              <div style="font-weight: bold; font-size: 14px;">
                Écart de Caisse : ${formatCurrency(sessionData.discrepancy)} FCFA
                ${sessionData.discrepancy === 0 ? ' (Aucun écart)' : sessionData.discrepancy < 0 ? ' (Déficit / Manquant)' : ' (Excédent)'}
              </div>
              ${sessionData.justification ? `
                <div style="margin-top: 8px; font-size: 12px; color: #334155;">
                  <span class="bold">Justification fournie :</span><br/>
                  ${sessionData.justification}
                </div>
              ` : ''}
            </div>

            <div class="footer-signature">
              <table style="width: 100%;">
                <tr>
                  <td>
                    <strong>Le Caissier :</strong><br/>
                    ${sessionData.cashierUsername}<br/><br/>
                    Signature : ______________________
                  </td>
                  <td style="text-align: right; vertical-align: top;">
                    <strong>Visa Responsable Financier / Admin :</strong><br/><br/>
                    Signature & Cachet : ______________________
                  </td>
                </tr>
              </table>
            </div>

            ${footerImg ? '<div style="text-align: center; margin-top: 50px;"><img class="footer-img" src="' + footerImg + '" alt="Footer" /></div>' : ''}

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
      console.error("Error printing closing slip", err);
      showToast("Erreur lors de l'impression du bordereau.", "error");
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount || 0);
  };

  const totalEncaissements = transactions
    .filter(t => t.type === 'ENCAISSEMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalDecaissements = transactions
    .filter(t => t.type === 'DECAISSEMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const calculatedBalance = activeSession
    ? Number(activeSession.openingBalance) + totalEncaissements - totalDecaissements
    : 0;

  const currentCaisseLabel = caisses.find(c => c.code === activeSession?.caisseCode)?.string1 || activeSession?.caisseCode;

  // Invoice columns for DataTable
  const invoiceColumns = [
    {
      label: 'Réf Facture',
      key: 'invoiceRef',
      render: (row) => <span className="font-bold text-sky-600 font-mono">{row.invoiceRef}</span>
    },
    {
      label: 'Bordereau Physique',
      key: 'bordereauCode',
      render: (row) => <span className="font-bold text-slate-700">{row.bordereauCode || '---'}</span>
    },
    {
      label: 'Date',
      key: 'createdAt',
      render: (row) => <span className="font-semibold text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</span>
    },
    {
      label: 'Montant Brut',
      key: 'totalAmount',
      render: (row) => <span className="font-semibold text-slate-600">{formatCurrency(row.totalAmount)} FCFA</span>
    },
    {
      label: 'Part Assurance',
      key: 'insuranceAmount',
      render: (row) => (
        <span className="font-bold text-sky-600">
          {row.coverageRate > 0 ? `${formatCurrency(row.insuranceAmount)} FCFA (${row.coverageRate}%)` : '0 FCFA'}
        </span>
      )
    },
    {
      label: 'Net à Payer (Patient)',
      key: 'patientAmount',
      render: (row) => <span className="font-black text-slate-700">{formatCurrency(row.patientAmount)} FCFA</span>
    }
  ];

  const refundColumns = [
    {
      label: "Date Demande",
      key: "requestedAt",
      render: (row) => new Date(row.requestedAt).toLocaleString('fr-FR')
    },
    {
      label: "Patient",
      key: "patientName",
      render: (row) => <span className="font-black text-slate-700">{row.patientName}</span>
    },
    {
      label: "Acte Médical",
      key: "actName",
      render: (row) => <span className="text-slate-600 font-semibold">{row.actName}</span>
    },
    {
      label: "Facture Réf",
      key: "invoiceRef",
      render: (row) => <span className="font-mono text-xs text-slate-400">{row.invoiceRef}</span>
    },
    {
      label: "Montant",
      key: "refundAmount",
      render: (row) => <span className="font-mono font-black text-rose-600">-{formatCurrency(row.refundAmount)} FCFA</span>
    },
    {
      label: "Motif",
      key: "reason"
    },
    {
      label: "Demandé par",
      key: "requestedBy"
    }
  ];

  // Encaissement columns for DataTable
  const encaissementColumns = [
    {
      label: 'Date / Heure',
      key: 'createdAt',
      render: (row) => <span className="font-bold text-slate-500">{new Date(row.createdAt).toLocaleString()}</span>
    },
    {
      label: "Libellé de l'Opération",
      key: 'label',
      render: (row) => <span className="font-black text-slate-700">{row.label}</span>
    },
    {
      label: 'Référence ID',
      key: 'referenceId',
      render: (row) => <span className="font-mono text-xs text-sky-600 font-bold">{row.referenceId || 'Manuel'}</span>
    },
    {
      label: 'Montant Encaissé',
      key: 'amount',
      render: (row) => <span className="font-black text-emerald-600">+{formatCurrency(row.amount)} FCFA</span>
    }
  ];

  // Session History columns for DataTable
  const sessionHistoryColumns = [
    {
      label: 'Réf Session',
      key: 'sessionRef',
      render: (row) => <span className="font-mono font-black text-slate-700">{row.sessionRef}</span>
    },
    {
      label: 'Caisse',
      key: 'caisseCode',
      render: (row) => <span className="font-bold text-sky-700">{row.caisseCode}</span>
    },
    {
      label: 'Caissier',
      key: 'cashierUsername',
      render: (row) => <span className="font-bold text-slate-600">{row.cashierUsername}</span>
    },
    {
      label: 'Ouverture',
      key: 'openingDate',
      render: (row) => <span className="text-xs font-semibold text-slate-500">{new Date(row.openingDate).toLocaleString()}</span>
    },
    {
      label: 'Fermeture',
      key: 'closingDate',
      render: (row) => <span className="text-xs font-semibold text-slate-500">{row.closingDate ? new Date(row.closingDate).toLocaleString() : '---'}</span>
    },
    {
      label: 'Solde Attendu',
      key: 'expectedAmount',
      render: (row) => <span className="font-semibold text-slate-600">{formatCurrency(row.expectedAmount)} FCFA</span>
    },
    {
      label: 'Solde Réel',
      key: 'actualAmount',
      render: (row) => <span className="font-semibold text-slate-600">{row.closingDate ? `${formatCurrency(row.actualAmount)} FCFA` : '---'}</span>
    },
    {
      label: 'Écart',
      key: 'discrepancy',
      render: (row) => (
        <span className={`font-black ${row.discrepancy < 0 ? 'text-rose-600' : row.discrepancy > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
          {row.closingDate ? `${formatCurrency(row.discrepancy)} FCFA` : '---'}
        </span>
      )
    },
    {
      label: 'Statut',
      key: 'status',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${row.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {row.status === 'OPEN' ? 'Ouverte' : 'Clôturée'}
        </span>
      )
    }
  ];

  // Print Payment Receipt
  const handlePrintReceipt = async (invoiceId, paymentMethod = 'ESPECES', bankAccountCode = null) => {
    if (!invoiceId || invoiceId === 'Manuel') return;
    showToast("Préparation de l'impression du reçu...", "info");
    try {
      const [clinicRes, invoiceRes, linesRes] = await Promise.all([
        clinicService.getMyProfile().catch(() => null),
        invoiceService.getById(invoiceId),
        invoiceService.getLines(invoiceId)
      ]);

      const clinic = clinicRes?.data?.clinic;
      const clinicProfile = clinicRes?.data?.profile;
      const invoice = invoiceRes?.data;
      const lines = linesRes?.data || [];
      const accounts = clinicProfile?.bankAccounts || [];

      if (!invoice) {
        showToast("Impossible de récupérer les détails de la facture.", "error");
        return;
      }

      const patientRes = await patientService.getById(invoice.patientId);
      const patient = patientRes?.data;

      if (!patient) {
        showToast("Impossible de récupérer les détails du patient.", "error");
        return;
      }

      const selectedAccount = accounts.find(a => a.id === bankAccountCode);
      let paymentInfoText = paymentMethod;
      if (selectedAccount) {
        if (selectedAccount.type === 'MOBILE_MONEY') {
          paymentInfoText = `Mobile Money (${selectedAccount.providerName} - ${selectedAccount.phoneNumber})`;
        } else if (selectedAccount.type === 'VIREMENT_BANCAIRE') {
          paymentInfoText = `Virement Bancaire (${selectedAccount.bankName} - N°: ${selectedAccount.accountNumber})`;
        } else if (selectedAccount.type === 'ESPECES') {
          paymentInfoText = `Espèces (Caisse : ${activeSession?.caisseCode || 'Caisse'})`;
        }
      } else if (paymentMethod === 'ESPECES') {
        paymentInfoText = `Espèces (Caisse : ${activeSession?.caisseCode || 'Caisse'})`;
      }

      const headerImg = clinicProfile?.printHeaderA4 || clinicProfile?.printHeaderA5 || '';
      const footerImg = clinicProfile?.printFooterA4 || clinicProfile?.printFooterA5 || '';

      const printWindow = window.open('', '', 'width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (!printWindow) {
        showToast("Le bloqueur de fenêtres contextuelles bloque l'impression. Veuillez l'autoriser.", "warning");
        return;
      }

      const linesHtml = lines.map(line => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${line.actName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${line.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(line.unitPrice)} FCFA</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(line.totalPrice)} FCFA</td>
        </tr>
      `).join('');

      let insuranceSection = '';
      if (invoice.coverageRate > 0 || Number(invoice.insuranceAmount) > 0) {
        insuranceSection = `
          <div style="margin-top: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 6px; background-color: #f9f9f9;">
            <h4 style="margin: 0 0 8px 0; color: #0284c7; text-transform: uppercase; font-size: 11px; font-weight: 900;">Informations de Prise en Charge</h4>
            <table style="width: 100%; font-size: 11px;">
              <tr>
                <td style="font-weight: bold; width: 40%;">Assureur / Convention :</td>
                <td>${patient.insurer || 'Non spécifié'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Assuré Principal :</td>
                <td>${patient.mainInsured || patient.firstName + ' ' + patient.lastName}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">N° de Carte / Police :</td>
                <td>${patient.policyNumber || 'Non spécifié'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Taux de couverture :</td>
                <td>${invoice.coverageRate}%</td>
              </tr>
            </table>
          </div>
        `;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Reçu de Paiement - ${invoice.invoiceRef}</title>
            <style>
              @media print {
                body { margin: 0; padding: 0; }
                .no-print { display: none; }
              }
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; padding: 20px; font-size: 12px; }
              .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
              .footer-img { width: 100%; max-height: 80px; object-fit: contain; margin-top: 30px; }
              .title { text-align: center; font-size: 18px; font-weight: 900; margin-bottom: 20px; text-transform: uppercase; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 5px; }
              .info-table { width: 100%; margin-bottom: 20px; }
              .info-table td { padding: 4px 0; vertical-align: top; }
              .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
              .items-table th { background-color: #f1f5f9; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
              .summary-table { width: 45%; margin-left: auto; margin-top: 15px; font-size: 11px; }
              .summary-table td { padding: 4px; }
              .bold { font-weight: bold; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
            </style>
          </head>
          <body>
            ${headerImg ? '<img class="header-img" src="' + headerImg + '" alt="Header" />' : '<div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px;">' + (clinic?.name || 'CLINIQUE') + '</div>'}
            
            <div class="title">Reçu de Paiement</div>
 
            <table class="info-table">
              <tr>
                <td style="width: 55%;">
                  <span class="bold" style="font-size: 13px; color: #0f172a;">Patient : ${patient.firstName} ${patient.lastName}</span><br/>
                  Code Patient : ${patient.patientCode}<br/>
                  Téléphone : ${patient.phone1}<br/>
                  Adresse : ${patient.address || 'Non spécifiée'}
                </td>
                <td style="width: 45%; text-align: right;">
                  <span class="bold">Reçu N° : ${invoice.invoiceRef}</span><br/>
                  Date : ${new Date(invoice.createdAt).toLocaleString()}<br/>
                  Statut : <span style="color: #16a34a; font-weight: bold;">RÉGLÉ</span><br/>
                  Mode de règlement : ${paymentInfoText}
                </td>
              </tr>
            </table>


            ${insuranceSection}

            <table class="items-table">
              <thead>
                <tr>
                  <th>Prestation</th>
                  <th style="text-align: center; width: 10%;">Qté</th>
                  <th style="text-align: right; width: 20%;">Prix Unitaire</th>
                  <th style="text-align: right; width: 25%;">Montant Total</th>
                </tr>
              </thead>
              <tbody>
                ${linesHtml}
              </tbody>
            </table>

            <table class="summary-table">
              <tr>
                <td>Total Brut :</td>
                <td class="text-right">${formatCurrency(invoice.totalAmount)} FCFA</td>
              </tr>
              ${Number(invoice.insuranceAmount) > 0 ? `
              <tr style="color: #0284c7;">
                <td>Part Assurance (${invoice.coverageRate}%) :</td>
                <td class="text-right">-${formatCurrency(invoice.insuranceAmount)} FCFA</td>
              </tr>
              ` : ''}
              <tr style="font-size: 13px; font-weight: bold; border-top: 1.5px solid #1e293b;">
                <td style="padding-top: 8px;">Net Payé :</td>
                <td class="text-right" style="padding-top: 8px; color: #16a34a;">${formatCurrency(invoice.patientAmount)} FCFA</td>
              </tr>
            </table>

            <div style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 11px;">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 50%;">
                    Caissier : ${activeSession?.cashierUsername || 'Caisse'}
                  </td>
                  <td style="width: 50%; text-align: right;">
                    Signature & Cachet
                  </td>
                </tr>
              </table>
            </div>

            ${footerImg ? '<div style="text-align: center; margin-top: 50px;"><img class="footer-img" src="' + footerImg + '" alt="Footer" /></div>' : ''}

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
      console.error("Error generating receipt printout", err);
      showToast("Erreur lors de la génération de l'impression.", "error");
    }
  };

  const handlePrintDisbursementReceipt = async (tx) => {
    if (!tx) return;
    showToast("Préparation de l'impression du reçu...", "info");
    try {
      const clinicRes = await clinicService.getMyProfile().catch(() => null);
      const clinic = clinicRes?.data?.clinic;
      const clinicProfile = clinicRes?.data?.profile;
      const accounts = clinicProfile?.bankAccounts || [];
      const selectedAccount = accounts.find(a => a.id === tx.bankAccountCode);

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
        paymentInfoHtml = `<span>${tx.paymentMethod === 'ESPECES' ? 'Espèces' : tx.paymentMethod}</span>`;
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
            <title>Reçu de Décaissement - ${tx.id.substring(0, 8)}</title>
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
            ${headerImg ? '<img class="header-img" src="' + headerImg + '" alt="Header" />' : '<div style="text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px;">' + (clinic?.name || 'CLINIQUE') + '</div>'}
            
            <div class="title">Bon de Décaissement / Remboursement</div>

            <table class="details-table">
              <tr>
                <td class="label">Date / Heure :</td>
                <td>${new Date(tx.createdAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">Description :</td>
                <td class="bold">${tx.label}</td>
              </tr>
              <tr>
                <td class="label">Mode de règlement :</td>
                <td>${paymentInfoHtml}</td>
              </tr>
              <tr>
                <td class="label">Montant :</td>
                <td class="bold" style="color: #dc2626; font-size: 15px;">${formatCurrency(tx.amount)} FCFA</td>
              </tr>
              <tr>
                <td class="label">Session Trésorerie :</td>
                <td class="font-mono">${activeSession?.sessionRef || 'Session'}</td>
              </tr>
            </table>

            <div class="footer-signature">
              <table style="width: 100%;">
                <tr>
                  <td>
                    <strong>Le Caissier / Agent :</strong><br/>
                    ${activeSession?.cashierUsername || 'Caisse'}<br/><br/>
                    Signature : ______________________
                  </td>
                  <td style="text-align: right; vertical-align: top;">
                    <strong>Bénéficiaire :</strong><br/><br/>
                    Signature : ______________________
                  </td>
                </tr>
              </table>
            </div>

            ${footerImg ? '<div style="text-align: center; margin-top: 50px;"><img class="footer-img" src="' + footerImg + '" alt="Footer" /></div>' : ''}

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
      console.error("Error printing disbursement receipt", err);
      showToast("Erreur lors de l'impression du reçu.", "error");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Dynamic Status Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeSession ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
            {activeSession ? <Unlock size={24} /> : <Lock size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
              <Landmark size={24} className="text-sky-600" /> Trésorerie & Caisse
            </h2>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              {activeSession ? (
                <span>
                  Caisse : <span className="text-emerald-600 font-black">{currentCaisseLabel}</span>
                  {activeSession.caisseCode === 'CAISSE_PRINCIPALE' && (
                    <span className="ml-2 text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                      Caisse Principale (Lecture seule / Dépenses)
                    </span>
                  )}
                  {" — Session active : "}
                  <span className="font-mono text-sky-600 font-black">{activeSession.sessionRef}</span>
                </span>
              ) : (
                "Aucune session de caisse ouverte pour le moment."
              )}
            </p>
          </div>
        </div>

        {activeSession && (
          <div className="flex items-center gap-6 bg-slate-50 border border-slate-200/60 rounded-lg p-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Solde Attendu (Machine)</span>
              <span className="text-lg font-black text-slate-700">{formatCurrency(calculatedBalance)} FCFA</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Internal Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ma-session')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'ma-session' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          Session
        </button>
        <button
          onClick={() => setActiveTab('a-encaisser')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'a-encaisser' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          À Encaisser
        </button>
        <button
          onClick={() => setActiveTab('encaissements')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'encaissements' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          Encaissements
        </button>
        <button
          onClick={() => setActiveTab('remboursements')}
          className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'remboursements' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          Remboursements / Décaissements
        </button>
        {activeSession && activeSession.caisseCode === 'CAISSE_PRINCIPALE' && (
          <button
            onClick={() => {
              setActiveTab('transferts-banques');
              if (bankAccounts.length > 0 && !selectedBankAccountIdForTransfer) {
                const virementAccs = bankAccounts.filter(a => a.type === 'VIREMENT_BANCAIRE');
                if (virementAccs.length > 0) {
                  setSelectedBankAccountIdForTransfer(virementAccs[0].id);
                }
              }
            }}
            className={`px-5 py-2.5 font-bold text-xs uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'transferts-banques' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
          >
            Transferts & Approvisionnements Banque
          </button>
        )}
      </div>

      {/* Render selected view */}
      {loadingSession ? (
        <div className="p-20 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
          <RefreshCw className="animate-spin text-sky-600" size={32} />
        </div>
      ) : activeTab === 'ma-session' ? (
        // TAB 2.1 — Cash Session (Opening / Closing / Slip / Stats)
        <div className="space-y-6">
          {!activeSession ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* OPEN SESSION FORM */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <Key className="text-emerald-500" size={20} />
                  <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Ouvrir une session de trésorerie</h3>
                </div>
                <form onSubmit={handleOpenSession} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Choisir la caisse</label>
                    <select
                      value={selectedCaisse}
                      onChange={e => setSelectedCaisse(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-bold bg-slate-50 outline-none focus:border-sky-500 text-slate-800 cursor-pointer"
                    >
                      {caisses.map(c => (
                        <option key={c.code} value={c.code}>{c.string1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Solde d'ouverture (FCFA)</label>
                    <input
                      type="number"
                      min="0"
                      value={openingBalance}
                      onChange={e => setOpeningBalance(e.target.value)}
                      placeholder="Ex: 50000"
                      className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-bold bg-slate-50 outline-none focus:border-sky-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={opening}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {opening ? <RefreshCw className="animate-spin" size={16} /> : <Unlock size={16} />}
                    Ouvrir la caisse
                  </button>
                </form>
              </div>

              {/* No Session Alert */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <AlertTriangle size={40} className="text-amber-500 mb-2" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">Pas de session de caisse active</span>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                  Les statistiques et les encaissements de la journée ne sont pas accessibles car aucune session n'est ouverte.
                </p>
              </div>
            </div>
          ) : (
            // ACTIVE SESSION AND STATISTICS
            <div className="space-y-6">
              {/* Top Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Date & Heure d'ouverture</span>
                    <span className="text-sm font-black text-slate-800">{new Date(activeSession.openingDate || activeSession.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Activity size={18} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Solde d'ouverture</span>
                    <span className="text-base font-black text-slate-800">{formatCurrency(activeSession.openingBalance)} FCFA</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Unlock size={18} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Encaissements</span>
                    <span className="text-base font-black text-emerald-600">+{formatCurrency(transactions.filter(t => t.type === 'ENCAISSEMENT').reduce((sum, t) => sum + Number(t.amount), 0))} FCFA ({transactions.filter(t => t.type === 'ENCAISSEMENT').length})</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ArrowUpRight size={18} />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Décaissements & Remb.</span>
                    <span className="text-base font-black text-rose-600">-{formatCurrency(transactions.filter(t => t.type === 'DECAISSEMENT').reduce((sum, t) => sum + Number(t.amount), 0))} FCFA ({transactions.filter(t => t.type === 'DECAISSEMENT').length})</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ArrowDownRight size={18} />
                  </div>
                </div>
              </div>

              {/* Grouped Stats Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stats by Payment Method */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Statistiques par Moyen de Paiement</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'ESPECES', label: 'Espèces / Cash', color: 'bg-emerald-50 text-emerald-700' },
                      { key: 'CARTE', label: 'Carte Bancaire', color: 'bg-sky-50 text-sky-700' },
                      { key: 'CHEQUE', label: 'Chèques Clinique', color: 'bg-amber-50 text-amber-700' },
                      { key: 'MOBILE_MONEY', label: 'Mobile Money', color: 'bg-indigo-50 text-indigo-700' }
                    ].map(m => {
                      const methodTx = transactions.filter(t => (t.paymentMethod || 'ESPECES') === m.key);
                      const totalAmount = methodTx.reduce((sum, t) => sum + (t.type === 'ENCAISSEMENT' ? Number(t.amount) : -Number(t.amount)), 0);
                      return (
                        <div key={m.key} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">{m.label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{methodTx.length} opération(s)</span>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${m.color}`}>
                            {formatCurrency(totalAmount)} FCFA
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats by Operation Type */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">Statistiques par Type d'Opération</h4>
                  <div className="space-y-3">
                    {[
                      { key: 'FACTURATIONS', label: 'Règlements Prestations Patients', filterFn: t => t.referenceId && t.type === 'ENCAISSEMENT', color: 'text-emerald-700 bg-emerald-50' },
                      { key: 'REMBOURSEMENTS', label: 'Remboursements de prestations', filterFn: t => t.label?.includes('Remboursement'), color: 'text-rose-700 bg-rose-50' },
                      { key: 'MANUELLES', label: 'Opérations directes & Dépenses', filterFn: t => !t.referenceId && !t.label?.includes('Remboursement'), color: 'text-slate-700 bg-slate-100' }
                    ].map(o => {
                      const opTx = transactions.filter(o.filterFn);
                      const totalAmount = opTx.reduce((sum, t) => sum + Number(t.amount), 0);
                      return (
                        <div key={o.key} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">{o.label}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{opTx.length} opération(s)</span>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${o.color}`}>
                            {formatCurrency(totalAmount)} FCFA
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Closing Trigger Form & Last Slip */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                {/* Left panel: Closing form */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <Unlock className="text-emerald-500" size={20} />
                      <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Clôture de Session Active</h3>
                    </div>
                  </div>

                  <div className="border-t border-slate-50 pt-2">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                      <Lock size={18} className="text-rose-500" /> Clôture de Caisse en fin de journée
                    </h4>
                    <div className="space-y-4 max-w-md">
                      {closureStep === 'INPUT' && (
                        <form onSubmit={handleStartClosure} className="space-y-4">
                          <div>
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Montant Physique en Main (FCFA)</label>
                            <input
                              type="number"
                              min="0"
                              value={actualAmount}
                              onChange={e => setActualAmount(e.target.value)}
                              placeholder="Comptez toutes les espèces de la caisse..."
                              className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-bold bg-slate-50 outline-none focus:border-rose-500 text-slate-800"
                              required
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={closing}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {closing ? <RefreshCw className="animate-spin" size={16} /> : <Lock size={16} />}
                            Lancer la clôture
                          </button>
                        </form>
                      )}

                      {closureStep === 'WARNING' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4 shadow-inner">
                          <div className="flex items-start gap-3 text-amber-800 text-xs font-semibold">
                            <AlertTriangle className="shrink-0 text-amber-600" size={20} />
                            <div className="space-y-1">
                              <span className="font-bold text-sm text-amber-900 block">Alerte d'écart de caisse détecté !</span>
                              <p className="text-slate-600 mt-1">
                                Un écart de <strong className="font-mono text-rose-600">{formatCurrency(parseFloat(actualAmount) - calculatedBalance)} FCFA</strong> est constaté entre votre saisie et le solde machine.
                              </p>
                              <ul className="list-disc pl-4 text-slate-500 font-bold space-y-0.5 mt-2">
                                <li>Solde machine (Théorique) : <span className="font-mono text-slate-700">{formatCurrency(calculatedBalance)} FCFA</span></li>
                                <li>Votre saisie (Physique) : <span className="font-mono text-slate-700">{formatCurrency(parseFloat(actualAmount))} FCFA</span></li>
                              </ul>
                            </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setClosureStep('INPUT')}
                              className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer"
                            >
                              Corriger le montant saisi
                            </button>
                            <button
                              type="button"
                              onClick={() => setClosureStep('JUSTIFY')}
                              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow transition-colors cursor-pointer"
                            >
                              Confirmer le montant
                            </button>
                          </div>
                        </div>
                      )}

                      {closureStep === 'JUSTIFY' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 shadow-inner">
                          <div className="space-y-1.5">
                            <span className="font-bold text-xs text-slate-800 uppercase tracking-tight block">Informations de l'écart</span>
                            <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-200/60 text-xs">
                              <div>
                                <span className="text-slate-400 font-bold block uppercase text-[8px]">Solde Machine (Calculé)</span>
                                <span className="font-mono font-black text-slate-700">{formatCurrency(calculatedBalance)} FCFA</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold block uppercase text-[8px]">Écart Constaté</span>
                                <span className={`font-mono font-black ${parseFloat(actualAmount) - calculatedBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {formatCurrency(parseFloat(actualAmount) - calculatedBalance)} FCFA
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Justification obligatoire de l'écart</label>
                            <textarea
                              value={justification}
                              onChange={e => setJustification(e.target.value)}
                              placeholder="Saisissez la raison de l'écart constaté (ex: erreur de rendu de monnaie, dépense non enregistrée)..."
                              className="w-full border border-slate-200 bg-white rounded-lg p-3 text-xs outline-none focus:border-sky-500 text-slate-800"
                              rows={3}
                              required
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setClosureStep('INPUT');
                                setJustification('');
                              }}
                              className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm transition-colors cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => executeClosure(true, justification)}
                              disabled={closing || !justification.trim()}
                              className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {closing ? <RefreshCw className="animate-spin" size={14} /> : <Lock size={14} />}
                              Confirmer & Clôturer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right panel: Last Slip (Bordereau) */}
                <div className="space-y-6">
                  {lastClosedSession ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="font-bold text-slate-700 flex items-center gap-2"><FileText size={18} className="text-sky-600" /> Bordereau de Clôture</span>
                        <button onClick={handlePrintSlip} className="bg-sky-50 text-sky-700 hover:bg-sky-100 p-2 rounded-lg transition-colors"><Printer size={16} /></button>
                      </div>

                      <div ref={printRef} className="space-y-4 text-xs font-mono">
                        <div className="header">
                          <h2 style={{ margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold' }}>ALPHACURE CLINIC</h2>
                          <div>BORDEREAU DE CLOTURE CAISSE</div>
                        </div>

                        <div className="row"><span className="bold">Session REF :</span><span>{lastClosedSession.sessionRef}</span></div>
                        <div className="row"><span className="bold">Caisse :</span><span>{lastClosedSession.caisseCode}</span></div>
                        <div className="row"><span className="bold">Caissier :</span><span>{lastClosedSession.cashierUsername}</span></div>
                        <div className="row"><span className="bold">Clôturé le :</span><span>{new Date(lastClosedSession.closingDate).toLocaleString()}</span></div>

                        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '15px 0' }} />

                        <div className="row"><span className="bold">Solde Ouverture :</span><span>{formatCurrency(lastClosedSession.openingBalance)} FCFA</span></div>
                        <div className="row"><span className="bold">Solde Théorique :</span><span>{formatCurrency(lastClosedSession.expectedAmount)} FCFA</span></div>
                        <div className="row"><span className="bold">Solde Réel (Main) :</span><span>{formatCurrency(lastClosedSession.actualAmount)} FCFA</span></div>

                        <div className="row bold" style={{ fontSize: '13px', borderTop: '1px dashed #000', paddingTop: '5px' }}>
                          <span>Ecart de caisse :</span>
                          <span style={{ color: lastClosedSession.discrepancy < 0 ? '#dc2626' : '#16a34a' }}>
                            {formatCurrency(lastClosedSession.discrepancy)} FCFA
                          </span>
                        </div>

                        {lastClosedSession.justification && (
                          <div style={{ marginTop: '15px', padding: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                            <span className="bold" style={{ display: 'block', marginBottom: '4px' }}>Justification de l'écart :</span>
                            <span>{lastClosedSession.justification}</span>
                          </div>
                        )}

                        <div className="footer">
                          <div>Généré automatiquement par AlphaCure Clinic Trésorerie</div>
                          <div>Signature Caissier : ______________________</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
                      <FileText size={40} className="text-slate-300 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-wider">Aucun bordereau récent</span>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                        Le bordereau de clôture sera généré instantanément et s'affichera ici dès la validation de clôture de votre caisse.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'a-encaisser' ? (
        // TAB 2.2 — Pending Invoices list using DataTable
        <DataTable
          title="Prestations Patients à Régler"
          columns={invoiceColumns}
          data={paginatedInvoices}
          loading={loadingInvoices}
          onSearch={onSearchInvoices}
          searchPlaceholder="Rechercher par Réf ou Bordereau..."
          entryLabel="prestations"
          pagination={invoicesPagination}
          extraActions={(row) => (
            <button
              onClick={() => handlePayInvoice(row)}
              disabled={!activeSession || activeSession.caisseCode === 'CAISSE_PRINCIPALE'}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 mx-auto"
              title={activeSession?.caisseCode === 'CAISSE_PRINCIPALE' ? "La caisse principale ne peut pas encaisser les prestations des patients" : ""}
            >
              <Check size={12} /> Encaisser
            </button>
          )}
        />
      ) : activeTab === 'encaissements' ? (
        // TAB 2.3 — Session Cash In Flow Transactions & Past Sessions using DataTables
        <div className="space-y-6">
          <DataTable
            title="Encaissements de la Session en Cours"
            columns={encaissementColumns}
            data={paginatedEncaissements}
            loading={loadingTransactions}
            onSearch={onSearchEncaissements}
            searchPlaceholder="Rechercher par libellé ou référence ID..."
            entryLabel="encaissements"
            pagination={encaissementsPagination}
            extraActions={(row) => row.referenceId && row.referenceId !== 'Manuel' && (
              <button
                onClick={() => handlePrintReceipt(row.referenceId, row.paymentMethod || 'ESPECES', row.bankAccountCode)}
                title="Réimprimer le reçu"
                className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 mx-auto"
              >
                <Printer size={12} /> Imprimer
              </button>
            )}
          />

          <DataTable
            title="Historique des Sessions de Caisse"
            columns={sessionHistoryColumns}
            data={paginatedHistory}
            loading={loadingHistory}
            onSearch={onSearchHistory}
            searchPlaceholder="Rechercher par Réf, Caisse ou Caissier..."
            entryLabel="sessions"
            pagination={historyPagination}
          />
        </div>
      ) : activeTab === 'remboursements' ? (
        // TAB 2.4 — Prestation Refund Requests
        <div className="space-y-6">
          <DataTable
            title="Demandes de remboursements de prestations en attente"
            columns={refundColumns}
            data={paginatedRefunds}
            loading={loadingRefunds}
            onSearch={onSearchRefunds}
            searchPlaceholder="Rechercher par patient, acte ou motif..."
            entryLabel="demandes"
            pagination={refundsPagination}
            extraActions={(row) => (
              <button
                onClick={() => setSelectedRefund(row)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 mx-auto"
                title="Traiter le remboursement"
              >
                Traiter
              </button>
            )}
          />
        </div>
      ) : (
        // TAB 2.5 — Bank Transfers (Transferts & Approvisionnements Banque)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New bank operation */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-fit">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
              <Landmark className="text-sky-600" size={20} />
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Flux de Trésorerie Banque</h3>
            </div>
            <form onSubmit={handleBankTransferSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Nature du flux</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBankTxType('TRANSFERT_BANQUE')}
                    className={`flex-1 py-2.5 rounded font-black text-[10px] uppercase tracking-wider border-2 transition-all ${bankTxType === 'TRANSFERT_BANQUE'
                      ? 'bg-rose-50 border-rose-500 text-rose-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    Transfert (Caisse &rarr; Banque)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankTxType('APPROVISIONNEMENT_BANQUE')}
                    className={`flex-1 py-2.5 rounded font-black text-[10px] uppercase tracking-wider border-2 transition-all ${bankTxType === 'APPROVISIONNEMENT_BANQUE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    Approvisionnement (Banque &rarr; Caisse)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Compte Bancaire de Règlement *</label>
                <select
                  value={selectedBankAccountIdForTransfer}
                  onChange={e => setSelectedBankAccountIdForTransfer(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-bold bg-slate-50 outline-none focus:border-sky-500 text-slate-800 shadow-sm cursor-pointer"
                  required
                >
                  <option value="">Sélectionnez le compte bancaire</option>
                  {bankAccounts
                    .filter(acc => acc.type === 'VIREMENT_BANCAIRE')
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber} ({acc.name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Montant de l'opération (FCFA) *</label>
                <input
                  type="number"
                  min="0"
                  value={bankTxAmount}
                  onChange={e => setBankTxAmount(e.target.value)}
                  placeholder="Ex: 50000"
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-bold bg-slate-50 outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Motif / Justification *</label>
                <input
                  type="text"
                  value={bankTxLabel}
                  onChange={e => setBankTxLabel(e.target.value)}
                  placeholder="Ex: Dépôt d'espèces à la banque..."
                  className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-bold bg-slate-50 outline-none focus:border-sky-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingBankTx || !activeSession}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white p-3.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg transition-colors flex items-center justify-center gap-2"
              >
                {savingBankTx ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                Soumettre au Manager
              </button>
            </form>
          </div>

          {/* List of transfers */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <Landmark size={18} className="text-sky-600" />
              <span className="font-bold text-slate-700">Flux Banque en cours dans la Session</span>
            </div>

            <div className="overflow-x-auto">
              {loadingTransactions ? (
                <div className="p-10 flex justify-center items-center">
                  <RefreshCw size={24} className="text-sky-600 animate-spin" />
                </div>
              ) : transactions.filter(t => t.expenseCategory === 'TRANSFERT_BANQUE' || t.expenseCategory === 'APPROVISIONNEMENT_BANQUE').length === 0 ? (
                <div className="p-10 text-center text-slate-500 italic text-xs">Aucune transaction bancaire initiée dans cette session.</div>
              ) : (
                <table className="w-full text-left text-[13px]">
                  <thead className="bg-[#0f172a] text-white">
                    <tr>
                      <th className="p-3 px-4 font-black text-[10px] uppercase tracking-widest">Type</th>
                      <th className="p-3 px-4 font-black text-[10px] uppercase tracking-widest">Compte bancaire / Motif</th>
                      <th className="p-3 px-4 font-black text-[10px] uppercase tracking-widest text-right">Montant</th>
                      <th className="p-3 px-4 font-black text-[10px] uppercase tracking-widest text-center">Statut</th>
                      <th className="p-3 px-4 font-black text-[10px] uppercase tracking-widest text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transactions
                      .filter(t => t.expenseCategory === 'TRANSFERT_BANQUE' || t.expenseCategory === 'APPROVISIONNEMENT_BANQUE')
                      .map(t => {
                        const isTransfer = t.expenseCategory === 'TRANSFERT_BANQUE';
                        const bankAcc = bankAccounts.find(a => a.id === t.bankAccountCode);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                isTransfer ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {isTransfer ? 'Transfert' : 'Approvisionnement'}
                              </span>
                            </td>
                            <td className="p-3 px-4">
                              <div className="font-black text-slate-700">{t.label}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Compte : {bankAcc ? `${bankAcc.bankName} - ${bankAcc.accountNumber}` : t.bankAccountCode}
                              </div>
                            </td>
                            <td className={`p-3 px-4 text-right font-black ${isTransfer ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {isTransfer ? '-' : '+'}{formatCurrency(t.amount)} FCFA
                            </td>
                            <td className="p-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                t.status === 'VALIDATED'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : t.status === 'CANCELLED'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {t.status === 'VALIDATED' ? 'Validé' : t.status === 'CANCELLED' ? 'Annulé' : 'En attente'}
                              </span>
                            </td>
                            <td className="p-3 px-4 text-center">
                              {t.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelBankTransfer(t.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1.5 rounded transition-colors inline-block"
                                  title="Annuler la demande"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal Dialog */}
      {isPaymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden transform transition-transform scale-100">
            {/* Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-sky-400">Encaissement de Prestations</h3>
                <p className="text-[11px] text-slate-300 font-bold mt-1">Facture Réf : <span className="font-mono">{selectedInvoice.invoiceRef}</span></p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Content / Form */}
            <form onSubmit={handlePayInvoiceSubmit} className="p-6 space-y-6">
              {/* Amounts Details Table */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Montant Brut Prestations :</span>
                  <span>{formatCurrency(selectedInvoice.totalAmount)} FCFA</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-sky-600">
                  <span>Part Assureur prise en charge ({selectedInvoice.coverageRate}%) :</span>
                  <span>{formatCurrency(selectedInvoice.insuranceAmount)} FCFA</span>
                </div>
                <hr className="border-slate-200 my-1" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Net à Payer (Patient) :</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">{formatCurrency(selectedInvoice.patientAmount)} FCFA</span>
                </div>
              </div>

              {/* Choix du compte de règlement */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Compte de Règlement *</label>
                <select
                  value={selectedSettlementAccount?.id || ''}
                  onChange={e => {
                    const acc = bankAccounts.find(a => a.id === e.target.value);
                    setSelectedSettlementAccount(acc || null);
                    if (acc) {
                      setMoyenPaiement(acc.type);
                      setSelectedBankAccount(acc.id);
                    } else {
                      setMoyenPaiement('ESPECES');
                      setSelectedBankAccount('');
                    }
                  }}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-bold bg-white outline-none focus:border-sky-500 text-slate-800 shadow-sm cursor-pointer"
                  required
                >
                  {bankAccounts
                    .filter(acc => {
                      if (acc.type === 'ESPECES') {
                        return (acc.eligibleCaisseCodes || []).includes(activeSession?.caisseCode);
                      }
                      return true;
                    })
                    .map(acc => {
                      let labelText = '';
                      if (acc.type === 'ESPECES') {
                        labelText = `${acc.name || 'Espèces'} (Caisses: ${(acc.eligibleCaisseCodes || []).join(', ')})`;
                      } else if (acc.type === 'MOBILE_MONEY') {
                        labelText = `${acc.name || 'Mobile Money'} (${acc.providerName} - ${acc.phoneNumber})`;
                      } else {
                        labelText = `${acc.name || 'Virement'} (${acc.bankName} - ${acc.accountNumber})`;
                      }
                      return (
                        <option key={acc.id} value={acc.id}>
                          {labelText} {acc.primary ? ' [Principal]' : ''}
                        </option>
                      );
                    })}
                  {bankAccounts.length === 0 && (
                    <option value="">Espèces (Session en cours)</option>
                  )}
                </select>
              </div>

              {/* Montant Reçu & Change Return Calculation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Montant Reçu (FCFA)</label>
                  <input
                    type="number"
                    min={selectedInvoice.patientAmount}
                    value={montantRecu}
                    onChange={e => setMontantRecu(e.target.value)}
                    placeholder="Saisissez le montant donné..."
                    className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm font-bold bg-slate-50 outline-none focus:border-sky-500 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Monnaie à Rendre</label>
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm font-black text-amber-700 font-mono text-center h-12 flex items-center justify-center">
                    {formatCurrency(Math.max(0, (parseFloat(montantRecu) || 0) - selectedInvoice.patientAmount))} FCFA
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-500 hover:bg-slate-50 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={payingInvoice}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  {payingInvoice ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  Valider l'encaissement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Refund Modal Dialog */}
      {selectedRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-rose-400">Finaliser le Remboursement</h3>
                <p className="text-[11px] text-slate-300 font-bold mt-1">Facture Réf : <span className="font-mono">{selectedRefund.invoiceRef}</span></p>
              </div>
              <button onClick={() => setSelectedRefund(null)} className="text-slate-400 hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Patient :</span>
                  <span className="font-black text-slate-800">{selectedRefund.patientName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Acte Médical :</span>
                  <span className="font-bold text-slate-700">{selectedRefund.actName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Demandé par :</span>
                  <span className="font-medium text-slate-700">{selectedRefund.requestedBy}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Motif :</span>
                  <span className="italic text-slate-600">{selectedRefund.reason}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-bold text-xs uppercase">Montant à rembourser :</span>
                  <span className="text-base font-black text-rose-600 font-mono">{formatCurrency(selectedRefund.refundAmount)} FCFA</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs font-semibold flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  La validation de ce remboursement enregistrera automatiquement un décaissement (dépense) de {formatCurrency(selectedRefund.refundAmount)} FCFA dans votre session de caisse active. Assurez-vous d'avoir le solde physique nécessaire.
                </span>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleRejectRefund(selectedRefund.id)}
                  disabled={processingRefund}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-black uppercase text-[10px] tracking-wider rounded-lg transition-colors border border-slate-300"
                >
                  Rejeter la demande
                </button>
                <button
                  onClick={() => handleApproveRefund(selectedRefund.id)}
                  disabled={processingRefund}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-wider rounded-lg shadow-lg shadow-rose-600/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  {processingRefund ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  Valider le Remboursement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaSessionView;
