import { ResponseIgrejaAssinaturaDto } from '../dtos/Igreja/response-igreja-assinatura.dto';

export type BillingTrialPhase = 'early' | 'warning' | 'ending' | 'expired' | 'none';

export type BillingPrimaryActionLabel =
  | 'Assinar agora'
  | 'Ver planos'
  | 'Atualizar plano'
  | 'Retomar pagamento'
  | 'Escolher plano'
  | 'Reativar assinatura';

export type BillingNoticeContent = {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: BillingPrimaryActionLabel;
  tone: 'info' | 'warning' | 'critical';
};

export function isSubscriptionWriteBlocked(
  assinatura?: ResponseIgrejaAssinaturaDto | null,
): boolean {
  if (!assinatura) return false;
  const phase = resolveBillingTrialPhase(assinatura);
  if (phase === 'expired') return true;
  if (assinatura.status === 'expired') return true;
  if (assinatura.status === 'overdue') return true;
  if (assinatura.status === 'cancelled') {
    return !assinatura.currentPeriodEnd || new Date(assinatura.currentPeriodEnd) < new Date();
  }
  return false;
}

export function isPlanLimitReached(
  assinatura: ResponseIgrejaAssinaturaDto | null | undefined,
  type: 'volunteers' | 'ministries',
): boolean {
  if (!assinatura) return false;
  if (type === 'volunteers') return assinatura.currentVolunteers >= assinatura.maxVolunteers;
  return assinatura.currentMinistries >= assinatura.maxMinistries;
}

export function hasPendingCheckout(assinatura?: ResponseIgrejaAssinaturaDto | null) {
  return Boolean(assinatura?.checkoutUrl) && assinatura?.status !== 'cancelled';
}

export function hasExceededPlanCapacity(assinatura?: ResponseIgrejaAssinaturaDto | null) {
  if (!assinatura) return false;
  return (
    assinatura.currentVolunteers > assinatura.maxVolunteers ||
    assinatura.currentMinistries > assinatura.maxMinistries
  );
}

export function resolveBillingPrimaryActionLabel(
  assinatura?: ResponseIgrejaAssinaturaDto | null,
): BillingPrimaryActionLabel {
  if (!assinatura) return 'Ver planos';

  if (hasPendingCheckout(assinatura)) {
    return 'Retomar pagamento';
  }

  if (hasExceededPlanCapacity(assinatura) && assinatura.status !== 'cancelled') {
    return 'Atualizar plano';
  }

  if (assinatura.status === 'trial') {
    return 'Assinar agora';
  }

  if (assinatura.status === 'expired') {
    return 'Escolher plano';
  }

  if (assinatura.status === 'overdue') {
    return 'Retomar pagamento';
  }

  if (assinatura.status === 'cancelled') {
    return 'Reativar assinatura';
  }

  if (assinatura.status === 'free') {
    return 'Ver planos';
  }

  return 'Ver planos';
}

export function resolveBillingTrialPhase(
  assinatura?: ResponseIgrejaAssinaturaDto | null,
): BillingTrialPhase {
  if (!assinatura) return 'none';

  if (assinatura.status === 'expired') {
    return 'expired';
  }

  if (assinatura.status !== 'trial') {
    return 'none';
  }

  const daysRemaining = Number(assinatura.daysRemainingInTrial ?? 0);

  if (daysRemaining <= 0) {
    return 'expired';
  }

  if (daysRemaining <= 2) {
    return 'ending';
  }

  if (daysRemaining <= 7) {
    return 'warning';
  }

  return 'early';
}

export function shouldShowBillingNoticeBanner(assinatura?: ResponseIgrejaAssinaturaDto | null) {
  if (!assinatura) return false;

  return (
    assinatura.status === 'trial' ||
    assinatura.status === 'expired' ||
    assinatura.status === 'overdue' ||
    Boolean(assinatura.pagamentoEmConfirmacao) ||
    hasPendingCheckout(assinatura) ||
    hasExceededPlanCapacity(assinatura) ||
    isSubscriptionWriteBlocked(assinatura)
  );
}

