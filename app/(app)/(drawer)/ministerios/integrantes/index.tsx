import { useCallback, useEffect, useMemo, useState } from 'react';
import FancyListPage from '../../../../../components/pages/base/FancyBaseListPage';
import FancyListItemCard from '../../../../../components/cards/FancyListItemCard';
import FancyListStats from '../../../../../components/list/FancyListStats';
import { DefaultIconsNames } from '../../../../../constants/icons';
import { useMinisterioVoluntariosCrud } from '../../../../../hooks/useMinisterioVoluntariosCrud';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Condition,
  DynamicQuery,
  Operator,
  OrderDirection,
  ValueType,
} from '../../../../../domain/utils/query_utils';
import FancyLoading from '../../../../../components/FancyLoading';
import Toast from 'react-native-toast-message';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import {
  VoluntarioHierarquiaEnumLabel,
  getVoluntarioHierarquiaColorMap,
} from '../../../../../domain/enums/MinisterioVoluntario/hierarquia.enum';
import {
  getMinisterioStatusColorMap,
  MinisterioVoluntarioStatusEnum,
  MinisterioVoluntarioStatusEnumLabel,
  MinisterioVoluntarioStatusEnumMap,
} from '../../../../../domain/enums/MinisterioVoluntario/ministerio-voluntario-status.enum';
import { MinisterioVoluntarioFuncaoStatusEnum } from '../../../../../domain/enums/MinisterioVoluntarioFuncao/ministerio-voluntario-funcao-status.enum';
import { AppImages } from '../../../../../assets/app_images';
import { useLoading } from '../../../../../contexts/LoadingContext';
import FancySegmentedControl from '../../../../../components/fields/FancySegmentedControl';
import FancyChips from '../../../../../components/FancyChips';
import { usePallete } from '../../../../../hooks/usePallete';
import FancyText from '../../../../../components/FancyText';
import { StyleSheet, View } from 'react-native';
import { ResponseMinisterioVoluntarioDto } from '../../../../../domain/dtos/MinisterioVoluntario/ministerio-voluntario.response';
import FancyActionSheet from '../../../../../components/actions/FancyActionSheet';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  INTEGRANTES_TOUR_ID,
  INTEGRANTES_TOUR_STEPS,
  INTEGRANTES_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/integrantesTour';
import { useJourney } from '../../../../../contexts/JourneyContext';

type StatusFiltro = 'todos' | 'ativos' | 'inativos';

