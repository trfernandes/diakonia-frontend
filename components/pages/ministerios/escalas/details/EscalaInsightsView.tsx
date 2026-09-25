import { useQuery } from '@tanstack/react-query';
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import DefaultIcons from '../../../../FancyIcons';
import FancyAccordeon from '../../../../FancyAccordeon';
import FancyAvatarImage from '../../../../images/FancyImage';
import { AppImages } from '../../../../../assets/app_images';
import FancyButton from '../../../../buttons/FancyButton';
import FancyChips from '../../../../FancyChips';
import FancySearchBar from '../../../../FancySearchBar';
import FancyText from '../../../../FancyText';
import { ThemePalette } from '../../../../../constants/colors';
import { ResponseEscalaDto } from '../../../../../domain/dtos/Escala/escala.response';
import { EscalaRepository } from '../../../../../domain/services/EscalaRepository';
import { Conjunction, Operator, ValueType } from '../../../../../domain/utils/query_utils';
import { usePallete } from '../../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../../hooks/useThemedStyles';
import { ColorUtils } from '../../../../../utils/color_utils';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import DashboardCard from '../../../inicio/DashboardCard';
import FancyVerticalSpacer from '../../../../FancyVerticalSpacer';
import FancySegmentedControl from '../../../../fields/FancySegmentedControl';
import {
  buildCurrentEscalaInsights,
  buildHistoricalEscalaInsights,
  buildTodoMundoRows,
} from './escalaInsights.utils';
import { getFirstAndLastName } from '../../../../../utils/text_utils';
import { useVoluntariosDoMinisterioCrud } from '../../../../../hooks/useVoluntariosDoMinisterioCrud';

const HISTORY_MONTHS_WINDOW = 6;
type InsightsSectionKey = 'resumo' | 'cobertura' | 'pessoas' | 'equilibrio';

type PessoasSortMode = 'nome-asc' | 'nome-desc' | 'escalas-asc' | 'escalas-desc';
const PESSOAS_SORT_CYCLE: PessoasSortMode[] = [
  'nome-asc',
  'nome-desc',
  'escalas-asc',
  'escalas-desc',
];
const PESSOAS_SORT_LABEL: Record<PessoasSortMode, string> = {
  'nome-asc': 'Nome ↑',
  'nome-desc': 'Nome ↓',
  'escalas-asc': 'Escalas ↑',
  'escalas-desc': 'Escalas ↓',
};

type InfoKey =
  | 'kpi_eventos'
  | 'kpi_pessoas'
  | 'kpi_atribuicoes'
  | 'kpi_media_pessoa'
  | 'kpi_vagas_totais'
  | 'kpi_vagas_preenchidas'
  | 'kpi_percentual'
  | 'kpi_funcoes_vagas'
  | 'eq_distribuicao'
  | 'eq_maior'
  | 'eq_menor'
  | 'eq_diferenca'
  | 'eq_media_6m';

type InfoAnchor = { x: number; y: number; width: number; height: number };
type ActiveInfo = { key: InfoKey; anchor: InfoAnchor };

const INFO_TEXT: Record<InfoKey, string> = {
  kpi_eventos: 'Eventos únicos da escala (evento + data de ocorrência).',
  kpi_pessoas: 'Total de pessoas diferentes escaladas ao menos uma vez.',
  kpi_atribuicoes: 'Quantidade total de atribuições preenchidas na escala.',
  kpi_media_pessoa: 'Média de atribuições por pessoa na escala atual.',
  kpi_vagas_totais: 'Quantidade total de vagas/funções da escala atual.',
  kpi_vagas_preenchidas: 'Vagas que já têm voluntário definido.',
  kpi_percentual: 'Percentual de cobertura: preenchidas / totais.',
  kpi_funcoes_vagas: 'Vagas que continuam sem voluntário.',
  eq_distribuicao: 'Classificação geral do nível de equilíbrio da distribuição.',
  eq_maior: 'Pessoa com maior quantidade de atribuições.',
  eq_menor: 'Pessoa com menor quantidade de atribuições.',
  eq_diferenca: 'Diferença de carga entre maior e menor.',
  eq_media_6m: 'Média de atribuições por mês do ministério nos últimos 6 meses.',
};

type EscalaInsightsViewProps = {
  escala: ResponseEscalaDto;
  ministerioId: string;
};

