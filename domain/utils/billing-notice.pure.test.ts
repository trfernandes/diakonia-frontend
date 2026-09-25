import { describe, it, expect } from 'vitest';
import { ResponseIgrejaAssinaturaDto } from '../dtos/Igreja/response-igreja-assinatura.dto';
import {
  isSubscriptionWriteBlocked,
  resolveBillingNoticeContent,
  shouldShowBillingNoticeBanner,
} from './billing-notice';

const ativa: ResponseIgrejaAssinaturaDto = {
  status: 'active',
  plan: 'essencial',
  amount: 49,
  cycle: 'MONTHLY',
  daysRemainingInTrial: 0,
  inGracePeriod: false,
  canManageBilling: true,
  currentVolunteers: 10,
  currentMinistries: 2,
  maxVolunteers: 50,
  maxMinistries: 5,
};

describe('pagamento em confirmação (E2E 3.6)', () => {
  const emCarencia: ResponseIgrejaAssinaturaDto = {
    ...ativa,
    pagamentoEmConfirmacao: true,
    carenciaAte: '2026-10-03T12:00:00.000Z',
  };

  it('mostra a faixa durante a carência', () => {
    expect(shouldShowBillingNoticeBanner(emCarencia)).toBe(true);
  });

  it('não mostra faixa pra assinatura ativa em dia', () => {
    expect(shouldShowBillingNoticeBanner(ativa)).toBe(false);
  });

  it('avisa em laranja com a data limite, sem bloquear escrita', () => {
    const conteudo = resolveBillingNoticeContent(emCarencia);
    expect(conteudo.eyebrow).toBe('Pagamento em confirmação');
    expect(conteudo.title).toContain('03/10');
    expect(conteudo.tone).toBe('warning');
    expect(isSubscriptionWriteBlocked(emCarencia)).toBe(false);
  });
});
