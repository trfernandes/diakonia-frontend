import { useEffect } from 'react';
import { useAnalytics } from './AnalyticsContext';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Liga identidade do PostHog ao ciclo de auth do app: identify+group no login,
 * reset no logout. Sem traits com PII — só ids (voluntario.id, igreja.id).
 */
export function AnalyticsIdentityBridge() {
  const posthog = useAnalytics();
  const { user, igrejaAtiva } = useAuth();
  const voluntarioId = user?.user?.id;
  const igrejaId = igrejaAtiva?.id;

  useEffect(() => {
    if (!voluntarioId) {
      posthog.reset();
      return;
    }

    posthog.identify(voluntarioId);
    if (igrejaId) {
      posthog.group('igreja', igrejaId);
    }
  }, [posthog, voluntarioId, igrejaId]);

  return null;
}
