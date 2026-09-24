import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { NotificacaoTipoEnum } from '../domain/enums/Notificacao/tipo-notificacao.enum';
import { emitNotificationEvent } from '../core/events/notification-events';

type NotificationPayload = Record<string, any> | null | undefined;

export type NotificationNavigationTarget = {
  pathname: string;
  params?: Record<string, string | number | boolean>;
};

const ROUTABLE_PREFIXES = [
  '/(',
  '/notifications',
  '/admin',
  '/ministerios',
  '/pessoal',
  '/join-church',
  '/invite',
  '/inicio',
  '/configuracoes',
] as const;

function normalizePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function isExpoRouterPath(pathname: string): boolean {
  return ROUTABLE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function coercePayload(rawPayload: NotificationPayload): Record<string, any> | null {
  if (!rawPayload || typeof rawPayload !== 'object') return null;
  const payload = rawPayload as Record<string, any>;
  const nestedData = payload.data;

  if (nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)) {
    return {
      ...payload,
      ...(nestedData as Record<string, any>),
    };
  }

  return payload;
}

function getNotificationType(payload: Record<string, any>): string | undefined {
  const rawType =
    typeof payload.tipo === 'string'
      ? payload.tipo
      : typeof payload.type === 'string'
        ? payload.type
        : undefined;

  return rawType?.toUpperCase();
}

function normalizeParams(
  params?: Record<string, any>,
): Record<string, string | number | boolean> | undefined {
  if (!params || typeof params !== 'object') return undefined;

  const normalized: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value;
    } else {
      normalized[key] = JSON.stringify(value);
    }
  }
  return Object.keys(normalized).length ? normalized : undefined;
}