function formatDiaMes(iso?: string | null): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}`;
}

function formatDayCount(daysRemaining: number) {
  return `${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`;
}

export function resolveBillingNoticeContent(
  assinatura: ResponseIgrejaAssinaturaDto,
): BillingNoticeContent {
  const daysRemaining = Math.max(Number(assinatura.daysRemainingInTrial ?? 0), 0);
  const trialPhase = resolveBillingTrialPhase(assinatura);
  const ctaLabel = resolveBillingPrimaryActionLabel(assinatura);
  const pendingCheckout = hasPendingCheckout(assinatura);
  const exceededCapacity = hasExceededPlanCapacity(assinatura);

  if (assinatura.status === 'expired') {
    return {
      eyebrow: 'Avaliação encerrada',
      title: 'Seu período avaliativo terminou',
      body: 'O acesso completo aos recursos fica limitado até a assinatura ser regularizada.',
      ctaLabel,
      tone: 'critical',
    };
  }

  if (assinatura.status === 'overdue') {
    return {
      eyebrow: 'Pagamento em atraso',
      title: 'Sua cobrança está pendente',
      body: assinatura.inGracePeriod
        ? 'Há uma cobrança pendente. O acesso completo será interrompido caso não seja regularizada.'
        : 'O pagamento não foi confirmado e o acesso está limitado.',
      ctaLabel,
      tone: 'critical',
    };
  }

  if (assinatura.pagamentoEmConfirmacao) {
    const ate = formatDiaMes(assinatura.carenciaAte);
    return {
      eyebrow: 'Pagamento em confirmação',
      title: ate ? `Confirmando seu pagamento até ${ate}` : 'Confirmando seu pagamento',
      body: 'O período pago terminou e o pagamento ainda não foi confirmado. Tudo segue funcionando normalmente enquanto isso. Se não for confirmado até essa data, o app passa a só permitir consulta.',
      ctaLabel,
      tone: 'warning',
    };
  }

  if (pendingCheckout) {
    return {
      eyebrow: 'Pagamento pendente',
      title: 'Sua assinatura já pode ser concluída',
      body:
        assinatura.status === 'trial'
          ? 'Há um pagamento em aberto para quando o período avaliativo terminar.'
          : 'Há um pagamento em aberto para esta assinatura.',
      ctaLabel,
      tone: trialPhase === 'ending' ? 'warning' : 'info',
    };
  }

  if (exceededCapacity) {
    return {
      eyebrow: 'Capacidade excedida',
      title: 'Seu uso atual já ultrapassa o plano contratado',
      body:
        assinatura.status === 'trial'
          ? 'O uso atual já ultrapassa a faixa prevista para o período avaliativo.'
          : 'O uso atual já ultrapassa a capacidade contratada.',
      ctaLabel,
      tone: 'warning',
    };
  }

  if (assinatura.status === 'cancelled') {
    return {
      eyebrow: 'Assinatura cancelada',
      title: 'Sua assinatura foi encerrada',
      body: 'O acesso aos recursos completos fica limitado até a reativação da assinatura.',
      ctaLabel,
      tone: 'critical',
    };
  }

  if (trialPhase === 'expired') {
    return {
      eyebrow: 'Avaliação encerrada',
      title: 'Seu período avaliativo terminou',
      body: 'O acesso completo aos recursos fica limitado até a assinatura ser regularizada.',
      ctaLabel,
      tone: 'critical',
    };
  }

  if (trialPhase === 'ending') {
    return {
      eyebrow: 'Versão avaliativa',
      title: `${formatDayCount(daysRemaining)} restantes`,
      body: 'Seu acesso avaliativo está perto do fim.',
      ctaLabel,
      tone: 'critical',
    };
  }

  if (trialPhase === 'warning') {
    return {
      eyebrow: 'Versão avaliativa',
      title: `${formatDayCount(daysRemaining)} restantes`,
      body: 'Restam poucos dias de acesso avaliativo completo.',
      ctaLabel,
      tone: 'warning',
    };
  }

  return {
    eyebrow: 'Versão avaliativa',
    title: `${formatDayCount(daysRemaining)} restantes`,
    body: 'Você está usando o app com acesso completo durante o período avaliativo.',
    ctaLabel,
    tone: 'info',
  };
}
