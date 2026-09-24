import { Pressable, StyleSheet, View } from 'react-native';
import FancyCardIcon from '../../cards/Horizontal/FancyCardIcon';
import FancyText from '../../FancyText';
import { ResponseNotificacaoDto } from '../../../domain/dtos/Notificacao/notificacao.response';
import { NotificacaoTipoEnum } from '../../../domain/enums/Notificacao/tipo-notificacao.enum';
import { CustomIconProps } from '../../FancyIcons';
import { usePallete } from '../../../hooks/usePallete';
import DefaultIcons from '../../FancyIcons';
import { ColorUtils } from '../../../utils/color_utils';
import { getNotificationSubtitle } from './notification-display';

type NotificationTone = 'blue' | 'cyan' | 'green' | 'amber' | 'red' | 'violet' | 'gray';
type NotificationCardTheme = {
  icon: CustomIconProps;
  tone: NotificationTone;
  label: string;
};

export function timeAgoLong(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'agora mesmo';
  const min = Math.floor(diff / 60);
  if (min < 60) return `${min} minuto${min > 1 ? 's' : ''} atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} hora${h > 1 ? 's' : ''} atrás`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} dia${d > 1 ? 's' : ''} atrás`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} ${m > 1 ? 'meses' : 'mês'} atrás`;
  const y = Math.floor(m / 12);
  return `${y} ano${y > 1 ? 's' : ''} atrás`;
}

const makeIcon = (name: CustomIconProps['name']): CustomIconProps => ({
  library: 'MaterialCommunityIcons',
  name,
  size: 16,
});

export function getNotificationToneColor(tone: NotificationTone) {
  const tones: Record<NotificationTone, string> = {
    blue: '#2F80ED',
    cyan: '#0EA5B7',
    green: '#2E9D64',
    amber: '#B7791F',
    red: '#D14B4B',
    violet: '#6D5BD0',
    gray: '#667085',
  };

  return tones[tone];
}

