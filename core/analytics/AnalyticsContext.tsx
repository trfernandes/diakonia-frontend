import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePostHog, type PostHog } from 'posthog-react-native';

const AnalyticsClientContext = createContext<PostHog | undefined>(undefined);

/**
 * Expõe o client do PostHog pro resto do app. Só renderizar dentro de
 * <PostHogProvider> — é o único lugar onde `usePostHog()` tem client.
 */
export function PostHogClientBridge({ children }: { children: ReactNode }) {
  const posthog = usePostHog();
  return (
    <AnalyticsClientContext.Provider value={posthog}>{children}</AnalyticsClientContext.Provider>
  );
}

/**
 * Use no lugar de `usePostHog()`. Sem EXPO_PUBLIC_POSTHOG_KEY (dev/e2e) o
 * AnalyticsProvider não monta o PostHogProvider: `usePostHog()` loga
 * console.error (LogBox vermelho) e devolve undefined, e `posthog.capture`
 * quebra com TypeError. Aqui vira no-op.
 */
export function useAnalytics() {
  const client = useContext(AnalyticsClientContext);

  return useMemo(
    () => ({
      capture: (...args: Parameters<PostHog['capture']>) => {
        client?.capture(...args);
      },
      identify: (...args: Parameters<PostHog['identify']>) => {
        client?.identify(...args);
      },
      group: (...args: Parameters<PostHog['group']>) => {
        client?.group(...args);
      },
      reset: (...args: Parameters<PostHog['reset']>) => {
        client?.reset(...args);
      },
    }),
    [client],
  );
}
