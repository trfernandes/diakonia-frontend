import { StyleSheet, View } from 'react-native';
import { ResponseEscalaDto } from '../../../../../domain/dtos/Escala/escala.response';
import { EscalaStatusEnum } from '../../../../../domain/enums/Escala/escala-status.enum';
import { EscalaOrigemEnum } from '../../../../../domain/enums/Escala/escala-origem.enum';
import { EscalaItemStatusEnum } from '../../../../../domain/enums/Escala/escala-item-status.enum';
import EscalaHeader, { InlineAction } from './EscalaHeader';
import { useMemo } from 'react';
import { StatusDistribution } from './escalaHeader.utils';
import { DateUtilsApi } from '../../../../../utils/date_utils';

export default function Header({
  escala,
  viewMode,
  isRegenerating,
  isPublishing,
  isScreenBlocked,
  onInsightsPress,
  onPublishPress,
  onGeneratePress,
  onDeletePress,
  onParametrizacaoPress,
  qtdPessoasMarcadas = 0,
}: {
  escala?: ResponseEscalaDto;
  viewMode?: 'view' | 'edit';
  isRegenerating?: boolean;
  isPublishing?: boolean;
  isScreenBlocked?: boolean;
  onInsightsPress?: () => void;
  onPublishPress: () => void;
  onGeneratePress: () => void;
  onDeletePress: () => void;
  onParametrizacaoPress?: () => void;
  // E2E 2.3 rascunho / 2.2b: pessoas indisponíveis ou em conflito travam o Publicar.
  qtdPessoasMarcadas?: number;
}) {
  if (!escala) return null;

  const { confirmedCount, totalCount, statusDistribution, periodStart, periodEnd } = useMemo(() => {
    const items = escala?.itens ?? [];

    const assignedItems = items.filter((item) => Boolean(item.voluntarioId));
    const resolvedTotal = assignedItems.length;
    const resolvedConfirmed = assignedItems.filter(
      (item) => item.status === EscalaItemStatusEnum.Confirmado,
    ).length;

    const resolvedDistribution: StatusDistribution | undefined =
      resolvedTotal > 0
        ? {
            confirmado: resolvedConfirmed,
            pendente: assignedItems.filter((i) => i.status === EscalaItemStatusEnum.Pendente)
              .length,
            ausente: assignedItems.filter((i) => i.status === EscalaItemStatusEnum.Ausente).length,
            substituido: assignedItems.filter(
              (i) =>
                i.status === EscalaItemStatusEnum.Substituido ||
                i.status === EscalaItemStatusEnum.SubstituicaoSolicitada,
            ).length,
          }
        : undefined;

    const startDate = DateUtilsApi.dateOnlyFromApi(escala.dataInicio);
    const endDate = DateUtilsApi.dateOnlyFromApi(escala.dataTermino);

    return {
      confirmedCount: resolvedTotal > 0 ? resolvedConfirmed : undefined,
      totalCount: resolvedTotal > 0 ? resolvedTotal : undefined,
      statusDistribution: resolvedDistribution,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }, [escala]);

  const canEdit = !viewMode || viewMode === 'edit';
  const insightAction: InlineAction[] = onInsightsPress
    ? [
        {
          key: 'insights',
          icon: {
            library: 'MaterialCommunityIcons' as const,
            name: 'chart-box-outline',
          },
          label: 'Insights da escala',
          variant: 'neutral' as const,
          disabled: isScreenBlocked,
          onPress: onInsightsPress,
        },
      ]
    : [];

  const parametrizacaoAction: InlineAction[] = onParametrizacaoPress
    ? [
        {
          key: 'parametrizacao',
          icon: { library: 'MaterialCommunityIcons' as const, name: 'tune' },
          label: 'Ver parâmetros',
          variant: 'neutral' as const,
          disabled: isScreenBlocked,
          onPress: onParametrizacaoPress,
        },
      ]
    : [];

  const isManual = escala.origem === EscalaOrigemEnum.Manual;

  const primaryStatusAction: InlineAction | undefined = !isManual
    ? {
        key: 'recalculate',
        icon: {
          library: 'MaterialCommunityIcons' as const,
          name: 'calculator-variant-outline',
        },
        label: isRegenerating ? 'Recalculando...' : 'Recalcular',
        variant: 'primary' as const,
        isLoading: isRegenerating,
        disabled: isScreenBlocked || escala.status !== EscalaStatusEnum.Gerada,
        onPress: onGeneratePress,
      }
    : undefined;

  const statusActions: InlineAction[] =
    escala.status === EscalaStatusEnum.Gerada
      ? [
          ...(primaryStatusAction ? [primaryStatusAction] : []),
          {
            key: 'publish',
            icon: {
              library: 'MaterialCommunityIcons' as const,
              name: qtdPessoasMarcadas > 0 ? 'lock-outline' : 'rocket-launch-outline',
            },
            label:
              qtdPessoasMarcadas > 0
                ? `Troque as ${qtdPessoasMarcadas} ${qtdPessoasMarcadas === 1 ? 'pessoa marcada' : 'pessoas marcadas'}`
                : 'Publicar escala',
            variant: primaryStatusAction ? ('neutral' as const) : ('primary' as const),
            isLoading: isPublishing,
            disabled: isScreenBlocked || qtdPessoasMarcadas > 0,
            onPress: onPublishPress,
          },
        ]
      : [];

  const actions: InlineAction[] = canEdit
    ? [
        ...statusActions,
        ...insightAction,
        ...parametrizacaoAction,
        {
          key: 'delete',
          icon: { library: 'MaterialCommunityIcons' as const, name: 'delete-outline' },
          label: 'Excluir escala',
          variant: 'danger' as const,
          disabled: isScreenBlocked,
          onPress: onDeletePress,
        },
      ]
    : [...insightAction, ...parametrizacaoAction];

  return (
    <View style={styles.container}>
      <EscalaHeader
        title={escala.nome}
        status={escala.status}
        origem={escala.origem}
        periodStart={periodStart}
        periodEnd={periodEnd}
        confirmedCount={confirmedCount}
        totalCount={totalCount}
        statusDistribution={statusDistribution}
        actions={actions.length ? actions : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
});
