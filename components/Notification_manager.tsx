import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import { emitNotificationEvent } from '../core/events/notification-events';
import { openNotification } from '../services/notification-routing';
import { NotificacaoTipoEnum } from '../domain/enums/Notificacao/tipo-notificacao.enum';
import { useAuth } from '../contexts/AuthContext';
import { useAnalytics } from '../core/analytics/AnalyticsContext';
import { AnalyticsEvent, buildPushAbertoProps } from '../core/analytics/events';

export function NotificationsManager() {
  const { refreshMe } = useAuth();
  const posthog = useAnalytics();
  const lastResponseHandled = useRef(false);
  const refreshMeRef = useRef(refreshMe);
  refreshMeRef.current = refreshMe;

  useEffect(() => {
    // Cold-start: app aberto do estado "killed" via toque na notificação
    const handleLastNotification = async () => {
      if (lastResponseHandled.current) return;
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        lastResponseHandled.current = true;
        const data = lastResponse.notification.request.content.data as any;
        console.log('[Notifications] Cold-start notification:', data);
        posthog.capture(
          AnalyticsEvent.PushAberto,
          buildPushAbertoProps({ tipo: String(data?.tipo ?? 'desconhecido') }),
        );
        // Delay para garantir que a navegação esteja pronta
        setTimeout(() => openNotification(data, 'push', refreshMeRef.current), 500);
      }
    };
    handleLastNotification();

    // Notificação recebida em foreground
    const subRec = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Recebida:', notification.request.content);
      const payload = (notification.request.content.data as Record<string, any>) || {};
      const tipo = payload?.tipo as string | undefined;

      if (tipo === NotificacaoTipoEnum.EscalaGerada) {
        Toast.show({
          type: 'success',
          text1: 'Escala gerada com sucesso!',
          text2: notification.request.content.body ?? undefined,
        });
      } else if (tipo === NotificacaoTipoEnum.EscalaErroGerada) {
        Toast.show({
          type: 'error',
          text1: 'Falha na geração da escala',
          text2: notification.request.content.body ?? undefined,
        });
      }

      emitNotificationEvent('notification_received_foreground', { payload });
    });

    // Notificação clicada (foreground ou background)
    const subClick = Notifications.addNotificationResponseReceivedListener((response) => {
      lastResponseHandled.current = true;
      const data = response.notification.request.content.data as any;
      console.log('[Notifications] Clicada, data:', data);
      posthog.capture(
        AnalyticsEvent.PushAberto,
        buildPushAbertoProps({ tipo: String(data?.tipo ?? 'desconhecido') }),
      );
      openNotification(data, 'push', refreshMeRef.current);
    });

    return () => {
      subRec.remove();
      subClick.remove();
    };
  }, [posthog]);

  return null;
}
