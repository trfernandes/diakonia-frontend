export type ResponseIgrejaAssinaturaDto = {
  status: 'trial' | 'active' | 'overdue' | 'cancelled' | 'expired' | 'free';
  plan: 'free' | 'starter' | 'essencial' | 'crescimento';
  amount: number;
  cycle: 'MONTHLY' | 'YEARLY';
  checkoutUrl?: string | null;
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
  daysRemainingInTrial: number;
  inGracePeriod: boolean;
  // E2E 3.6: período pago venceu há ≤3 dias e o pagamento ainda não caiu. Escrita segue
  // liberada até `carenciaAte`; depois o cron marca OVERDUE.
  pagamentoEmConfirmacao?: boolean;
  carenciaAte?: string | null;
  canManageBilling: boolean;
  hasPendingPlanChange?: boolean;
  currentVolunteers: number;
  currentMinistries: number;
  maxVolunteers: number;
  maxMinistries: number;
};