export default function MinisterioIntegrantesIndex() {
  const palette = usePallete();
  const { showLoading, hideLoading } = useLoading();

  const { ministerioId } = useLocalSearchParams<{ ministerioId: string }>();

  const [searchText, setSearchText] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>('todos');
  const [actionsIntegrante, setActionsIntegrante] =
    useState<ResponseMinisterioVoluntarioDto | null>(null);
  const ministerioStatusColorMap = useMemo(() => getMinisterioStatusColorMap(palette), [palette]);
  const hierarquiaColorMap = useMemo(() => getVoluntarioHierarquiaColorMap(palette), [palette]);

  const journey = useJourney();
  const isJourneyStep = journey.currentStep?.tourId === INTEGRANTES_TOUR_ID;
  const tour = useScreenTutorial(
    INTEGRANTES_TOUR_ID,
    INTEGRANTES_TOUR_TITLE,
    INTEGRANTES_TOUR_STEPS,
    { onComplete: isJourneyStep ? journey.advance : undefined },
  );

  useEffect(() => {
    if (isJourneyStep && !tour.isActive && tour.ready) {
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourneyStep, tour.ready]);

  const params = useMemo(() => {
    if (!ministerioId) return undefined;

    const searchCondition: Condition | undefined =
      searchText && searchText.trim() !== ''
        ? {
            path: 'voluntario.nome',
            operator: Operator.ILIKE,
            value: { type: ValueType.LITERAL, value: searchText },
          }
        : undefined;

    return {
      where: {
        conditions: [
          {
            path: 'ministerio.id',
            operator: Operator.EQUALS,
            value: {
              type: ValueType.LITERAL as const,
              value: ministerioId,
            },
          },
          ...(searchCondition ? [searchCondition] : []),
        ],
      },
      relations: ['voluntario', 'ministerio', 'funcoes', 'funcoes.funcao'],
      orderBy: [{ path: 'voluntario.nome', direction: OrderDirection.ASC }],
    } as DynamicQuery;
  }, [ministerioId, searchText]);

  const {
    data,
    update: updateIntegrante,
    remove: removeIntegrante,
    isLoading,
    isLoadingMutation,
    refetch,
    isRefetching,
  } = useMinisterioVoluntariosCrud({
    autoFetch: true,
    initialParams: params,
  });

  const handleChangeStatus = useCallback(
    (id: string, nome: string, newStatus: MinisterioVoluntarioStatusEnum) => {
      FancyAlert.alert(
        newStatus === MinisterioVoluntarioStatusEnum.Inativo
          ? 'Desativação de Voluntário'
          : 'Ativação de Voluntário',
        `Tem certeza que deseja "${newStatus === MinisterioVoluntarioStatusEnum.Inativo ? 'DESATIVAR' : 'ATIVAR'}" o voluntário "${nome}"?`,
        [
          {
            text: 'Não',
            style: 'cancel',
          },
          {
            text: 'Sim',
            style: 'destructive',
            onPress: () => {
              showLoading();
              Promise.resolve(updateIntegrante?.({ id, data: { status: newStatus } }))
                .then(async () => {
                  await refetch();
                  Toast.show({
                    text1: `Voluntário ${newStatus === MinisterioVoluntarioStatusEnum.Inativo ? 'desativado' : 'ativado'} com sucesso!`,
                    type: 'success',
                  });
                })
                .catch(() => {
                  Toast.show({
                    text1: `Erro ao ${newStatus === MinisterioVoluntarioStatusEnum.Inativo ? 'desativar' : 'ativar'} o voluntário.`,
                    type: 'error',
                  });
                })
                .finally(() => hideLoading());
            },
          },
        ],
      );
    },
    [updateIntegrante, refetch, showLoading, hideLoading],
  );

  const handleRemoveVoluntario = useCallback(
    (ministerioVoluntarioId: string) => {
      FancyAlert.alert(
        'Excluir definitivamente este voluntário desse ministério?',
        `A exclusão deste voluntário é permanente. Todos os vínculos com esse ministério como funções, escalas e histórico serão removidos e não poderão ser recuperados. Se você não quiser perder o histórico, use a opção "Desativar" em vez de excluir.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sim, estou ciente',
            style: 'destructive',
            onPress: () => {
              removeIntegrante(ministerioVoluntarioId);
            },
          },
        ],
      );
    },
    [removeIntegrante],
  );

  const filteredData = useMemo(() => {
    const list = data ?? [];
    if (statusFiltro === 'ativos')
      return list.filter((i) => i.status === MinisterioVoluntarioStatusEnum.Ativo);
    if (statusFiltro === 'inativos')
      return list.filter((i) => i.status === MinisterioVoluntarioStatusEnum.Inativo);
    return list;
  }, [data, statusFiltro]);

  const stats = useMemo(() => {
    const list = data ?? [];
    const ativos = list.filter((i) => i.status === MinisterioVoluntarioStatusEnum.Ativo).length;
    return { total: list.length, ativos, inativos: list.length - ativos };
  }, [data]);

  if (isLoading) return <FancyLoading />;

  const openEdit = (item: ResponseMinisterioVoluntarioDto) => {
    setActionsIntegrante(null);
    showLoading();
    router.push({
      pathname: '/ministerios/integrantes/edit',
      params: {
        ministerioId: ministerioId!,
        ministerioVoluntarioId: item.id!,
      },
    });
  };

  const selectedStatus = actionsIntegrante
    ? MinisterioVoluntarioStatusEnumMap[actionsIntegrante.status]
    : MinisterioVoluntarioStatusEnum.Ativo;
  const selectedIsActive = selectedStatus === MinisterioVoluntarioStatusEnum.Ativo;

  return (
    <>
      <FancyListPage
        showFab
        fabProps={{
          onPress: () =>
            router.push({ pathname: '/ministerios/integrantes/add', params: { ministerioId } }),
        }}
        fabTutorialTarget={{
          id: 'integrantes-fab',
          registerTarget: tour.registerTarget,
          unregisterTarget: tour.unregisterTarget,
        }}
        showSearchBar
        searchBarProps={{
          value: searchText,
          onSearch: (text) => setSearchText(text.trim()),
        }}
        topContent={
          <View style={styles.topContainer}>
            {tour.showBanner && <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />}
            <FancyListStats
              items={[
                { label: 'Total', value: stats.total },
                { label: 'Ativos', value: stats.ativos, color: palette.primary },
                { label: 'Inativos', value: stats.inativos, color: palette.error },
              ]}
            />
            <FancySegmentedControl<StatusFiltro>
              size='sm'
              options={[
                { label: 'Todos', value: 'todos' },
                { label: 'Ativos', value: 'ativos' },
                { label: 'Inativos', value: 'inativos' },
              ]}
              value={statusFiltro}
              onChange={setStatusFiltro}
            />
          </View>
        }
        listProps={{
          onRefresh: refetch,
          refreshing: isRefetching,
          listEmptyProps: {
            label:
              searchText || statusFiltro !== 'todos'
                ? 'Nenhum integrante encontrado'
                : 'Nenhum integrante cadastrado',
            icon: { library: 'MaterialCommunityIcons', name: 'account-multiple-outline', size: 68 },
          },
          data: filteredData,
          renderItem: ({ item }) => {
            const funcoesAtivas =
              item.funcoes?.filter(
                (f) => f.status === MinisterioVoluntarioFuncaoStatusEnum.Ativo,
              ) ?? [];
            const funcoesLabel = funcoesAtivas
              .map((f) => f.funcao?.nome?.trim())
              .filter((nome): nome is string => Boolean(nome))
              .join(', ');

            return (
              <FancyListItemCard
                onPress={() => openEdit(item)}
                title={item.voluntario?.nome}
                subtitle={item.voluntario?.email}
                subtitleProps={{ ellipsizeMode: 'middle' }}
                leading={{
                  type: 'image',
                  source:
                    item.voluntario?.fotoThumbUrl || item.voluntario?.fotoUrl
                      ? { uri: item.voluntario?.fotoThumbUrl || item.voluntario?.fotoUrl || '' }
                      : AppImages.emptyProfile,
                }}
                meta={
                  <View style={styles.metaChips}>
                    <FancyChips
                      label={VoluntarioHierarquiaEnumLabel[item.hierarquia!]}
                      color={hierarquiaColorMap[item.hierarquia!]}
                      size='small'
                      dot
                    />
                    {funcoesLabel && (
                      <FancyText
                        size='extraSmall'
                        type='medium'
                        color={palette.fonts.inactive}
                        numberOfLines={2}
                        style={styles.funcoesLabel}
                      >
                        {funcoesLabel}
                      </FancyText>
                    )}
                  </View>
                }
                status={
                  <FancyChips
                    size='small'
                    label={MinisterioVoluntarioStatusEnumLabel[item.status]}
                    color={ministerioStatusColorMap[item.status]}
                    dot
                  />
                }
                trailing={{ type: 'menu', onPress: () => setActionsIntegrante(item) }}
              />
            );
          },
        }}
      />

      <FancyActionSheet
        visible={!!actionsIntegrante}
        onClose={() => setActionsIntegrante(null)}
        actions={[
          {
            label: 'Editar',
            icon: { ...DefaultIconsNames.edit, size: 18 },
            onPress: () => actionsIntegrante && openEdit(actionsIntegrante),
          },
          {
            label: selectedIsActive ? 'Desativar' : 'Ativar',
            disabled: isLoadingMutation,
            icon: {
              library: 'FontAwesome6',
              name: selectedIsActive ? 'thumbs-down' : 'thumbs-up',
              size: 16,
            },
            onPress: () => {
              if (!actionsIntegrante) return;
              handleChangeStatus(
                actionsIntegrante.id!,
                actionsIntegrante.voluntario?.nome ?? '',
                selectedIsActive
                  ? MinisterioVoluntarioStatusEnum.Inativo
                  : MinisterioVoluntarioStatusEnum.Ativo,
              );
            },
          },
          {
            label: 'Excluir',
            destructive: true,
            disabled: isLoadingMutation,
            icon: { library: 'FontAwesome6', name: 'trash-can', size: 16 },
            onPress: () => {
              if (actionsIntegrante) handleRemoveVoluntario(actionsIntegrante.id!);
            },
          },
        ]}
      />

      <TutorialOverlay tour={tour} />
    </>
  );
}

const styles = StyleSheet.create({
  topContainer: { gap: 12, paddingHorizontal: 15 },
  metaChips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  funcoesLabel: { flex: 1, minWidth: 0 },
});
