import { useCallback, useEffect, useState } from 'react';
import { hasRole } from '../services/auth';
import { invoiceService, medicalService, prestationService } from '../services/api';

/**
 * Actions / notifications en attente selon le rôle de l'utilisateur connecté.
 */
export function usePendingNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (hasRole('SUPER_ADMIN')) {
      setItems([]);
      return;
    }
    setLoading(true);
    const list = [];
    try {
      if (
        hasRole('ADMIN') ||
        hasRole('MANAGER_CLINIQUE') ||
        hasRole('MANAGER') ||
        hasRole('CAISSIER') ||
        hasRole('COMPTABLE')
      ) {
        try {
          const res = await prestationService.getPendingCancellations();
          const pending = res.data || [];
          pending.forEach((c) => {
            list.push({
              id: `cancel-${c.id}`,
              label: c.patientName
                ? `Annulation — ${c.patientName}`
                : 'Demande d\'annulation à traiter',
              tab: 'annulations',
              type: 'warning',
            });
          });
        } catch {
          /* ignore */
        }
      }

      if (hasRole('CAISSIER') || hasRole('COMPTABLE') || hasRole('MANAGER') || hasRole('ADMIN')) {
        try {
          const res = await invoiceService.getAll();
          const invoices = res.data || [];
          const toPay = invoices.filter(
            (i) => i.status === 'PENDING' || i.status === 'PARTIAL'
          );
          if (toPay.length > 0) {
            list.push({
              id: 'invoices-pending',
              label: `${toPay.length} facture(s) à encaisser`,
              tab: 'a-encaisser',
              type: 'info',
            });
          }
        } catch {
          /* ignore */
        }
      }

      if (hasRole('INFIRMIER')) {
        try {
          const res = await medicalService.getVitalsQueue();
          const queue = res.data || [];
          if (queue.length > 0) {
            list.push({
              id: 'vitals-queue',
              label: `${queue.length} patient(s) — constantes à saisir`,
              tab: 'prise-constantes',
              type: 'info',
            });
          }
        } catch {
          /* ignore */
        }
      }
    } finally {
      setItems(list);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 120_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { items, loading, refresh, count: items.length };
}
