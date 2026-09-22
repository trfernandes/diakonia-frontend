import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import FuncaoFormModal from '../../../../../components/pages/ministerios/funcoes/FuncaoFormModal';
import FancyListPage from '../../../../../components/pages/base/FancyBaseListPage';
import { useMinisterioFuncoesCrud } from '../../../../../hooks/useMinisterioFuncoesCrud';
import { useLocalSearchParams } from 'expo-router';
import { useFocusRefetch } from '../../../../../hooks/useFocusRefetch';
import {
  Condition,
  DynamicQuery,
  Operator,
  OrderDirection,
  ValueType,
} from '../../../../../domain/utils/query_utils';

import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import FancyLoading from '../../../../../components/FancyLoading';
import FancyChips from '../../../../../components/FancyChips';
import { ResponseMinisterioFuncaoDto } from '../../../../../domain/dtos/MinisterioFuncao/ministerio-funcao.response';
import {
  MinisterioFuncaoStatusEnum,
  MinisterioFuncaoStatusEnumLabel,
  MinisterioFuncaoStatusEnumMap,
} from '../../../../../domain/enums/MinisterioFuncao/ministerio-funcao-status.enum';
import { CreateMinisterioFuncaoDto } from '../../../../../domain/dtos/MinisterioFuncao/ministerio-funcao.create';
import { UpdateMinisterioFuncaoDto } from '../../../../../domain/dtos/MinisterioFuncao/ministerio-funcao.update';
import FancyListItemCard from '../../../../../components/cards/FancyListItemCard';
import FancyActionSheet from '../../../../../components/actions/FancyActionSheet';
import { usePallete } from '../../../../../hooks/usePallete';
import { ColorUtils } from '../../../../../utils/color_utils';
import { useLoading } from '../../../../../contexts/LoadingContext';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  FUNCOES_TOUR_ID,
  FUNCOES_TOUR_STEPS,
  FUNCOES_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/funcoesTour';
import { useJourney } from '../../../../../contexts/JourneyContext';

