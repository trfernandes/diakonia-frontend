import { router, useLocalSearchParams } from 'expo-router';
import { useFocusRefetch } from '../../../../../hooks/useFocusRefetch';
import { StyleSheet, View } from 'react-native';
import FancyListItemCard from '../../../../../components/cards/FancyListItemCard';
import FancyListPage from '../../../../../components/pages/base/FancyBaseListPage';
import FancyListStats from '../../../../../components/list/FancyListStats';
import FancySegmentedControl from '../../../../../components/fields/FancySegmentedControl';
import FancyText from '../../../../../components/FancyText';
import { usePallete } from '../../../../../hooks/usePallete';
import { ColorUtils } from '../../../../../utils/color_utils';
import { DefaultIconsNames } from '../../../../../constants/icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEscalaTemplatesCrud } from '../../../../../useEscalaTemplatesCrud';
import {
  DynamicQuery,
  Operator,
  OrderDirection,
  ValueType,
} from '../../../../../domain/utils/query_utils';
import FancyLoading from '../../../../../components/FancyLoading';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import {
  EscalaTemplateTipoLabel,
  EscalaTemplateTipoEnumMap,
  EscalaTemplateTipoEnum,
} from '../../../../../domain/enums/EscalaTemplate/escala-template-tipo.enum';
import FancyActionSheet from '../../../../../components/actions/FancyActionSheet';
import { ResponseEscalaTemplateDto } from '../../../../../domain/dtos/EscalaTemplate/escala-template.response';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  TEMPLATES_EQUIPE_TOUR_ID,
  TEMPLATES_EQUIPE_TOUR_STEPS,
  TEMPLATES_EQUIPE_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/templatesEquipeTour';
import { useJourney } from '../../../../../contexts/JourneyContext';