// Cada tipo mapeia para: ícone semântico + cor categórica + label orientado ao evento
export const NOTIFICACAO_THEMES: Record<NotificacaoTipoEnum, NotificationCardTheme> = {
  // ── Escala: lembrete & publicação (azul — informativo) ──────────────────
  [NotificacaoTipoEnum.EscalaLembrete]: {
    icon: makeIcon('bell-ring-outline'),
    tone: 'blue',
    label: 'Lembrete de escala',
  },
  [NotificacaoTipoEnum.EscalaPublicada]: {
    icon: makeIcon('calendar-check'),
    tone: 'blue',
    label: 'Nova escala',
  },
  [NotificacaoTipoEnum.EscalaAtualizada]: {
    icon: makeIcon('calendar-edit'),
    tone: 'amber',
    label: 'Escala alterada',
  },
  [NotificacaoTipoEnum.EscalaAlterada]: {
    icon: makeIcon('calendar-edit'),
    tone: 'amber',
    label: 'Escala alterada',
  },

  // ── Escala: geração assíncrona ──────────────────────────────────────────
  [NotificacaoTipoEnum.EscalaGerada]: {
    icon: makeIcon('calendar-check-outline'),
    tone: 'green',
    label: 'Escala gerada',
  },
  [NotificacaoTipoEnum.EscalaErroGerada]: {
    icon: makeIcon('calendar-alert'),
    tone: 'red',
    label: 'Falha na geração',
  },

  // ── Escala: cancelamento & conflito (vermelho — urgente) ────────────────
  [NotificacaoTipoEnum.EscalaCancelada]: {
    icon: makeIcon('calendar-remove'),
    tone: 'red',
    label: 'Escala cancelada',
  },
  [NotificacaoTipoEnum.IndisponibilidadeConflito]: {
    icon: makeIcon('calendar-alert'),
    tone: 'red',
    label: 'Conflito de escala',
  },
  [NotificacaoTipoEnum.LancamentoIndisponibilidadeCriado]: {
    icon: makeIcon('calendar-edit'),
    tone: 'blue',
    label: 'Cadastre suas indisponibilidades',
  },
  [NotificacaoTipoEnum.LancamentoIndisponibilidadeLembrete]: {
    icon: makeIcon('calendar-edit'),
    tone: 'blue',
    label: 'Lembrete de indisponibilidades',
  },
  [NotificacaoTipoEnum.LancamentoIndisponibilidadeVespera]: {
    icon: makeIcon('calendar-clock'),
    tone: 'amber',
    label: 'Prazo termina amanhã',
  },

  // ── Confirmação de presença (âmbar — aguardando ação) ───────────────────
  [NotificacaoTipoEnum.EscalaConfirmacaoSolicitada]: {
    icon: makeIcon('calendar-question'),
    tone: 'amber',
    label: 'Confirme sua presença',
  },
  [NotificacaoTipoEnum.EscalaConfirmacaoPendente]: {
    icon: makeIcon('calendar-question'),
    tone: 'amber',
    label: 'Confirme sua presença',
  },

  // ── Substituição: solicitação (roxo — requer decisão) ───────────────────
  [NotificacaoTipoEnum.EscalaSubstituicaoSolicitada]: {
    icon: makeIcon('account-switch'),
    tone: 'violet',
    label: 'Substituição solicitada',
  },
  [NotificacaoTipoEnum.EscalaSubstituicaoSolicitadaLider]: {
    icon: makeIcon('account-switch'),
    tone: 'violet',
    label: 'Pedido de substituição',
  },
  [NotificacaoTipoEnum.EscalaTrocaSolicitada]: {
    icon: makeIcon('swap-horizontal'),
    tone: 'violet',
    label: 'Troca de escala solicitada',
  },

  // ── Substituição: resolução (verde — concluído) ──────────────────────────
  [NotificacaoTipoEnum.EscalaSubstituicaoAceita]: {
    icon: makeIcon('account-check'),
    tone: 'green',
    label: 'Substituição aceita',
  },
  [NotificacaoTipoEnum.EscalaSubstituicaoRecusada]: {
    icon: makeIcon('account-cancel'),
    tone: 'red',
    label: 'Substituição recusada',
  },
  [NotificacaoTipoEnum.EscalaSubstituicaoResolvidaLider]: {
    icon: makeIcon('account-check-outline'),
    tone: 'green',
    label: 'Substituição resolvida',
  },
  [NotificacaoTipoEnum.EscalaTrocaAprovada]: {
    icon: makeIcon('swap-horizontal'),
    tone: 'green',
    label: 'Troca aprovada',
  },

  // ── Presença de voluntário (perspectiva do líder) ────────────────────────
  [NotificacaoTipoEnum.EscalaVoluntarioConfirmou]: {
    icon: makeIcon('check-circle-outline'),
    tone: 'green',
    label: 'Presença confirmada',
  },
  [NotificacaoTipoEnum.EscalaVoluntarioRecusou]: {
    icon: makeIcon('close-circle-outline'),
    tone: 'red',
    label: 'Presença recusada',
  },

  // ── Ministério ───────────────────────────────────────────────────────────
  [NotificacaoTipoEnum.MinisterioNovoIntegrante]: {
    icon: makeIcon('account-plus'),
    tone: 'green',
    label: 'Novo integrante',
  },
  [NotificacaoTipoEnum.ComunicadoLider]: {
    icon: makeIcon('bullhorn-outline'),
    tone: 'cyan',
    label: 'Comunicado',
  },

  // ── Igreja ───────────────────────────────────────────────────────────────
  [NotificacaoTipoEnum.IgrejaConviteAceito]: {
    icon: makeIcon('handshake'),
    tone: 'green',
    label: 'Convite aceito',
  },
  [NotificacaoTipoEnum.IgrejaVinculoSolicitado]: {
    icon: makeIcon('account-clock'),
    tone: 'amber',
    label: 'Solicitação de vínculo',
  },
  [NotificacaoTipoEnum.IgrejaVinculoAprovado]: {
    icon: makeIcon('church'),
    tone: 'green',
    label: 'Vínculo aprovado',
  },
  [NotificacaoTipoEnum.IgrejaVinculoNegado]: {
    icon: makeIcon('church'),
    tone: 'red',
    label: 'Vínculo recusado',
  },
  [NotificacaoTipoEnum.IgrejaNovoVoluntario]: {
    icon: makeIcon('account-plus-outline'),
    tone: 'green',
    label: 'Novo voluntário',
  },
  [NotificacaoTipoEnum.IgrejaConviteExpirado]: {
    icon: makeIcon('timer-sand-complete'),
    tone: 'amber',
    label: 'Convite expirado',
  },

  // ── Sistema ──────────────────────────────────────────────────────────────
  [NotificacaoTipoEnum.SistemaAlertaAdmin]: {
    icon: makeIcon('shield-alert-outline'),
    tone: 'gray',
    label: 'Alerta do sistema',
  },
  [NotificacaoTipoEnum.TesteLocal]: {
    icon: makeIcon('flask-outline'),
    tone: 'violet',
    label: 'Teste',
  },
  [NotificacaoTipoEnum.Generic]: {
    icon: makeIcon('bell-outline'),
    tone: 'blue',
    label: 'Notificação',
  },
};

