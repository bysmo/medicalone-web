const DEFAULT_PAYMENTS = [
  {
    id: 'pay-101',
    clinicId: 'clinic-1',
    clinicName: 'Clinique Saint-François',
    planName: 'Plan Professionnel',
    amount: 350,
    paymentDate: '2026-05-10',
    paymentMethod: 'TRANSFER',
    reference: 'TXN-902183921',
    status: 'COMPLETED',
    notes: 'Virement de règlement de la mensualité de mai.'
  },
  {
    id: 'pay-102',
    clinicId: 'clinic-2',
    clinicName: 'Clinique du Soleil',
    planName: 'Plan Standard',
    amount: 150,
    paymentDate: '2026-05-08',
    paymentMethod: 'CREDIT_CARD',
    reference: 'STRIPE-CHG-9281',
    status: 'COMPLETED',
    notes: 'Paiement en ligne par carte bancaire (Stripe).'
  },
  {
    id: 'pay-103',
    clinicId: 'clinic-3',
    clinicName: 'Hôpital Privé de l\'Est',
    planName: 'Plan Entreprise',
    amount: 750,
    paymentDate: '2026-05-05',
    paymentMethod: 'TRANSFER',
    reference: 'TXN-876123004',
    status: 'COMPLETED',
    notes: 'Facture annuelle anticipée - virement reçu.'
  },
  {
    id: 'pay-104',
    clinicId: 'clinic-4',
    clinicName: 'Polyclinique du Centre',
    planName: 'Plan Professionnel',
    amount: 350,
    paymentDate: '2026-05-15',
    paymentMethod: 'TRANSFER',
    reference: 'REF-PEND-2810',
    status: 'PENDING',
    notes: 'Virement initié par le client, en attente de confirmation bancaire.'
  }
];

export const paymentsStore = {
  getPayments: () => {
    const data = localStorage.getItem('alphacure_saas_payments');
    if (!data) {
      localStorage.setItem('alphacure_saas_payments', JSON.stringify(DEFAULT_PAYMENTS));
      return DEFAULT_PAYMENTS;
    }
    return JSON.parse(data);
  },

  savePayments: (payments) => {
    localStorage.setItem('alphacure_saas_payments', JSON.stringify(payments));
  },

  addPayment: (payment) => {
    const payments = paymentsStore.getPayments();
    const paymentWithId = {
      ...payment,
      id: 'pay-' + Date.now(),
      status: payment.status || 'COMPLETED'
    };
    payments.unshift(paymentWithId);
    paymentsStore.savePayments(payments);
    return paymentWithId;
  },

  updatePaymentStatus: (id, newStatus) => {
    const payments = paymentsStore.getPayments();
    const index = payments.findIndex(p => p.id === id);
    if (index !== -1) {
      payments[index].status = newStatus;
      paymentsStore.savePayments(payments);
      return true;
    }
    return false;
  }
};