function formatCount(value: number) {
  return value.toLocaleString('pt-BR');
}

function formatOneDecimal(value: number) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatMonthRange(start: Date, end: Date) {
  const from = format(start, 'MMM/yyyy', { locale: ptBR });
  const to = format(end, 'MMM/yyyy', { locale: ptBR });
  return `${from} - ${to}`;
}

function InfoButton({ label, onPress }: { label: string; onPress: (anchor: InfoAnchor) => void }) {
  const styles = useThemedStyles(createStyles);
  const palette = usePallete();
  const [anchorView, setAnchorView] = useState<View | null>(null);

  return (
    <View ref={(node) => setAnchorView(node)} collapsable={false}>
      <Pressable
        onPress={() => {
          anchorView?.measureInWindow((x, y, width, height) => {
            onPress({ x, y, width, height });
          });
        }}
        hitSlop={8}
        accessibilityRole='button'
        accessibilityLabel={label}
        style={({ pressed }) => [styles.infoButton, pressed && styles.infoButtonPressed]}
      >
        <DefaultIcons.Custom
          library='MaterialCommunityIcons'
          name='information-outline'
          size={15}
          color={palette.primary}
        />
      </Pressable>
    </View>
  );
}

function InfoPopover({
  activeInfo,
  onClose,
}: {
  activeInfo: ActiveInfo | null;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const palette = usePallete();
  const window = useWindowDimensions();
  if (!activeInfo) return null;

  const bubbleWidth = Math.min(260, window.width - 24);
  const left = Math.max(
    12,
    Math.min(
      activeInfo.anchor.x + activeInfo.anchor.width / 2 - bubbleWidth / 2,
      window.width - bubbleWidth - 12,
    ),
  );
  const placeAbove = activeInfo.anchor.y > window.height * 0.56;
  const top = placeAbove
    ? Math.max(16, activeInfo.anchor.y - 84)
    : Math.min(window.height - 120, activeInfo.anchor.y + activeInfo.anchor.height + 6);

  return (
    <Modal transparent visible animationType='fade' onRequestClose={onClose}>
      <View style={styles.popoverRoot}>
        <Pressable style={styles.popoverBackdrop} onPress={onClose} />
        <View
          style={[
            styles.popoverBubble,
            {
              top,
              left,
              width: bubbleWidth,
              borderColor: ColorUtils.withAlpha(palette.primary, 0.28),
            },
          ]}
        >
          <FancyText size='extraSmall' type='medium'>
            {INFO_TEXT[activeInfo.key]}
          </FancyText>
        </View>
      </View>
    </Modal>
  );
}

function CardWithInfo({
  onInfoPress,
  infoLabel,
  children,
}: {
  onInfoPress: (anchor: InfoAnchor) => void;
  infoLabel: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.cardWrap}>
      {children}
      <View style={styles.cardInfoWrap}>
        <InfoButton label={infoLabel} onPress={onInfoPress} />
      </View>
    </View>
  );
}

