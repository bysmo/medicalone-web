import { useState, useEffect } from 'react';
import {
  Landmark, Printer, FileText, Eye, ArrowLeft, Loader2
} from 'lucide-react';
import {
  cashSessionService, clinicService, invoiceService,
  patientService, nomenclatureService
} from '../../services/api';
import DataTable from '../ui/DataTable';
import { useClientTable } from '../../hooks/useClientTable';

const formatFCFA = (amount) => {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount).replace('XOF', 'FCFA');
};

const AuditCaissesView = ({ showToast }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionTransactions, setSessionTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Advanced Treasury States
  const [activeSession, setActiveSession] = useState(null);
  const [transferringId, setTransferringId] = useState(null);
  const [caissesNomenclature, setCaissesNomenclature] = useState([]);
  const [comptesNomenclature, setComptesNomenclature] = useState([]);
  const [balances, setBalances] = useState({ caisses: {}, comptes: {} });
  const [loadingBalances, setLoadingBalances] = useState(false);

  // useClientTable hooks for filtering
  const { onSearch: onSearchSessions, paginated: paginatedSessions, pagination: sessionsPagination } = useClientTable(sessions, {
    searchKeys: ['sessionRef', 'caisseCode', 'cashierUsername'],
    initialPageSize: 10,
  });

  const { onSearch: onSearchTransactions, paginated: paginatedTransactions, pagination: transactionsPagination } = useClientTable(sessionTransactions, {
    searchKeys: ['label', 'referenceId', 'paymentMethod'],
    initialPageSize: 10,
  });

  // Load balances and nomenclatures
  async function loadBalancesAndNomenclatures() {
    setLoadingBalances(true);
    try {
      const [caisRes, compRes, balRes] = await Promise.all([
        nomenclatureService.search('CAISSES_TRESORERIE', 'FINANCES').catch(() => ({ data: [] })),
        nomenclatureService.search('COMPTES_BANCAIRES', 'FINANCES').catch(() => ({ data: [] })),
        cashSessionService.getBalances().catch(() => ({ data: { caisses: {}, comptes: {} } }))
      ]);
      setCaissesNomenclature(caisRes.data || []);
      setComptesNomenclature(compRes.data || []);
      setBalances(balRes.data || { caisses: {}, comptes: {} });
    } catch (err) {
      console.error("Error loading balances or nomenclatures", err);
    } finally {
      setLoadingBalances(false);
    }
  }

  // Fetch active session of current user
  async function fetchActiveSession() {
    try {
      const res = await cashSessionService.getActive();
      if (res.data && res.data.id) {
        setActiveSession(res.data);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Error fetching active session", err);
    }
  }

  // Fetch all sessions (updated to be re-callable)
  async function fetchSessions() {
    setLoading(true);
    try {
      const res = await cashSessionService.getAll();
      const sorted = (res.data || []).sort((a, b) => {
        if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
        if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setSessions(sorted);
    } catch (err) {
      console.error("Error fetching sessions list for audit", err);
      showToast("Erreur lors du chargement des sessions.", "error");
    } finally {
      setLoading(false);
    }
  }

  // Execute transfer from secondary register to main register
  const handleExecuteTransfer = async (secondarySessionId) => {
    setTransferringId(secondarySessionId);
    try {
      const res = await cashSessionService.transferToMain(secondarySessionId);
      if (res.data.success) {
        showToast(res.data.message || "Transfert effectué avec succès !", "success");
        // Reload all data
        fetchSessions();
        loadBalancesAndNomenclatures();
      } else {
        showToast("Erreur lors du transfert.", "error");
      }
    } catch (err) {
      console.error("Error transferring cash", err);
      const msg = err.response?.data?.message || "Erreur lors du transfert de fonds.";
      showToast(msg, "error");
    } finally {
      setTransferringId(null);
    }
  };

  const pendingTransfers = sessions.filter(
    s => s.status === 'CLOSED' && s.caisseCode !== 'CAISSE_PRINCIPALE' && !s.transferred
  );

  useEffect(() => {
    setTimeout(() => {
      fetchActiveSession();
      fetchSessions();
      loadBalancesAndNomenclatures();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    setSessionTransactions([]);
    setLoadingTransactions(true);
    try {
      const res = await cashSessionService.getTransactions(session.id);
      setSessionTransactions(res.data || []);
    } catch (err) {
      console.error("Error loading transactions for session", session.id, err);
      showToast("Erreur lors du chargement des opérations de la session.", "error");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount || 0);
  };

  // Reusable print receipts logic
  const handlePrintReceipt = async (invoiceId, paymentMethod = 'ESPECES') => {
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

      if (!invoice) {
        showToast("Facture introuvable.", "error");
        return;
      }

      const patientRes = await patientService.getById(invoice.patientId);
      const patient = patientRes?.data;

      if (!patient) {
        showToast("Patient introuvable.", "error");
        return;
      }

      const headerImg = clinicProfile?.printHeaderA4 || clinicProfile?.printHeaderA5 || '';
      const footerImg = clinicProfile?.printFooterA4 || clinicProfile?.printFooterA5 || '';

      const printWindow = window.open('', '', 'width=800,height=900,toolbar=0,scrollbars=0,status=0');
      if (!printWindow) {
        showToast("Le bloqueur de fenêtres contextuelles bloque l'impression.", "warning");
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
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; padding: 20px; font-size: 12px; }
              .header-img { width: 100%; max-height: 120px; object-fit: contain; margin-bottom: 20px; }
              .footer-img { width: 100%; max-height: 80px; object-fit: contain; margin-top: 30px; }
              .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; color: #1e293b; border-bottom: 2px solid #1e293b; padding-bottom: 5px; }
              .info-table { width: 100%; margin-bottom: 20px; }
              .info-table td { padding: 4px 0; vertical-align: top; }
              .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
              .items-table th { background-color: #f1f5f9; padding: 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
              .summary-table { width: 45%; margin-left: auto; margin-top: 15px; font-size: 11px; }
              .summary-table td { padding: 4px; }
              .bold { font-weight: bold; }
              .text-right { text-align: right; }
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
                  Mode de règlement : ${paymentMethod}
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
            <div style="margin-top: 45px; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 11px;">
              <table style="width: 100%;">
                <tr>
                  <td style="width: 50%;"> Caissier : ${selectedSession?.cashierUsername || 'Caisse'} </td>
                  <td style="width: 50%; text-align: right;"> Signature & Cachet </td>
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

  const handlePrintSlip = async (sessionData) => {
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
        showToast("Le bloqueur de fenêtres bloque l'impression.", "warning");
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
                <td class="bold" style="color: #64748b;">${sessionData.status === 'OPEN' ? 'OUVERTE' : 'CLÔTURÉE'}</td>
              </tr>
              <tr>
                <td class="label">Date d'Ouverture :</td>
                <td>${new Date(sessionData.openingDate).toLocaleString()}</td>
                <td class="label">Date de Clôture :</td>
                <td>${sessionData.closingDate ? new Date(sessionData.closingDate).toLocaleString() : 'En cours'}</td>
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
                  <td class="text-right bold" style="color: #0f172a;">${sessionData.status === 'OPEN' ? 'N/A' : `${formatCurrency(sessionData.actualAmount)} FCFA`}</td>
                </tr>
              </tbody>
            </table>

            ${sessionData.status !== 'OPEN' ? `
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
            ` : ''}

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
  };

  const sessionColumns = [
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
      render: (row) => <span className="text-[11px] font-semibold text-slate-500">{new Date(row.openingDate).toLocaleString()}</span>
    },
    {
      label: 'Clôture',
      key: 'closingDate',
      render: (row) => <span className="text-[11px] font-semibold text-slate-500">{row.closingDate ? new Date(row.closingDate).toLocaleString() : 'Active'}</span>
    },
    {
      label: 'Solde Attendu (Machine)',
      key: 'expectedAmount',
      render: (row) => <span className="font-semibold text-slate-700">{formatCurrency(row.expectedAmount)} FCFA</span>
    },
    {
      label: 'Solde Réel (Physique)',
      key: 'actualAmount',
      render: (row) => <span className="font-semibold text-slate-700">{row.status === 'OPEN' ? '---' : `${formatCurrency(row.actualAmount)} FCFA`}</span>
    },
    {
      label: 'Écart',
      key: 'discrepancy',
      render: (row) => (
        <span className={`font-black ${row.status === 'OPEN' ? 'text-slate-400' : row.discrepancy < 0 ? 'text-rose-600' : row.discrepancy > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
          {row.status === 'OPEN' ? '---' : `${formatCurrency(row.discrepancy)} FCFA`}
        </span>
      )
    },
    {
      label: 'Statut',
      key: 'status',
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${row.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
          {row.status === 'OPEN' ? 'Ouverte' : 'Clôturée'}
        </span>
      )
    }
  ];

  const transactionColumns = [
    {
      label: 'Date & Heure',
      key: 'createdAt',
      render: (row) => <span className="font-bold text-slate-500">{new Date(row.createdAt).toLocaleString()}</span>
    },
    {
      label: 'Libellé',
      key: 'label',
      render: (row) => <span className="font-black text-slate-700">{row.label}</span>
    },
    {
      label: 'Mode de règlement',
      key: 'paymentMethod',
      render: (row) => <span className="font-bold text-slate-600">{row.paymentMethod || 'ESPECES'}</span>
    },
    {
      label: 'ID Référence',
      key: 'referenceId',
      render: (row) => <span className="font-mono text-xs text-sky-600 font-bold">{row.referenceId || 'Manuel'}</span>
    },
    {
      label: 'Montant',
      key: 'amount',
      render: (row) => (
        <span className={`font-black ${row.type === 'ENCAISSEMENT' ? 'text-emerald-600' : 'text-rose-600'}`}>
          {row.type === 'ENCAISSEMENT' ? '+' : '-'}{formatCurrency(row.amount)} FCFA
        </span>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-sky-600" size={36} />
        <p className="text-slate-500 font-black uppercase text-xs tracking-widest animate-pulse">Chargement des sessions de caisse...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200">
      
      {/* 1. Header Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-sky-400 shadow-inner">
            <Landmark size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest">
              Audit & Supervision des Caisses
            </h2>
            <p className="text-xs text-sky-200/80 mt-1 font-medium">
              Suivi en temps réel de l'état des sessions de caisse, des écarts constatés et de l'historique complet des transactions.
            </p>
          </div>
        </div>
        {selectedSession && (
          <button
            onClick={() => setSelectedSession(null)}
            className="flex items-center gap-2 px-4 py-2 border border-white/20 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <ArrowLeft size={14} /> Retour à la liste
          </button>
        )}
      </div>

      {/* 2. Main content switch */}
      {!selectedSession ? (
        // SESSION LIST PANEL
        <div className="space-y-8">
          
          {/* Active Session & Pending Transfers Banner */}
          {activeSession && activeSession.caisseCode === 'CAISSE_PRINCIPALE' && pendingTransfers.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                    Fonds en attente de transfert ({pendingTransfers.length})
                  </h3>
                  <p className="text-xs text-amber-700/80 mt-1 font-semibold">
                    Vous êtes connecté à la caisse principale. Les caisses secondaires suivantes sont clôturées et attendent le transfert de leurs fonds.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTransfers.map(session => (
                  <div key={session.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Caisse</span>
                        <span className="text-xs font-black text-sky-700 uppercase">{session.caisseCode}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase">Caissier</span>
                        <span className="text-xs font-bold text-slate-700">{session.cashierUsername}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100 pt-1.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Solde Physique</span>
                        <span className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(session.actualAmount)} FCFA</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleExecuteTransfer(session.id)}
                      disabled={transferringId === session.id}
                      className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
                    >
                      {transferringId === session.id ? (
                        <>
                          <Loader2 className="animate-spin" size={12} />
                          Transfert...
                        </>
                      ) : (
                        'Recevoir les fonds'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DataTable
            title="Toutes les sessions de caisse"
            columns={sessionColumns}
            data={paginatedSessions}
            loading={loading}
            onSearch={onSearchSessions}
            searchPlaceholder="Rechercher par Réf, Caisse ou Caissier..."
            entryLabel="sessions"
            pagination={sessionsPagination}
            extraActions={(row) => (
              <div className="flex gap-1.5 justify-center">
                <button
                  onClick={() => handleSelectSession(row)}
                  title="Consulter les opérations"
                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 p-1.5 rounded transition-colors"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handlePrintSlip(row)}
                  title="Réimprimer le bordereau"
                  className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-1.5 rounded transition-colors"
                >
                  <Printer size={14} />
                </button>
              </div>
            )}
          />

          {/* Section Comptes et soldes en temps réel */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <Landmark size={18} className="text-sky-600" /> Comptes & Soldes (Temps Réel)
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 font-semibold">
                Situation financière globale de la clinique : détail des encaissements en caisses et des comptes bancaires.
              </p>
            </div>

            {loadingBalances ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-sky-600" size={24} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Caisses de trésorerie */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Caisses de Trésorerie
                  </h4>
                  <div className="space-y-2.5">
                    {caissesNomenclature.map(caisse => {
                      const balance = balances.caisses[caisse.code] || 0;
                      return (
                        <div key={caisse.code} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl hover:border-slate-300 hover:bg-slate-100/50 transition-all">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">{caisse.string1}</span>
                            <span className="text-[9px] font-black text-slate-400 font-mono uppercase">{caisse.code}</span>
                          </div>
                          <span className={`text-sm font-black font-mono ${balance > 0 ? 'text-sky-600' : 'text-slate-500'}`}>
                            {formatCurrency(balance)} FCFA
                          </span>
                        </div>
                      );
                    })}
                    {caissesNomenclature.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Aucune caisse paramétrée</p>
                    )}
                  </div>
                </div>

                {/* Comptes bancaires */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Comptes Bancaires
                  </h4>
                  <div className="space-y-2.5">
                    {comptesNomenclature.map(compte => {
                      const balance = balances.comptes[compte.code] || 0;
                      return (
                        <div key={compte.code} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl hover:border-slate-300 hover:bg-slate-100/50 transition-all">
                          <div>
                            <span className="text-xs font-bold text-slate-700 block">{compte.string1}</span>
                            <span className="text-[9px] font-black text-slate-400 font-mono uppercase">{compte.code}</span>
                          </div>
                          <span className={`text-sm font-black font-mono ${balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            {formatCurrency(balance)} FCFA
                          </span>
                        </div>
                      );
                    })}
                    {comptesNomenclature.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Aucun compte bancaire paramétré</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        // SESSION DETAIL PANEL
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Metadata Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 lg:col-span-1">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="font-black text-xs text-slate-700 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} className="text-sky-600" /> Détails Session
              </span>
              <button
                onClick={() => handlePrintSlip(selectedSession)}
                className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Printer size={12} /> Bordereau
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[8px]">Référence Session</span>
                  <span className="font-mono font-black text-slate-800">{selectedSession.sessionRef}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[8px]">Code Caisse</span>
                  <span className="font-black text-sky-700 uppercase">{selectedSession.caisseCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[8px]">Caissier Assigné</span>
                  <span className="font-black text-slate-700">{selectedSession.cashierUsername}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[8px]">Statut</span>
                  <span className={`font-bold uppercase text-[9px] ${selectedSession.status === 'OPEN' ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {selectedSession.status === 'OPEN' ? 'Ouverte' : 'Clôturée'}
                  </span>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span className="font-medium">Ouverte le :</span>
                  <span className="font-bold">{new Date(selectedSession.openingDate).toLocaleString()}</span>
                </div>
                {selectedSession.closingDate && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="font-medium">Clôturée le :</span>
                    <span className="font-bold">{new Date(selectedSession.closingDate).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-2.5 bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Solde d'Ouverture :</span>
                  <span className="font-mono font-black text-slate-800">{formatFCFA(selectedSession.openingBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>Solde Théorique Machine :</span>
                  <span className="font-mono font-black text-slate-850">{formatFCFA(selectedSession.expectedAmount)}</span>
                </div>
                {selectedSession.status !== 'OPEN' && (
                  <>
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span>Solde Physique Saisi :</span>
                      <span className="font-mono font-black text-slate-850">{formatFCFA(selectedSession.actualAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2 font-bold text-slate-800">
                      <span>Écart de Caisse :</span>
                      <span className={`font-mono font-black ${selectedSession.discrepancy < 0 ? 'text-rose-600' : selectedSession.discrepancy > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {formatFCFA(selectedSession.discrepancy)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {selectedSession.justification && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5 shadow-inner">
                  <span className="font-black text-[9px] text-amber-800 uppercase block tracking-wider">Justification de l'écart</span>
                  <p className="text-xs text-amber-700 italic leading-relaxed">{selectedSession.justification}</p>
                </div>
              )}
            </div>
          </div>

          {/* Transactions list */}
          <div className="lg:col-span-2 space-y-6">
            <DataTable
              title={`Opérations réalisées (${paginatedTransactions.length})`}
              columns={transactionColumns}
              data={paginatedTransactions}
              loading={loadingTransactions}
              onSearch={onSearchTransactions}
              searchPlaceholder="Filtrer par libellé ou mode de règlement..."
              entryLabel="opérations"
              pagination={transactionsPagination}
              extraActions={(row) => row.referenceId && row.referenceId !== 'Manuel' && row.type === 'ENCAISSEMENT' && (
                <button
                  onClick={() => handlePrintReceipt(row.referenceId, row.paymentMethod || 'ESPECES')}
                  title="Réimprimer le reçu de paiement"
                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 px-2 py-1.5 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 mx-auto transition-all cursor-pointer"
                >
                  <Printer size={12} /> Reçu
                </button>
              )}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditCaissesView;