export default function MinisterioFuncoesIndex() {
  const palette = usePallete();
  const { showLoading, hideLoading } = useLoading();

  const journey = useJourney();
  const isJourneyStep = journey.currentStep?.tourId === FUNCOES_TOUR_ID;
  const tour = useScreenTutorial(FUNCOES_TOUR_ID, FUNCOES_TOUR_TITLE, FUNCOES_TOUR_STEPS, {
    onComplete: isJourneyStep ? journey.advance : undefined,
  });

  useEffect(() => {
    if (isJourneyStep && !tour.isActive && tour.ready) {
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourneyStep, tour.ready]);
  const [funcaoFormModalParams, setFuncaoFormModalParams] = useState<
    | {
        mode?: 'add' | 'edit';
        editValues?: ResponseMinisterioFuncaoDto;
        visible?: boolean;
      }
    | undefined
  >();
  const [actionsFuncao, setActionsFuncao] = useState<ResponseMinisterioFuncaoDto | null>(null);

  const { ministerioId } = useLocalSearchParams<{ ministerioId?: string }>();

  const [searchText, setSearchText] = useState('');

  const searchParams = useMemo(() => {
    if (!ministerioId) return;

    const searchCondition: Condition | undefined =
      searchText && searchText.trim() !== ''
        ? {
            path: 'nome',
            operator: Operator.ILIKE,
            value: { type: ValueType.LITERAL, value: searchText },
          }
        : undefined;

    return {
      where: {
        conditions: [
          {
            path: 'ministerioId',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: ministerioId },
          },
          ...(searchCondition ? [searchCondition] : []),
        ],
      },
      orderBy: [{ path: 'nome', direction: OrderDirection.ASC }],
    } as DynamicQuery;
  }, [ministerioId, searchText]);

  const {
    data: funcoesList,
    remove: removeFuncao,
    add: addFuncao,
    update: updateFuncao,
    isLoading,
    isLoadingMutation,
    refetch,
  } = useMinisterioFuncoesCrud({
    initialParams: searchParams,
    autoFetch: true,
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

  const handleConfirm = useCallback(
    async ({
      mode,
      data,
    }:
      | { mode: 'add'; data: CreateMinisterioFuncaoDto }
      | { mode: 'edit'; data: UpdateMinisterioFuncaoDto }) => {
      setFuncaoFormModalParams({ visible: false });
      showLoading('Salvando');
      try {
        if (mode === 'add') {
          await addFuncao?.({
            ministerioId: ministerioId!,
            nome: data.nome!,
            descricao: data.descricao,
            status: data.status!,
          });
        } else if (mode === 'edit') {
          await updateFuncao?.({
            id: data.id!,
            data: {
              nome: data.nome,
              descricao: data.descricao,
              status: data.status,
              ministerioId: ministerioId!,
            },
          });
        }
      } catch {
        // O toast de erro já é exibido pelo onError do useCrud
      } finally {
        hideLoading();
      }
    },
    [ministerioId, addFuncao, updateFuncao, showLoading, hideLoading],
  );

  const handleDeleteFuncao = useCallback(
    (item: ResponseMinisterioFuncaoDto) => {
      FancyAlert.alert('Confirmação', 'Deseja realmente excluir essa função?', [
        {
          text: 'Não',
          style: 'cancel',
        },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            await removeFuncao(item.id!);
          },
        },
      ]);
    },
    [removeFuncao],
  );

  if (isLoading) return <FancyLoading />;

  return (
    <FancyListPage
      showFab
      fabProps={{
        onPress: () =>
          setFuncaoFormModalParams({ mode: 'add', visible: true, editValues: undefined }),
      }}
      fabTutorialTarget={{
        id: 'funcoes-fab',
        registerTarget: tour.registerTarget,
        unregisterTarget: tour.unregisterTarget,
      }}
      showSearchBar
      contentLoading={isFocusLoading}
      searchBarProps={{
        value: searchText,
        onSearch: setSearchText,
      }}
      topContent={
        tour.showBanner ? (
          <View style={{ paddingHorizontal: 15 }}>
            <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />
          </View>
        ) : undefined
      }
      listProps={{
        onRefresh: handlePullRefresh,
        refreshing: isPullRefreshing,
        listEmptyProps: {
          label: searchText ? 'Nenhuma função encontrada' : 'Nenhuma função cadastrada',
          icon: { library: 'MaterialCommunityIcons', name: 'account-cog-outline', size: 68 },
        },
        data: funcoesList,
        renderItem: ({ item }) => {
          const status = MinisterioFuncaoStatusEnumMap[item.status];
          const statusColor =
            status === MinisterioFuncaoStatusEnum.Ativo ? palette.primary : palette.error;
          return (
            <FancyListItemCard
              onPress={() =>
                setFuncaoFormModalParams({
                  visible: true,
                  mode: 'edit',
                  editValues: item,
                })
              }
              title={item.nome}
              subtitle={item.descricao?.trim() || 'Sem descrição cadastrada'}
              leading={{
                type: 'icon',
                icon: {
                  library: 'MaterialCommunityIcons',
                  name: 'badge-account-outline',
                  size: 19,
                },
                color: statusColor,
                backgroundColor: ColorUtils.withAlpha(statusColor, 0.12),
              }}
              status={
                <FancyChips
                  size='small'
                  label={MinisterioFuncaoStatusEnumLabel[status]}
                  color={statusColor}
                  dot
                />
              }
              trailing={{ type: 'menu', onPress: () => setActionsFuncao(item) }}
            />
          );
        },
      }}
    >
      <FancyActionSheet
        visible={!!actionsFuncao}
        onClose={() => setActionsFuncao(null)}
        actions={[
          {
            label: 'Editar',
            icon: { library: 'MaterialCommunityIcons', name: 'pencil-outline', size: 18 },
            onPress: () => {
              if (!actionsFuncao) return;
              setFuncaoFormModalParams({
                visible: true,
                mode: 'edit',
                editValues: actionsFuncao,
              });
            },
          },
          {
            label: 'Excluir',
            destructive: true,
            icon: { library: 'MaterialCommunityIcons', name: 'trash-can-outline', size: 18 },
            onPress: () => {
              if (actionsFuncao) handleDeleteFuncao(actionsFuncao);
            },
          },
        ]}
      />
      <FuncaoFormModal
        visible={!!funcaoFormModalParams?.visible}
        mode={funcaoFormModalParams?.mode || 'add'}
        editValues={funcaoFormModalParams?.editValues}
        isSaving={isLoadingMutation}
        onClose={() => setFuncaoFormModalParams({ visible: false })}
        onSubmit={(result) => {
          if (result.mode === 'add') {
            handleConfirm({ mode: 'add', data: result.data as CreateMinisterioFuncaoDto });
          } else {
            handleConfirm({ mode: 'edit', data: result.data as UpdateMinisterioFuncaoDto });
          }
        }}
      />

      <TutorialOverlay tour={tour} />
    </FancyListPage>
  );
}