export default function MinisterioTemplateEquipeIndex() {
  const Pallete = usePallete();
  const [searchText, setSearchText] = useState('');
  const [actionsTemplate, setActionsTemplate] = useState<ResponseEscalaTemplateDto | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | EscalaTemplateTipoEnum>('todos');

  const { ministerioId } = useLocalSearchParams<{ ministerioId: string }>();

  const journey = useJourney();
  const isJourneyStep = journey.currentStep?.tourId === TEMPLATES_EQUIPE_TOUR_ID;
  const tour = useScreenTutorial(
    TEMPLATES_EQUIPE_TOUR_ID,
    TEMPLATES_EQUIPE_TOUR_TITLE,
    TEMPLATES_EQUIPE_TOUR_STEPS,
    { onComplete: isJourneyStep ? journey.advance : undefined },
  );

  useEffect(() => {
    if (isJourneyStep && !tour.isActive && tour.ready) {
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourneyStep, tour.ready]);

  const searchParams = useMemo(() => {
    if (!ministerioId) return undefined;

    const normalizedSearch = searchText.trim();

    const conditions = [
      {
        path: 'ministerio.id',
        operator: Operator.EQUALS,
        value: { type: ValueType.LITERAL, value: ministerioId },
      },
    ];

    if (normalizedSearch) {
      conditions.push({
        path: 'nome',
        operator: Operator.ILIKE,
        value: {
          type: ValueType.LITERAL,
          value: normalizedSearch,
        },
      });
    }

    return {
      where: {
        conditions,
      },
      relations: ['voluntarios', 'funcoes'],
      orderBy: [{ path: 'nome', direction: OrderDirection.ASC }],
    } as DynamicQuery;
  }, [ministerioId, searchText]);

  const {
    data: templatesData,
    remove: removeTemplate,
    isLoading,
    isLoadingMutation,
    refetch,
  } = useEscalaTemplatesCrud({
    autoFetch: Boolean(ministerioId),
    initialParams: searchParams,
  });

  const { isFocusLoading } = useFocusRefetch(refetch);

  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch]);

  const handleSearch = useCallback((value: string) => {
    setSearchText(value.trim());
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      router.push({
        pathname: 'ministerios/templates_equipe/edit',
        params: { ministerioId, templateId: id },
      });
    },
    [ministerioId],
  );

  const handleDelete = useCallback(
    (id: string) => {
      FancyAlert.alert('Confirmação', 'Deseja realmente excluir este template?', [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            removeTemplate(id);
          },
        },
      ]);
    },
    [removeTemplate],
  );

  const filteredTemplates = useMemo(() => {
    const list = templatesData ?? [];
    if (tipoFiltro === 'todos') return list;
    return list.filter((item) => EscalaTemplateTipoEnumMap[item.tipo] === tipoFiltro);
  }, [templatesData, tipoFiltro]);

  const stats = useMemo(() => {
    const list = templatesData ?? [];
    const fixos = list.filter(
      (item) => EscalaTemplateTipoEnumMap[item.tipo] === EscalaTemplateTipoEnum.Fixo,
    ).length;
    return { total: list.length, fixos, funcoes: list.length - fixos };
  }, [templatesData]);

  if (isLoading) return <FancyLoading />;

  return (
    <FancyListPage
      showFab
      fabProps={{
        onPress: () =>
          router.push({
            pathname: 'ministerios/templates_equipe/add',
            params: { ministerioId },
          }),
      }}
      fabTutorialTarget={{
        id: 'templates-equipe-fab',
        registerTarget: tour.registerTarget,
        unregisterTarget: tour.unregisterTarget,
      }}
      showSearchBar
      contentLoading={isFocusLoading}
      searchBarProps={{ value: searchText, onSearch: handleSearch }}
      topContent={
        <View style={styles.topContainer}>
          {tour.showBanner && (
            <View style={styles.bannerWrapper}>
              <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />
            </View>
          )}
          <FancyListStats
            items={[
              { label: 'Total', value: stats.total },
              { label: 'Equipe Fixa', value: stats.fixos, color: Pallete.primary },
              { label: 'Por Funções', value: stats.funcoes, color: Pallete.secondary },
            ]}
          />
          <View style={styles.filtroContainer}>
            <FancySegmentedControl<'todos' | EscalaTemplateTipoEnum>
              size='sm'
              options={[
                { label: 'Todos', value: 'todos' },
                { label: 'Equipe Fixa', value: EscalaTemplateTipoEnum.Fixo },
                { label: 'Por Funções', value: EscalaTemplateTipoEnum.Funcoes },
              ]}
              value={tipoFiltro}
              onChange={setTipoFiltro}
            />
          </View>
        </View>
      }
      listProps={{
        onRefresh: handlePullRefresh,
        refreshing: isPullRefreshing,
        listEmptyProps: {
          label: searchText ? 'Nenhum template encontrado' : 'Nenhum template cadastrado',
          icon: { library: 'MaterialCommunityIcons', name: 'file-document-outline', size: 68 },
        },
        data: filteredTemplates,
        renderItem: ({ item }) => {
          const tipoLabel = EscalaTemplateTipoLabel[item.tipo];
          const isFixo = EscalaTemplateTipoEnumMap[item.tipo] === EscalaTemplateTipoEnum.Fixo;
          const dimensaoEquipe = isFixo ? item.voluntarios?.length : item.funcoes?.length;
          const dimensaoLabel = isFixo ? 'integrantes' : 'funções';
          return (
            <FancyListItemCard
              onPress={() => item.id && handleEdit(item.id)}
              leading={{
                type: 'icon',
                icon: { ...DefaultIconsNames.group, size: 18 },
                color: Pallete.secondary,
                backgroundColor: ColorUtils.withAlpha(Pallete.secondary, 0.12),
              }}
              title={item.nome}
              subtitle={tipoLabel}
              meta={
                <FancyText
                  size='extraSmall'
                  type='medium'
                  color={Pallete.fonts.inactive}
                  style={styles.meta}
                >
                  {`${dimensaoEquipe ?? 0} ${dimensaoLabel}`}
                </FancyText>
              }
              trailing={{ type: 'menu', onPress: () => setActionsTemplate(item) }}
            />
          );
        },
      }}
    >
      <FancyActionSheet
        visible={!!actionsTemplate}
        onClose={() => setActionsTemplate(null)}
        actions={[
          {
            label: 'Editar',
            icon: { ...DefaultIconsNames.edit, size: 18 },
            onPress: () => actionsTemplate?.id && handleEdit(actionsTemplate.id),
          },
          {
            label: 'Excluir',
            destructive: true,
            disabled: isLoadingMutation,
            icon: { ...DefaultIconsNames.delete, size: 18 },
            onPress: () => actionsTemplate?.id && handleDelete(actionsTemplate.id),
          },
        ]}
      />

      <TutorialOverlay tour={tour} />
    </FancyListPage>
  );
}

const styles = StyleSheet.create({
  topContainer: { gap: 12 },
  bannerWrapper: {
    paddingHorizontal: 15,
  },
  filtroContainer: {
    paddingHorizontal: 15,
  },
  meta: {
    lineHeight: 15,
    includeFontPadding: false,
  },
});