function firstString(payload: Record<string, any>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function resolveDateParam(payload: Record<string, any>, keys: string[]) {
  const value = firstString(payload, keys);
  if (!value) return undefined;
  return value.slice(0, 10);
}

function resolveScaleDateParams(payload: Record<string, any>) {
  const selectedDate = resolveDateParam(payload, [
    'selectedDate',
    'dataOcorrencia',
    'dataEvento',
    'date',
    'data',
  ]);
  const month = resolveDateParam(payload, [
    'month',
    'mes',
    'dataReferencia',
    'referenceDate',
    'dataInicio',
  ]);
  return normalizeParams({ selectedDate, dataOcorrencia: selectedDate, month });
}

function resolveEscalaSpecificTarget(
  payload: Record<string, any>,
): NotificationNavigationTarget | null {
  const escalaId = firstString(payload, ['escalaId', 'idEscala', 'escala_id']);
  const ministerioId = firstString(payload, ['ministerioId', 'idMinisterio', 'ministerio_id']);
  const dateParams = resolveScaleDateParams(payload);

  if (escalaId && ministerioId) {
    return {
      pathname: '/(app)/(drawer)/ministerios/escalas/details',
      params: {
        escalaId,
        ministerioId,
        viewMode: 'view',
      },
    };
  }

  if (escalaId) {
    return {
      pathname: '/(app)/(drawer)/pessoal/escalas',
      params: {
        escalaId,
        ...(dateParams ?? {}),
      },
    };
  }

  if (dateParams) {
    return {
      pathname: '/(app)/(drawer)/pessoal/escalas',
      params: dateParams,
    };
  }

  return null;
}

function isCalendarMonthChange(payload: Record<string, any>) {
  const tipo = getNotificationType(payload);
  const assunto =
    `${payload.assunto ?? ''} ${payload.contexto ?? ''} ${payload.categoria ?? ''} ${payload.mensagem ?? ''} ${payload.titulo ?? ''}`.toUpperCase();
  return (
    tipo === 'CALENDARIO_MES_ATUALIZADO' ||
    tipo === 'MES_ATUALIZADO' ||
    assunto.includes('MÊS') ||
    assunto.includes('MES')
  );
}

function resolveCalendarMonthTarget(payload: Record<string, any>): NotificationNavigationTarget {
  const month = resolveDateParam(payload, [
    'month',
    'mes',
    'dataReferencia',
    'referenceDate',
    'dataInicio',
    'data',
  ]);
  return {
    pathname: '/(app)/(drawer)/pessoal/escalas',
    params: normalizeParams({ month, dataReferencia: month }),
  };
}

function parseRouteWithQuery(route: string): NotificationNavigationTarget | null {
  const [rawPath, rawQuery] = route.split('?');
  const pathname = normalizePath(rawPath || '');
  if (!pathname) return null;
  if (!isExpoRouterPath(pathname)) return null;

  if (!rawQuery) {
    return { pathname };
  }

  const params: Record<string, string> = {};
  const searchParams = new URLSearchParams(rawQuery);
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  return { pathname, params: Object.keys(params).length ? params : undefined };
}

function resolveLegacyDeepLinkPath(path: string): NotificationNavigationTarget | null {
  const normalized = path.replace(/^\/+/, '');

  if (/^igrejas\/[^/]+\/solicitacoes\/[^/]+$/i.test(normalized)) {
    return { pathname: '/(app)/(drawer)/admin/solicitacoes' };
  }

  if (/^igrejas\/[^/]+\/escalas\/[^/]+(?:\/eventos\/[^/]+)?$/i.test(normalized)) {
    return { pathname: '/(app)/(drawer)/pessoal/escalas' };
  }

  if (/^minhas-solicitacoes\/[^/]+$/i.test(normalized)) {
    return { pathname: '/(app)/join-church/requests' };
  }

  return null;
}

function resolveLegacyRouteName(route: string): NotificationNavigationTarget | null {
  switch (route.trim()) {
    case 'EscalaDetalhe':
    case 'Escalas':
      return { pathname: '/(app)/(drawer)/pessoal/escalas' };
    case 'IgrejaSolicitacoes':
      return { pathname: '/(app)/(drawer)/admin/solicitacoes' };
    case 'MinhasSolicitacoes':
      return { pathname: '/(app)/join-church/requests' };
    default:
      return null;
  }
}

function resolveFromDeepLink(deepLink: string): NotificationNavigationTarget | null {
  const trimmed = deepLink.trim();
  if (!trimmed) return null;

  if (trimmed.includes('://')) {
    const parsed = Linking.parse(trimmed);
    const parsedPath = parsed.path || '';
    const fromPath = parseRouteWithQuery(parsedPath);
    if (!fromPath) {
      return resolveLegacyDeepLinkPath(parsedPath);
    }
    return {
      pathname: fromPath.pathname,
      params: normalizeParams(parsed.queryParams as Record<string, any>),
    };
  }

  return parseRouteWithQuery(trimmed) ?? resolveLegacyDeepLinkPath(trimmed);
}

function resolveByTipo(payload: Record<string, any>): NotificationNavigationTarget {
  const tipo = getNotificationType(payload);

  switch (tipo) {
    case NotificacaoTipoEnum.EscalaLembrete:
    case NotificacaoTipoEnum.EscalaPublicada:
    case 'ESCALA_ATUALIZADA':
    case NotificacaoTipoEnum.EscalaAlterada:
    case NotificacaoTipoEnum.EscalaCancelada:
    case 'ESCALA_CONFIRMACAO_SOLICITADA':
    case NotificacaoTipoEnum.EscalaConfirmacaoPendente:
    case NotificacaoTipoEnum.EscalaSubstituicaoSolicitada:
    case 'ESCALA_TROCA_SOLICITADA':
    case NotificacaoTipoEnum.EscalaSubstituicaoAceita:
    case 'ESCALA_TROCA_APROVADA':
    case NotificacaoTipoEnum.EscalaSubstituicaoRecusada:
    case NotificacaoTipoEnum.EscalaVoluntarioConfirmou:
    case NotificacaoTipoEnum.EscalaVoluntarioRecusou:
    case NotificacaoTipoEnum.EscalaSubstituicaoSolicitadaLider:
    case NotificacaoTipoEnum.EscalaSubstituicaoResolvidaLider:
    case NotificacaoTipoEnum.IndisponibilidadeConflito:
    case NotificacaoTipoEnum.EscalaGerada:
    case NotificacaoTipoEnum.EscalaErroGerada:
    case 'TESTE_LOCAL':
      return (
        resolveEscalaSpecificTarget(payload) ?? { pathname: '/(app)/(drawer)/pessoal/escalas' }
      );

    // Pedido do líder pra cadastrar indisponibilidades: card "Já lancei" fica no topo dessa tela.
    case NotificacaoTipoEnum.LancamentoIndisponibilidadeCriado:
    case NotificacaoTipoEnum.LancamentoIndisponibilidadeLembrete:
    case NotificacaoTipoEnum.LancamentoIndisponibilidadeVespera:
      return { pathname: '/(app)/(drawer)/pessoal/indisponibilidade' };

    case NotificacaoTipoEnum.MinisterioNovoIntegrante:
    case 'COMUNICADO_LIDER':
      return { pathname: '/(app)/(drawer)/ministerios' };

    case NotificacaoTipoEnum.IgrejaVinculoSolicitado:
      return { pathname: '/(app)/(drawer)/admin/solicitacoes' };

    case NotificacaoTipoEnum.IgrejaConviteAceito:
    case NotificacaoTipoEnum.IgrejaNovoVoluntario:
      return { pathname: '/(app)/(drawer)/admin/voluntarios' };

    case NotificacaoTipoEnum.IgrejaVinculoAprovado:
    case NotificacaoTipoEnum.IgrejaVinculoNegado:
      return { pathname: '/(app)/(drawer)/inicio' };

    case NotificacaoTipoEnum.IgrejaConviteExpirado:
    case 'GENERIC':
    default:
      return { pathname: '/notifications' };
  }
}

const TYPE_CANONICAL_TARGETS = new Set<string>([
  NotificacaoTipoEnum.EscalaLembrete,
  NotificacaoTipoEnum.EscalaPublicada,
  NotificacaoTipoEnum.EscalaAtualizada,
  NotificacaoTipoEnum.EscalaAlterada,
  NotificacaoTipoEnum.EscalaCancelada,
  NotificacaoTipoEnum.EscalaConfirmacaoSolicitada,
  NotificacaoTipoEnum.EscalaConfirmacaoPendente,
  NotificacaoTipoEnum.EscalaSubstituicaoSolicitada,
  NotificacaoTipoEnum.EscalaTrocaSolicitada,
  NotificacaoTipoEnum.EscalaSubstituicaoAceita,
  NotificacaoTipoEnum.EscalaTrocaAprovada,
  NotificacaoTipoEnum.EscalaSubstituicaoRecusada,
  NotificacaoTipoEnum.EscalaVoluntarioConfirmou,
  NotificacaoTipoEnum.EscalaVoluntarioRecusou,
  NotificacaoTipoEnum.EscalaSubstituicaoSolicitadaLider,
  NotificacaoTipoEnum.EscalaSubstituicaoResolvidaLider,
  NotificacaoTipoEnum.IndisponibilidadeConflito,
  NotificacaoTipoEnum.LancamentoIndisponibilidadeCriado,
  NotificacaoTipoEnum.LancamentoIndisponibilidadeLembrete,
  NotificacaoTipoEnum.LancamentoIndisponibilidadeVespera,
  NotificacaoTipoEnum.MinisterioNovoIntegrante,
  NotificacaoTipoEnum.ComunicadoLider,
  NotificacaoTipoEnum.IgrejaVinculoSolicitado,
  NotificacaoTipoEnum.IgrejaConviteAceito,
  NotificacaoTipoEnum.IgrejaNovoVoluntario,
  NotificacaoTipoEnum.IgrejaVinculoAprovado,
  NotificacaoTipoEnum.IgrejaVinculoNegado,
  NotificacaoTipoEnum.IgrejaConviteExpirado,
  NotificacaoTipoEnum.SistemaAlertaAdmin,
  NotificacaoTipoEnum.TesteLocal,
  NotificacaoTipoEnum.EscalaGerada,
  NotificacaoTipoEnum.EscalaErroGerada,
]);

export function resolveNotificationTarget(
  rawPayload: NotificationPayload,
): NotificationNavigationTarget | null {
  const payload = coercePayload(rawPayload);
  if (!payload) return null;

  if (isCalendarMonthChange(payload)) {
    return resolveCalendarMonthTarget(payload);
  }

  const tipo = getNotificationType(payload);
  if (tipo && TYPE_CANONICAL_TARGETS.has(tipo)) {
    return resolveByTipo(payload);
  }

  const deepLink =
    typeof payload.deepLink === 'string'
      ? payload.deepLink
      : typeof payload.deeplink === 'string'
        ? payload.deeplink
        : undefined;
  if (deepLink) {
    const deepLinkTarget = resolveFromDeepLink(deepLink);
    if (deepLinkTarget) return deepLinkTarget;
  }

  const route = typeof payload.route === 'string' ? payload.route : undefined;
  if (route) {
    const routeTarget = parseRouteWithQuery(route) ?? resolveLegacyRouteName(route);
    if (routeTarget) {
      return {
        pathname: routeTarget.pathname,
        params: normalizeParams(payload.params as Record<string, any>) ?? routeTarget.params,
      };
    }
  }

  return resolveByTipo(payload);
}

const TYPES_REQUIRING_FRESH_USER_DATA = new Set<string>([
  NotificacaoTipoEnum.IgrejaVinculoAprovado,
  NotificacaoTipoEnum.IgrejaVinculoNegado,
]);

export async function openNotification(
  rawPayload: NotificationPayload,
  source: 'push' | 'inbox' | 'unknown' = 'unknown',
  refreshMe?: () => Promise<unknown>,
) {
  const payload = coercePayload(rawPayload);
  const target = resolveNotificationTarget(rawPayload);
  if (!target) return false;

  const tipo = payload ? getNotificationType(payload) : undefined;
  if (tipo && TYPES_REQUIRING_FRESH_USER_DATA.has(tipo) && refreshMe) {
    await refreshMe().catch(() => {});
  }

  if (target.params && Object.keys(target.params).length > 0) {
    router.push({
      pathname: target.pathname as any,
      params: target.params as any,
    });
  } else {
    router.push(target.pathname as any);
  }

  emitNotificationEvent('notification_opened', {
    payload: payload || {},
    source,
  });
  return true;
}