export const DEFAULT_NOTIFICATION_THEME = NOTIFICACAO_THEMES[NotificacaoTipoEnum.Generic];

export default function NotificacaoCard({
  data,
  onPress,
}: {
  data: ResponseNotificacaoDto;
  onPress?: (notification: ResponseNotificacaoDto) => void;
}) {
  const Pallete = usePallete();

  const createdAt = data.criadaEm || data.createdAt;
  const createdDate = createdAt ? new Date(createdAt) : null;
  const timeLabelLong = createdDate ? timeAgoLong(createdDate) : '';
  const theme = data.tipo
    ? (NOTIFICACAO_THEMES[data.tipo] ?? DEFAULT_NOTIFICATION_THEME)
    : DEFAULT_NOTIFICATION_THEME;
  const accentColor = getNotificationToneColor(theme.tone);
  const title = theme.label;
  const subtitle = getNotificationSubtitle(data);

  const a11yLabel = [title + '.', subtitle ? subtitle + '.' : null, timeLabelLong + '.']
    .filter(Boolean)
    .join(' ');

  return (
    <Pressable
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      onPress={() => onPress?.(data)}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11yLabel}
    >
      <FancyCardIcon
        backgroundColor={ColorUtils.withAlpha(accentColor, 0.045)}
        cardIcon={{
          ...theme.icon,
          backgroundColor: ColorUtils.withAlpha(accentColor, 0.14),
          color: accentColor,
        }}
        containerStyle={[
          styles.cardContainer,
          { borderColor: ColorUtils.withAlpha(accentColor, 0.08) },
        ]}
        centerContainerStyle={styles.centerContainer}
        contentContainerStyle={styles.cardContent}
        actionButtons={
          <View style={styles.chevronContainer}>
            <DefaultIcons.Custom
              library='MaterialCommunityIcons'
              name='chevron-right'
              size={22}
              color={Pallete.fonts.inactive}
            />
          </View>
        }
        title={
          <View style={styles.mainBlock}>
            <View style={styles.titleRow}>
              <FancyText
                size='small'
                type='bold'
                numberOfLines={1}
                style={[styles.titleText, { color: accentColor }]}
              >
                {title}
              </FancyText>
              {timeLabelLong ? (
                <>
                  <FancyText
                    size='extraSmall'
                    type='medium'
                    style={[styles.timeSeparator, { color: Pallete.fonts.inactive }]}
                    accessibilityElementsHidden
                  >
                    •
                  </FancyText>
                  <FancyText
                    size='extraSmall'
                    type='medium'
                    numberOfLines={1}
                    style={[styles.timeText, { color: Pallete.fonts.inactive }]}
                    accessibilityElementsHidden
                  >
                    {timeLabelLong}
                  </FancyText>
                </>
              ) : null}
            </View>
            {subtitle ? (
              <FancyText
                type='medium'
                size='extraSmall'
                style={[
                  styles.messageText,
                  { color: ColorUtils.withAlpha(Pallete.fonts.dark, 0.68) },
                ]}
              >
                {subtitle}
              </FancyText>
            ) : null}
          </View>
        }
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.85,
  },
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1,
  },
  cardContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 7,
  },
  centerContainer: {
    gap: 0,
  },
  mainBlock: {
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  titleText: {
    flexShrink: 1,
    opacity: 0.94,
    lineHeight: 18,
  },
  messageText: {
    lineHeight: 15,
  },
  timeText: {
    lineHeight: 13,
    opacity: 0.75,
    flexShrink: 0,
    textAlignVertical: 'center',
  },
  timeSeparator: {
    lineHeight: 13,
    opacity: 0.55,
    flexShrink: 0,
  },
  chevronContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: 24,
  },
});