export default function EscalaInsightsView({ escala, ministerioId }: EscalaInsightsViewProps) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const [openSections, setOpenSections] = useState<Set<InsightsSectionKey>>(new Set(['resumo']));
  const [activeInfo, setActiveInfo] = useState<ActiveInfo | null>(null);
  const [pendingSection, setPendingSection] = useState<InsightsSectionKey | null>(null);
  const [pessoasFiltro, setPessoasFiltro] = useState<'escalados' | 'todos'>('escalados');
  const [pessoasBusca, setPessoasBusca] = useState('');
  const [pessoasSort, setPessoasSort] = useState<PessoasSortMode>('escalas-desc');
  const openFrameRef = useRef<number | null>(null);
  const clearPendingFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setOpenSections(new Set(['resumo']));
    setActiveInfo(null);
    setPendingSection(null);
  }, [escala.id]);

  useEffect(() => {
    return () => {
      if (openFrameRef.current !== null) {
        cancelAnimationFrame(openFrameRef.current);
      }
      if (clearPendingFrameRef.current !== null) {
        cancelAnimationFrame(clearPendingFrameRef.current);
      }
    };
  }, []);

  const openInfo = useCallback((key: InfoKey, anchor: InfoAnchor) => {
    setActiveInfo((prev) => (prev?.key === key ? null : { key, anchor }));
  }, []);

  const handleAccordionChange = useCallback(
    (section: InsightsSectionKey, expanded: boolean) => {
      if (pendingSection) return;

      if (openFrameRef.current !== null) {
        cancelAnimationFrame(openFrameRef.current);
      }
      if (clearPendingFrameRef.current !== null) {
        cancelAnimationFrame(clearPendingFrameRef.current);
      }

      setPendingSection(section);
      openFrameRef.current = requestAnimationFrame(() => {
        setOpenSections((prev) => {
          const next = new Set(prev);
          if (expanded) {
            next.add(section);
          } else {
            next.delete(section);
          }
          return next;
        });
        clearPendingFrameRef.current = requestAnimationFrame(() => {
          setPendingSection(null);
        });
      });
    },
    [pendingSection],
  );

  const currentInsights = useMemo(
    () => buildCurrentEscalaInsights(escala.itens ?? []),
    [escala.itens],
  );

  const { ministerioVoluntariosList } = useVoluntariosDoMinisterioCrud(ministerioId);

  const todoMundoRows = useMemo(
    () => buildTodoMundoRows(currentInsights.rankingAtual, ministerioVoluntariosList ?? []),
    [currentInsights.rankingAtual, ministerioVoluntariosList],
  );

  const historyPeriodStart = useMemo(
    () =>
      startOfMonth(
        subMonths(DateUtilsApi.dateOnlyFromApi(escala.dataTermino), HISTORY_MONTHS_WINDOW - 1),
      ),
    [escala.dataTermino],
  );
  const historyPeriodEnd = useMemo(
    () => endOfMonth(DateUtilsApi.dateOnlyFromApi(escala.dataTermino)),
    [escala.dataTermino],
  );
  const historyPeriodLabel = useMemo(
    () => formatMonthRange(historyPeriodStart, historyPeriodEnd),
    [historyPeriodStart, historyPeriodEnd],
  );

  const historyQuery = useQuery<ResponseEscalaDto[]>({
    queryKey: [
      'escala-insights-history',
      ministerioId,
      DateUtilsApi.dateOnlyToApi(historyPeriodStart),
      DateUtilsApi.dateOnlyToApi(historyPeriodEnd),
    ],
    enabled: !!ministerioId,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    queryFn: async () => {
      const result = await EscalaRepository.search({
        where: {
          conjunction: Conjunction.AND,
          conditions: [
            {
              path: 'ministerio.id',
              operator: Operator.EQUALS,
              value: { type: ValueType.LITERAL, value: ministerioId },
            },
            {
              conjunction: Conjunction.AND,
              conditions: [
                {
                  path: 'dataInicio',
                  operator: Operator.LTE,
                  value: {
                    type: ValueType.LITERAL,
                    value: DateUtilsApi.dateOnlyToApi(historyPeriodEnd),
                  },
                },
                {
                  path: 'dataTermino',
                  operator: Operator.GTE,
                  value: {
                    type: ValueType.LITERAL,
                    value: DateUtilsApi.dateOnlyToApi(historyPeriodStart),
                  },
                },
              ],
            },
          ],
        },
        relations: ['itens', 'itens.voluntario', 'itens.voluntario.voluntario'],
      });
      return result ?? [];
    },
  });

  const historicalInsights = useMemo(
    () =>
      buildHistoricalEscalaInsights(
        historyQuery.data ?? [],
        historyPeriodStart,
        historyPeriodEnd,
        HISTORY_MONTHS_WINDOW,
      ),
    [historyQuery.data, historyPeriodStart, historyPeriodEnd],
  );

  const pessoasRowsBase =
    pessoasFiltro === 'todos' ? todoMundoRows : currentInsights.rankingAtual;

  const pessoasRows = useMemo(() => {
    const busca = pessoasBusca.trim().toLowerCase();
    const filtradas = busca
      ? pessoasRowsBase.filter((row) => row.nome.toLowerCase().includes(busca))
      : pessoasRowsBase;

    const sorted = [...filtradas].sort((a, b) => {
      switch (pessoasSort) {
        case 'nome-asc':
          return a.nome.localeCompare(b.nome, 'pt-BR');
        case 'nome-desc':
          return b.nome.localeCompare(a.nome, 'pt-BR');
        case 'escalas-asc':
          return a.qtdAtual - b.qtdAtual;
        case 'escalas-desc':
          return b.qtdAtual - a.qtdAtual;
      }
    });
    return sorted;
  }, [pessoasRowsBase, pessoasBusca, pessoasSort]);

  const cyclePessoasSort = useCallback(() => {
    setPessoasSort((prev) => {
      const index = PESSOAS_SORT_CYCLE.indexOf(prev);
      return PESSOAS_SORT_CYCLE[(index + 1) % PESSOAS_SORT_CYCLE.length];
    });
  }, []);
  const gapBetweenExtremes =
    currentInsights.maiorCarga && currentInsights.menorCarga
      ? currentInsights.maiorCarga.qtdAtual - currentInsights.menorCarga.qtdAtual
      : 0;
  const isBalanced =
    !currentInsights.maiorCarga ||
    currentInsights.cargaMediaAtual <= 0 ||
    currentInsights.maiorCarga.qtdAtual <= currentInsights.cargaMediaAtual * 1.8;
  const distributionChipColor = isBalanced ? palette.confirm : palette.warning;
  const accordionHeaderColor = palette.backgroundColor2;

  const renderTitle = (text: string) => (
    <View style={styles.sectionTitle}>
      <FancyText size='small' type='bold' style={{ flexShrink: 1 }}>
        {text}
      </FancyText>
    </View>
  );

  return (
    <>
      <View style={styles.screenContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <FancyAccordeon
            title={renderTitle('Resumo da escala atual')}
            expanded={openSections.has('resumo')}
            onExpandedChange={(expanded) => handleAccordionChange('resumo', expanded)}
            disabled={pendingSection !== null && pendingSection !== 'resumo'}
            isLoading={pendingSection === 'resumo'}
            headerColor={accordionHeaderColor}
            expandedHeaderColor={accordionHeaderColor}
            contentContainerStyle={styles.accordeonContent}
            headerContainerStyle={styles.accordeonHeader}
            headerExpandedContainerStyle={styles.accordeonHeaderExpanded}
            containerContainerStyle={styles.accordeonContainer}
            containerExpandedContainerStyle={styles.accordeonContainerExpanded}
          >
            <View style={styles.cardRow}>
              <CardWithInfo
                infoLabel='Explicar eventos'
                onInfoPress={(anchor) => openInfo('kpi_eventos', anchor)}
              >
                <DashboardCard
                  title='Eventos'
                  value={formatCount(currentInsights.totalEventos)}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'calendar-multiple',
                    size: 12,
                    color: palette.primary,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
              <CardWithInfo
                infoLabel='Explicar pessoas escaladas'
                onInfoPress={(anchor) => openInfo('kpi_pessoas', anchor)}
              >
                <DashboardCard
                  title='Pessoas escaladas'
                  value={formatCount(currentInsights.totalPessoasEscaladas)}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'account-group',
                    size: 12,
                    color: palette.primary,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
            </View>
            <View style={styles.cardRow}>
              <CardWithInfo
                infoLabel='Explicar escalas atribuídas'
                onInfoPress={(anchor) => openInfo('kpi_atribuicoes', anchor)}
              >
                <DashboardCard
                  title='Escalas atribuídas'
                  value={formatCount(currentInsights.totalEscalasAtribuidas)}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'format-list-numbered',
                    size: 12,
                    color: palette.primary,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
              <CardWithInfo
                infoLabel='Explicar média por pessoa'
                onInfoPress={(anchor) => openInfo('kpi_media_pessoa', anchor)}
              >
                <DashboardCard
                  title='Média por pessoa'
                  value={formatOneDecimal(currentInsights.mediaEscalasPorPessoaAtual)}
                  subtitle='na escala atual'
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'chart-line',
                    size: 12,
                    color: palette.primary,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
            </View>
          </FancyAccordeon>

          <FancyAccordeon
            title={renderTitle('Cobertura')}
            expanded={openSections.has('cobertura')}
            onExpandedChange={(expanded) => handleAccordionChange('cobertura', expanded)}
            disabled={pendingSection !== null && pendingSection !== 'cobertura'}
            isLoading={pendingSection === 'cobertura'}
            headerColor={accordionHeaderColor}
            expandedHeaderColor={accordionHeaderColor}
            contentContainerStyle={styles.accordeonContent}
            headerContainerStyle={styles.accordeonHeader}
            headerExpandedContainerStyle={styles.accordeonHeaderExpanded}
            containerContainerStyle={styles.accordeonContainer}
            containerExpandedContainerStyle={styles.accordeonContainerExpanded}
          >
            <View style={styles.cardRow}>
              <CardWithInfo
                infoLabel='Explicar vagas totais'
                onInfoPress={(anchor) => openInfo('kpi_vagas_totais', anchor)}
              >
                <DashboardCard
                  title='Vagas totais'
                  value={formatCount(currentInsights.vagasTotais)}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'briefcase-outline',
                    size: 12,
                    color: palette.primary,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
              <CardWithInfo
                infoLabel='Explicar vagas preenchidas'
                onInfoPress={(anchor) => openInfo('kpi_vagas_preenchidas', anchor)}
              >
                <DashboardCard
                  title='Vagas preenchidas'
                  value={formatCount(currentInsights.vagasPreenchidas)}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'check-decagram-outline',
                    size: 12,
                    color: palette.confirm,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
            </View>
            <View style={styles.cardRow}>
              <CardWithInfo
                infoLabel='Explicar percentual preenchido'
                onInfoPress={(anchor) => openInfo('kpi_percentual', anchor)}
              >
                <DashboardCard
                  title='% preenchimento'
                  value={`${Math.round(currentInsights.percentualPreenchimento)}%`}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'chart-donut',
                    size: 12,
                    color: palette.secondary,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
              <CardWithInfo
                infoLabel='Explicar funções sem voluntário'
                onInfoPress={(anchor) => openInfo('kpi_funcoes_vagas', anchor)}
              >
                <DashboardCard
                  title='Funções sem voluntário'
                  value={formatCount(currentInsights.funcoesSemVoluntario)}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'alert-circle-outline',
                    size: 12,
                    color: palette.warning,
                  }}
                  surfaceVariant='infoBlue'
                />
              </CardWithInfo>
            </View>
          </FancyAccordeon>

          <FancyAccordeon
            title={renderTitle('Pessoas')}
            expanded={openSections.has('pessoas')}
            onExpandedChange={(expanded) => handleAccordionChange('pessoas', expanded)}
            disabled={pendingSection !== null && pendingSection !== 'pessoas'}
            isLoading={pendingSection === 'pessoas'}
            headerColor={accordionHeaderColor}
            expandedHeaderColor={accordionHeaderColor}
            contentContainerStyle={styles.accordeonContent}
            headerContainerStyle={styles.accordeonHeader}
            headerExpandedContainerStyle={styles.accordeonHeaderExpanded}
            containerContainerStyle={styles.accordeonContainer}
            containerExpandedContainerStyle={styles.accordeonContainerExpanded}
          >
            <FancySegmentedControl
              label='Filtro'
              value={pessoasFiltro}
              onChange={setPessoasFiltro}
              options={[
                { label: 'Escalados', value: 'escalados', count: currentInsights.rankingAtual.length },
                { label: 'Todos', value: 'todos', count: todoMundoRows.length },
              ]}
              size='sm'
            />
            <FancyVerticalSpacer height={10} />
            <View style={styles.pessoasToolbar}>
              <FancySearchBar
                value={pessoasBusca}
                onSearch={setPessoasBusca}
                placeholder='Buscar por nome'
                containerStyle={styles.pessoasSearchBar}
              />
              <FancyButton
                type='light'
                label={PESSOAS_SORT_LABEL[pessoasSort]}
                icon={{ library: 'MaterialCommunityIcons', name: 'swap-vertical', size: 16 }}
                onPress={cyclePessoasSort}
                accessibilityLabel='Ordenar pessoas'
                containerStyle={styles.pessoasSortButton}
              />
            </View>
            <FancyVerticalSpacer height={10} />
            {pessoasRowsBase.length === 0 ? (
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                {pessoasFiltro === 'todos'
                  ? 'Nenhum voluntário no ministério.'
                  : 'Nenhuma pessoa escalada nesta escala.'}
              </FancyText>
            ) : pessoasRows.length === 0 ? (
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                Nenhuma pessoa encontrada pra "{pessoasBusca.trim()}".
              </FancyText>
            ) : (
              <View style={styles.tableWrapper}>
                <View style={styles.tableHeaderRow}>
                  <FancyText
                    size='extraSmall'
                    type='semiBold'
                    color={palette.fonts.inactive}
                    style={[styles.cellBase, styles.cellName]}
                  >
                    Pessoa
                  </FancyText>
                  <FancyText
                    size='extraSmall'
                    type='semiBold'
                    color={palette.fonts.inactive}
                    style={[styles.cellBase, styles.cellCenter]}
                  >
                    Escalas
                  </FancyText>
                  <FancyText
                    size='extraSmall'
                    type='semiBold'
                    color={palette.fonts.inactive}
                    style={[styles.cellBase, styles.cellCenter]}
                  >
                    Média/mês
                  </FancyText>
                </View>
                <View>
                  {pessoasRows.map((row, index) => {
                    const mediaPessoa =
                      historicalInsights.mediaEscalasMesPorPessoa[row.voluntarioId] ?? 0;
                    const mediaPessoaLabel = historyQuery.isLoading
                      ? '...'
                      : historyQuery.isError
                        ? '—'
                        : formatOneDecimal(mediaPessoa);
                    return (
                      <View
                        key={row.voluntarioId}
                        style={[
                          styles.tableDataRow,
                          index === pessoasRows.length - 1 && styles.tableLastRow,
                        ]}
                      >
                        <View style={[styles.cellBase, styles.cellName, styles.cellPersona]}>
                          <FancyAvatarImage
                            source={
                              row.fotoThumbUrl || row.fotoUrl
                                ? { uri: row.fotoThumbUrl || row.fotoUrl }
                                : AppImages.emptyProfile
                            }
                            size={20}
                            style={styles.rankingAvatar}
                          />
                          <FancyText
                            size='extraSmall'
                            type='medium'
                            numberOfLines={1}
                            style={{ flex: 1 }}
                          >
                            {getFirstAndLastName(row.nome)}
                          </FancyText>
                        </View>
                        <FancyText
                          size='extraSmall'
                          type='semiBold'
                          style={[styles.cellBase, styles.cellCenter]}
                        >
                          {formatCount(row.qtdAtual)}
                        </FancyText>
                        <FancyText
                          size='extraSmall'
                          type='semiBold'
                          style={[styles.cellBase, styles.cellCenter]}
                        >
                          {mediaPessoaLabel}
                        </FancyText>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </FancyAccordeon>

          <FancyAccordeon
            title={renderTitle('Equilíbrio')}
            expanded={openSections.has('equilibrio')}
            onExpandedChange={(expanded) => handleAccordionChange('equilibrio', expanded)}
            disabled={pendingSection !== null && pendingSection !== 'equilibrio'}
            isLoading={pendingSection === 'equilibrio'}
            headerColor={accordionHeaderColor}
            expandedHeaderColor={accordionHeaderColor}
            contentContainerStyle={styles.accordeonContent}
            headerContainerStyle={styles.accordeonHeader}
            headerExpandedContainerStyle={styles.accordeonHeaderExpanded}
            containerContainerStyle={styles.accordeonContainer}
            containerExpandedContainerStyle={styles.accordeonContainerExpanded}
          >
            <View>
              <View style={styles.equilibrioRow}>
                <FancyChips
                  label={isBalanced ? 'Distribuição equilibrada' : 'Distribuição concentrada'}
                  color={distributionChipColor}
                  backgroundColor={ColorUtils.withAlpha(distributionChipColor, 0.16)}
                  size='small'
                />
                <InfoButton
                  label='Explicar distribuição'
                  onPress={(anchor) => openInfo('eq_distribuicao', anchor)}
                />
              </View>
              {currentInsights.maiorCarga && currentInsights.menorCarga && (
                <>
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabel}>
                      <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                        Maior carga
                      </FancyText>
                      <InfoButton
                        label='Explicar maior carga'
                        onPress={(anchor) => openInfo('eq_maior', anchor)}
                      />
                    </View>
                    <FancyText
                      size='extraSmall'
                      type='semiBold'
                      style={styles.infoValue}
                      numberOfLines={2}
                    >
                      {`${currentInsights.maiorCarga.nome} (${currentInsights.maiorCarga.qtdAtual})`}
                    </FancyText>
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabel}>
                      <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                        Menor carga
                      </FancyText>
                      <InfoButton
                        label='Explicar menor carga'
                        onPress={(anchor) => openInfo('eq_menor', anchor)}
                      />
                    </View>
                    <FancyText
                      size='extraSmall'
                      type='semiBold'
                      style={styles.infoValue}
                      numberOfLines={2}
                    >
                      {`${currentInsights.menorCarga.nome} (${currentInsights.menorCarga.qtdAtual})`}
                    </FancyText>
                  </View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoLabel}>
                      <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                        Diferença entre extremos
                      </FancyText>
                      <InfoButton
                        label='Explicar diferença'
                        onPress={(anchor) => openInfo('eq_diferenca', anchor)}
                      />
                    </View>
                    <FancyText size='extraSmall' type='semiBold' style={styles.infoValue}>
                      {formatCount(gapBetweenExtremes)}
                    </FancyText>
                  </View>
                </>
              )}
              <View style={styles.monthlyAverageBlock}>
                <View style={styles.monthlyHeader}>
                  <FancyText size='extraSmall' type='semiBold'>
                    Média de escalas por mês ({HISTORY_MONTHS_WINDOW}m)
                  </FancyText>
                  <InfoButton
                    label='Explicar média 6 meses'
                    onPress={(anchor) => openInfo('eq_media_6m', anchor)}
                  />
                </View>
                {historyQuery.isLoading && (
                  <ActivityIndicator size='small' color={palette.primary} />
                )}
                <FancyText size='small' type='bold'>
                  {historyQuery.isError
                    ? '—'
                    : formatOneDecimal(historicalInsights.mediaEscalasMesMinisterio)}
                </FancyText>
                <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                  {historyPeriodLabel}
                </FancyText>
              </View>
            </View>
          </FancyAccordeon>
        </ScrollView>
      </View>
      <InfoPopover activeInfo={activeInfo} onClose={() => setActiveInfo(null)} />
    </>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    screenContainer: { flex: 1 },
    scrollContent: { gap: 10, paddingTop: 2, paddingBottom: 6 },
    accordeonContainer: {
      borderWidth: 1,
      borderColor: palette.borderCard,
      borderRadius: 12,
      backgroundColor: palette.backgroundColor2,
      overflow: 'hidden',
    },
    accordeonContainerExpanded: {
      borderWidth: 1,
      borderColor: palette.borderCard,
      borderRadius: 12,
      backgroundColor: palette.backgroundColor4,
      overflow: 'hidden',
    },
    accordeonHeader: { backgroundColor: palette.backgroundColor2 },
    accordeonHeaderExpanded: {
      backgroundColor: palette.backgroundColor2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.borderCard,
    },
    sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
    accordeonContent: {
      paddingTop: 15,
      paddingBottom: 13,
      paddingHorizontal: 11,
      gap: 13,
      backgroundColor: palette.backgroundColor,
    },
    cardRow: { flexDirection: 'row', gap: 8 },
    cardWrap: { flex: 1, position: 'relative' },
    cardInfoWrap: { position: 'absolute', top: 5, right: 6 },
    infoButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.2),
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoButtonPressed: { opacity: 0.72 },
    pessoasToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pessoasSearchBar: { flex: 1 },
    pessoasSortButton: { flexShrink: 0 },
    tableWrapper: {
      borderWidth: 0,
      borderRadius: 0,
      overflow: 'hidden',
      backgroundColor: 'transparent',
    },
    tableHeaderRow: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'transparent',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ColorUtils.withAlpha(palette.borderCard, 0.9),
      gap: 6,
    },
    tableHeaderCell: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    tableDataRow: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ColorUtils.withAlpha(palette.borderCard, 0.85),
      gap: 6,
      alignItems: 'center',
    },
    tableLastRow: { borderBottomWidth: 0 },
    cellBase: { minWidth: 0 },
    cellName: { flex: 2 },
    cellCenter: { flex: 1, textAlign: 'center' },
    cellPersona: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rankingAvatar: { width: 20, height: 20, borderRadius: 10, flexShrink: 0 },
    equilibrioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: ColorUtils.withAlpha(palette.borderCard, 0.85),
      paddingTop: 8,
      paddingBottom: 8,
    },
    infoLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    infoValue: { flexShrink: 1, textAlign: 'right', maxWidth: '56%' },
    monthlyAverageBlock: {
      gap: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.22),
      backgroundColor: palette.backgroundColor,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 8,
    },
    monthlyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    popoverRoot: { flex: 1 },
    popoverBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
    popoverBubble: {
      position: 'absolute',
      borderWidth: 1,
      borderRadius: 10,
      backgroundColor: palette.backgroundColor,
      paddingHorizontal: 10,
      paddingVertical: 8,
      ...palette.shadows[200],
    },
  });
}
