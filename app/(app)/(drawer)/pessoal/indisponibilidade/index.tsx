import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, InteractionManager, StyleSheet, View } from 'react-native';
import FancyCalendarVertical from '../../../../../components/calendar/FancyCalendarVertical';
import DateAvailabilityAdjustmentModal from '../../../../../components/pages/pessoal/indisponibilidade/DateAvailabilityAdjustmentModal';
import { useIndisponibilidadesVoluntariosCrud } from '../../../../../hooks/useIndisponibilidadesVoluntariosCrud';
import { useRegrasIndisponibilidadeVoluntariosCrud } from '../../../../../hooks/useRegrasIndisponibilidadeVoluntariosCrud';
import { useAuth } from '../../../../../contexts/AuthContext';
import { Conjunction, Operator, ValueType } from '../../../../../domain/utils/query_utils';
import FancyError from '../../../../../components/error/FancyError';
import Toast from 'react-native-toast-message';
import { ThemePalette } from '../../../../../constants/colors';
import FancyFab from '../../../../../components/buttons/FancyFab';
import FancyButton from '../../../../../components/buttons/FancyButton';
import AddPeriodoModal from '../../../../../components/pages/pessoal/indisponibilidade/AddPeriodModal';
import AddRegraModal, {
  AddRegraModalResult,
} from '../../../../../components/pages/pessoal/indisponibilidade/AddRegraModal';
import BlockedDayDetailsModal from '../../../../../components/pages/pessoal/indisponibilidade/BlockedDayDetailsModal';
import EscaladoNoDiaSheet from '../../../../../components/pages/pessoal/indisponibilidade/EscaladoNoDiaSheet';
import {
  extrairItensEscalaPublicada,
  ItemEscalaAfetado,
} from '../../../../../domain/utils/escala_bloqueio_utils';
import { router } from 'expo-router';
import DateUtils, { DateUtilsApi } from '../../../../../utils/date_utils';
import FancyLoading from '../../../../../components/FancyLoading';
import { UpsertIndisponibilidadeVoluntarioItemDto } from '../../../../../domain/dtos/IndisponibilidadeVoluntario/upsert-indisponibilidade-voluntario-item.dto';
import { usePallete } from '../../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../../hooks/useThemedStyles';
import { ColorUtils } from '../../../../../utils/color_utils';
import { ResponseRegraIndisponibilidadeVoluntarioDto } from '../../../../../domain/dtos/RegraIndisponibilidadeVoluntario/regra-indisponibilidade-voluntario.response';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import FancyTabs, { TabItem } from '../../../../../components/tabs/FancyTabs';
import FancyScrollView from '../../../../../components/FancyScrollView';
import FancyListItemCard from '../../../../../components/cards/FancyListItemCard';
import FancyText from '../../../../../components/FancyText';
import FancyListEmpty from '../../../../../components/list/FancyListEmpty';
import { TutorialTarget } from '../../../../../components/tutorial/TutorialTarget';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  INDISPONIBILIDADES_TOUR_ID,
  INDISPONIBILIDADES_TOUR_STEPS,
  INDISPONIBILIDADES_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/indisponibilidadesTour';
import { useJourney } from '../../../../../contexts/JourneyContext';
import { useMeusLancamentos } from '../../../../../hooks/useLancamentosIndisponibilidade';
import LancamentoPendenteCard from '../../../../../components/pages/lancamentos-indisponibilidade/LancamentoPendenteCard';
import {
  descreverRegra,
  descreverDetalheRegra,
  regraIcone,
  regraChipLabel,
  regraCor,
  expandirRegrasParaCalendario,
} from '../../../../../domain/utils/regra_indisponibilidade_utils';

type ModalState = {
  visible: boolean;
  date?: Date;
  status?: 'available' | 'unavailable';
  motivo?: string | null;
  ministeriosInteirosIds?: string[] | null;
  funcoesIds?: string[] | null;
};

export default function IndisponibilidadeIndexPage() {
  const { user, igrejaAtiva } = useAuth();
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const userId = user?.user?.id;
  const igrejaId = igrejaAtiva?.id;

  const [modalState, setModalState] = useState<ModalState>({
    visible: false,
    status: 'available',
  });
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);
  const [showRegraModal, setShowRegraModal] = useState(false);
  const [showBlockedDayModal, setShowBlockedDayModal] = useState(false);
  const [selectedBlockedDay, setSelectedBlockedDay] = useState<Date | undefined>();
  const [pendingAddRegra, setPendingAddRegra] = useState<AddRegraModalResult | null>(null);
  const [editingRegra, setEditingRegra] =
    useState<ResponseRegraIndisponibilidadeVoluntarioDto | null>(null);
  const [hasSettled, setHasSettled] = useState(false);
  const [escaladoNoDia, setEscaladoNoDia] = useState<{
    date?: Date;
    itens: ItemEscalaAfetado[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const meusLancamentos = useMeusLancamentos();
  const lancamentosDaIgreja = meusLancamentos.lancamentos.filter((l) => l.igrejaId === igrejaId);
  const fabAnim = useRef(new Animated.Value(1)).current;

  const journey = useJourney();
  const isJourneyStep = journey.currentStep?.tourId === INDISPONIBILIDADES_TOUR_ID;

  const tour = useScreenTutorial(
    INDISPONIBILIDADES_TOUR_ID,
    INDISPONIBILIDADES_TOUR_TITLE,
    INDISPONIBILIDADES_TOUR_STEPS,
    { onComplete: isJourneyStep ? journey.advance : undefined },
  );

  useEffect(() => {
    fabAnim.setValue(0);
    Animated.spring(fabAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 90,
    }).start();
  }, [activeTab]);

  useEffect(() => {
    if (tour.isActive && tour.currentStep?.tabIndex !== undefined) {
      setActiveTab(tour.currentStep.tabIndex);
    }
  }, [tour.isActive, tour.currentStep]);

  useEffect(() => {
    if (isJourneyStep && !tour.isActive && tour.ready) {
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourneyStep, tour.ready]);

  const { queryStartDate, queryEndDate, calendarStartDate, calendarEndDate } = useMemo(() => {
    const now = new Date();

    const qStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    // Dia 0 do mês seguinte = último dia do mês-alvo, não now.getDate() —
    // senão o último mês exibido corta no dia atual em vez de ir até o fim.
    const qEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0);

    const cStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const cEnd = new Date(qEnd);

    qStart.setHours(0, 0, 0, 0);
    qEnd.setHours(0, 0, 0, 0);
    cStart.setHours(0, 0, 0, 0);
    cEnd.setHours(0, 0, 0, 0);

    return {
      queryStartDate: qStart,
      queryEndDate: qEnd,
      calendarStartDate: cStart,
      calendarEndDate: cEnd,
    };
  }, []);

  const initialParams = useMemo(() => {
    if (!userId || !igrejaId) return undefined;
    return {
      igrejaId,
      where: {
        conditions: [
          {
            path: 'voluntario.id',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: userId },
          },
        ],
        conjunction: Conjunction.AND,
      },
    };
  }, [userId, igrejaId]);

  const regrasInitialParams = useMemo(() => {
    if (!userId || !igrejaId) return undefined;
    return {
      igrejaId,
      where: {
        conditions: [
          {
            path: 'voluntario.id',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: userId },
          },
        ],
        conjunction: Conjunction.AND,
      },
    };
  }, [userId, igrejaId]);

  const {
    update: updateData,
    add: addData,
    data,
    removeWithIgreja,
    isLoading: isLoadingData,
    isLoadingMutation: isLoadingMutating,
    isRefetching,
    isError,
    refetch,
    upsertMany,
  } = useIndisponibilidadesVoluntariosCrud({
    initialParams,
    autoFetch: Boolean(userId && igrejaId),
    muteMessages: true,
  });

  const {
    add: addRegra,
    update: updateRegra,
    data: regras,
    isLoading: isLoadingRegras,
    isRefetching: isRefetchingRegras,
    isLoadingMutation: isLoadingMutationRegras,
    removeWithIgreja: removeRegraComIgreja,
  } = useRegrasIndisponibilidadeVoluntariosCrud({
    initialParams: regrasInitialParams,
    autoFetch: Boolean(userId && igrejaId),
    muteMessages: false,
  });

  const loadingFlags =
    isLoadingData || isLoadingMutating || isLoadingRegras || isLoadingMutationRegras;

  useEffect(() => {
    if (loadingFlags) {
      setHasSettled(false);
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      setHasSettled(true);
    });

    return () => task.cancel();
  }, [loadingFlags]);

  const isBusy = loadingFlags || !hasSettled;

  const [lazyToastOptions, setLazyToastOptions] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    show: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isBusy && lazyToastOptions) {
      Toast.show({
        type: lazyToastOptions.type,
        text1: lazyToastOptions.message,
      });
      setLazyToastOptions(null);
    }
  }, [isBusy, lazyToastOptions]);

  const markedDatesIndividuais = useMemo(
    () =>
      data.map((d) => ({
        date: DateUtilsApi.dateOnlyFromApi(d.data),
        T: d.id,
        color: palette.error,
      })),
    [data, palette.error],
  );

  const markedDatesRegras = useMemo(() => {
    const individuaisKeys = new Set(
      markedDatesIndividuais.map((m) => m.date.toISOString().slice(0, 10)),
    );
    const regrasKeys = expandirRegrasParaCalendario(
      regras.filter((r) => r.tipo !== 'LIMITE_MENSAL'),
      calendarStartDate,
      calendarEndDate,
    );
    return Array.from(regrasKeys)
      .filter((k) => !individuaisKeys.has(k))
      .map((k) => ({
        date: DateUtilsApi.dateOnlyFromApi(k),
        T: k,
        color: palette.secondary,
      }));
  }, [regras, markedDatesIndividuais, calendarStartDate, calendarEndDate, palette.error]);

  const allMarkedDates = useMemo(
    () => [...markedDatesIndividuais, ...markedDatesRegras],
    [markedDatesIndividuais, markedDatesRegras],
  );

  const openDateModal = useCallback(
    (date: Date) => {
      // Verifica se há regras que aplicam a este dia
      const regraAplicavel = regras.some((regra) => {
        if (regra.tipo === 'DIAS_SEMANA' && regra.diasSemana?.length) {
          return regra.diasSemana.includes(date.getDay());
        }
        if (regra.tipo === 'PERIODO' && regra.dataInicio && regra.dataFim) {
          const inicio = new Date(regra.dataInicio + 'T00:00:00Z');
          const fim = new Date(regra.dataFim + 'T00:00:00Z');

          if (regra.recorrente) {
            const mmddSelecionado = DateUtilsApi.dateOnlyToApi(date).slice(5);
            const mmddInicio = regra.dataInicio.slice(5);
            const mmddFim = regra.dataFim.slice(5);
            const crossYear = mmddInicio > mmddFim;
            return crossYear
              ? mmddSelecionado >= mmddInicio || mmddSelecionado <= mmddFim
              : mmddSelecionado >= mmddInicio && mmddSelecionado <= mmddFim;
          } else {
            return date >= inicio && date <= fim;
          }
        }
        return false;
      });

      const registro = data.find((d) => DateUtilsApi.compareDateOnlyFromApi(d.data, date));

      if (regraAplicavel) {
        // Regra aplica ao dia — abre consulta somente-leitura (inclui o motivo
        // pontual junto, se houver, em vez de escondê-lo atrás da regra).
        setSelectedBlockedDay(date);
        setShowBlockedDayModal(true);
      } else {
        // Sem regra: comportamento padrão (editar dia pontual)
        setModalState({
          visible: true,
          date,
          status: registro ? 'unavailable' : 'available',
          motivo: registro?.motivo ?? null,
          ministeriosInteirosIds: registro?.ministeriosInteiros?.map((m) => m.id) ?? null,
          funcoesIds: registro?.funcoes?.map((f) => f.id) ?? null,
        });
      }
    },
    [data, regras],
  );

  const handleConfirmAddPeriodo = async (
    inicio: Date,
    fim: Date,
    motivo: string,
    ministeriosInteirosIds?: string[],
    funcoesIds?: string[],
  ) => {
    if (!userId || !igrejaId) return;
    setShowPeriodoModal(false);

    try {
      const datesBetweenPeriod = DateUtils.generateDatesBetween(inicio, fim);

      const indisponibilidades: UpsertIndisponibilidadeVoluntarioItemDto[] = datesBetweenPeriod.map(
        (d) => ({
          data: DateUtilsApi.dateOnlyToApi(d),
          motivo: motivo?.trim() || undefined,
          ministeriosInteirosIds: ministeriosInteirosIds || undefined,
          funcoesIds: funcoesIds || undefined,
        }),
      );

      await upsertMany({
        voluntarioId: userId,
        igrejaId,
        indisponibilidades,
      });

      setLazyToastOptions({
        type: 'info',
        message: 'Período registrado com sucesso',
        show: true,
      });
    } catch (error) {
      const itens = extrairItensEscalaPublicada(error);
      if (itens) {
        setEscaladoNoDia({ itens });
        return;
      }
      console.error('Erro ao registrar período:', error);
      setLazyToastOptions({
        type: 'error',
        message: 'Erro ao registrar período',
        show: true,
      });
    }
  };

  const criarRegra = async (result: AddRegraModalResult) => {
    if (!userId || !igrejaId) return;

    try {
      // Normaliza o resultado: converte null/undefined
      const normalized = {
        ...result,
        ministeriosInteirosIds: result.ministeriosInteirosIds || undefined,
        funcoesIds: result.funcoesIds?.length ? result.funcoesIds : undefined,
        voluntarioId: userId,
        igrejaId,
      };
      await addRegra?.(normalized);
      setShowRegraModal(false);
      setLazyToastOptions({ type: 'success', message: 'Regra criada com sucesso!', show: true });
    } catch (error) {
      // Fluxo direto (sem conflito de limite mensal): modal ainda aberto, erro
      // exibido inline pelo próprio AddRegraModal. No fluxo de conflito o modal
      // já foi fechado antes do FancyAlert; quem trata o erro ali é o onPress
      // do "Confirmar" (toast via setLazyToastOptions).
      console.error('Erro ao criar regra:', error);
      throw error;
    }
  };

  const handleConfirmAddRegra = async (result: AddRegraModalResult) => {
    if (!userId || !igrejaId) return;

    if (result.tipo === 'LIMITE_MENSAL' && result.dataInicio) {
      const regraAberta = regras.find((r) => r.tipo === 'LIMITE_MENSAL' && !r.dataFim);
      if (regraAberta?.dataInicio && result.dataInicio > regraAberta.dataInicio) {
        const dataFechamento = new Date(result.dataInicio + 'T00:00:00Z');
        dataFechamento.setUTCDate(dataFechamento.getUTCDate() - 1);
        const fechamentoFmt = dataFechamento.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'UTC',
        });
        // Fecha o bottom sheet antes do FancyAlert: dois <Modal> nativos empilhados
        // deixam o segundo invisivel/intocavel no Android. Guarda o result p/
        // reabrir preenchido se o usuario cancelar.
        setPendingAddRegra(result);
        setShowRegraModal(false);
        FancyAlert.alert(
          'Encerrar regra atual?',
          `Você já tem uma regra de limite mensal em aberto. Ao criar esta nova regra, a atual será encerrada em ${fechamentoFmt}.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setShowRegraModal(true) },
            {
              text: 'Confirmar',
              onPress: async () => {
                try {
                  await criarRegra(result);
                } catch (error) {
                  console.error('Erro ao criar regra:', error);
                  setLazyToastOptions({
                    type: 'error',
                    message: 'Erro ao criar regra',
                    show: true,
                  });
                } finally {
                  setPendingAddRegra(null);
                }
              },
            },
          ],
        );
        return;
      }
    }

    await criarRegra(result);
  };

  const handleConfirmEditRegra = async (result: AddRegraModalResult) => {
    if (!editingRegra || !userId || !igrejaId) return;
    const id = editingRegra.id;
    const {
      tipo,
      diasSemana,
      dataInicio,
      dataFim,
      recorrente,
      limiteMensal,
      motivo,
      ministeriosInteirosIds,
      funcoesIds,
    } = result;

    try {
      await updateRegra?.({
        id,
        data: {
          tipo,
          diasSemana,
          dataInicio,
          dataFim,
          recorrente,
          limiteMensal,
          motivo,
          ministeriosInteirosIds: ministeriosInteirosIds || undefined,
          funcoesIds: funcoesIds || undefined,
        },
      });
      setEditingRegra(null);
      setLazyToastOptions({
        type: 'success',
        message: 'Regra atualizada com sucesso!',
        show: true,
      });
    } catch (error) {
      // erro exibido inline no próprio modal; modal fica aberto p/ o usuário corrigir
      console.error('Erro ao atualizar regra:', error);
      throw error;
    }
  };

  const handleRemoverRegra = useCallback(
    (regra: ResponseRegraIndisponibilidadeVoluntarioDto) => {
      FancyAlert.alert(`Remover regra`, `Deseja remover "${descreverRegra(regra)}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            if (!igrejaId) return;
            try {
              await removeRegraComIgreja({ id: regra.id, igrejaId });
            } catch {
              setLazyToastOptions({
                type: 'error',
                message: 'Erro ao remover a regra.',
                show: true,
              });
            }
          },
        },
      ]);
    },
    [igrejaId, removeRegraComIgreja],
  );

  const closeModal = () => setModalState((prev) => ({ ...prev, visible: false }));

  const handleConfirm = async (
    mode: 'mark' | 'unmark',
    date: Date,
    motivo?: string,
    ministeriosInteirosIds?: string[],
    funcoesIds?: string[],
  ) => {
    if (!userId || !igrejaId) return;
    const registro = data.find((d) => DateUtilsApi.compareDateOnlyFromApi(d.data, date));
    closeModal();

    try {
      if (mode === 'mark') {
        if (registro?.id) {
          await updateData?.({
            id: registro.id,
            data: {
              data: DateUtilsApi.dateOnlyToApi(date),
              motivo,
              ministeriosInteirosIds: ministeriosInteirosIds || undefined,
              funcoesIds: funcoesIds || undefined,
            },
          });
          setLazyToastOptions({
            type: 'success',
            message: 'Motivo atualizado com sucesso!',
            show: true,
          });
        } else {
          await addData?.({
            data: DateUtilsApi.dateOnlyToApi(date),
            voluntarioId: userId,
            igrejaId,
            motivo,
            ministeriosInteirosIds: ministeriosInteirosIds || undefined,
            funcoesIds: funcoesIds || undefined,
          });
          setLazyToastOptions({
            type: 'info',
            message: 'Data marcada como indisponível!',
            show: true,
          });
        }
      } else if (registro?.id) {
        await removeWithIgreja({ id: registro.id, igrejaId });
        setLazyToastOptions({
          type: 'info',
          message: 'Data disponível novamente!',
          show: true,
        });
      }
    } catch (error) {
      const itens = extrairItensEscalaPublicada(error);
      if (itens) {
        setEscaladoNoDia({ date, itens });
        return;
      }
      console.error('Erro ao atualizar data:', error);
      setLazyToastOptions({
        type: 'error',
        message: 'Erro ao atualizar data!',
        show: true,
      });
    }
  };

  const tabItems: TabItem[] = useMemo(
    () => [
      {
        title: 'Calendário',
        icon: { library: 'MaterialCommunityIcons', name: 'calendar-month-outline', size: 18 },
        content: (
          <View style={{ flex: 1 }}>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendCircle, { backgroundColor: palette.error }]} />
                <FancyText type='medium' size='extraSmall' color={palette.fonts.dark}>
                  Dias específicos
                </FancyText>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendCircle, { backgroundColor: palette.secondary }]} />
                <FancyText type='medium' size='extraSmall' color={palette.fonts.dark}>
                  Regras recorrentes
                </FancyText>
              </View>
            </View>
            <TutorialTarget
              id='indisponibilidade-calendario'
              registerTarget={tour.registerTarget}
              unregisterTarget={tour.unregisterTarget}
              style={{ flex: 1 }}
            >
              <FancyCalendarVertical<'id', string>
                highlightCurrentMonth
                disablePastDates
                contentContainerStyle={{ paddingHorizontal: 15 }}
                startDate={calendarStartDate}
                endDate={calendarEndDate}
                markedDates={allMarkedDates}
                onSelectDate={({ date }) => openDateModal(date)}
                listProps={{
                  bottomSpace: 160,
                  showFade: false,
                  maintainVisibleContentPosition: false,
                }}
                daysProps={{ markerColor: palette.error }}
              />
            </TutorialTarget>
          </View>
        ),
      },
      {
        title: 'Regras',
        icon: { library: 'MaterialCommunityIcons', name: 'calendar-sync-outline', size: 18 },
        content: (
          <TutorialTarget
            id='indisponibilidade-regras-lista'
            registerTarget={tour.registerTarget}
            unregisterTarget={tour.unregisterTarget}
            style={{ flex: 1 }}
          >
            {regras.length ? (
              <FancyScrollView
                contentContainerStyle={{
                  paddingHorizontal: 15,
                  paddingTop: 8,
                  paddingBottom: 84,
                  gap: 10,
                }}
              >
                {regras.map((regra) => {
                  const corRegra = regraCor(regra, palette);
                  return (
                    <FancyListItemCard
                      key={regra.id}
                      onPress={() => setEditingRegra(regra)}
                      title={descreverRegra(regra)}
                      subtitle={
                        <View style={{ gap: 4 }}>
                          <View
                            style={[
                              styles.regraChip,
                              {
                                backgroundColor: ColorUtils.withAlpha(corRegra, 0.1),
                                alignSelf: 'flex-start',
                              },
                            ]}
                          >
                            <FancyText size='extraSmall' type='semiBold' color={corRegra}>
                              {regraChipLabel(regra)}
                            </FancyText>
                          </View>
                          {descreverDetalheRegra(regra) ? (
                            <FancyText
                              size='extraSmall'
                              type='medium'
                              color={palette.fonts.inactive}
                            >
                              {descreverDetalheRegra(regra)}
                            </FancyText>
                          ) : null}
                        </View>
                      }
                      leading={{
                        type: 'icon',
                        icon: {
                          library: 'MaterialCommunityIcons',
                          name: regraIcone(regra) as any,
                          size: 20,
                        },
                        color: corRegra,
                        backgroundColor: ColorUtils.withAlpha(corRegra, 0.1),
                      }}
                      trailing={
                        <FancyButton
                          type='light'
                          mode='icon'
                          size={{ w: 32, h: 32 }}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          icon={{
                            library: 'MaterialCommunityIcons',
                            name: 'trash-can-outline',
                            size: 17,
                            color: palette.icons.light,
                          }}
                          onPress={() => handleRemoverRegra(regra)}
                          accessibilityLabel='Remover regra'
                          containerStyle={{
                            backgroundColor: palette.error,
                            borderRadius: 16,
                            borderWidth: 0,
                          }}
                        />
                      }
                    />
                  );
                })}
              </FancyScrollView>
            ) : (
              <FancyListEmpty
                label='Nenhuma regra cadastrada'
                helperText='Toque no botão + para criar sua primeira regra de indisponibilidade.'
                icon={{
                  library: 'MaterialCommunityIcons',
                  name: 'calendar-remove-outline',
                  size: 55,
                }}
                muted
              />
            )}
          </TutorialTarget>
        ),
      },
    ],
    [
      calendarStartDate,
      calendarEndDate,
      allMarkedDates,
      palette,
      regras,
      openDateModal,
      handleRemoverRegra,
      styles,
      tour.registerTarget,
      tour.unregisterTarget,
    ],
  );

  if (!userId || !igrejaId) {
    return (
      <View style={[styles.emptyContainer]}>
        <FancyText>Não foi possível carregar suas indisponibilidades.</FancyText>
      </View>
    );
  }

  if (isError) {
    return <FancyError.Default onUpdate={refetch} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.backgroundColor }}>
      {tour.showBanner && (
        <View style={{ paddingHorizontal: 15, paddingVertical: 10 }}>
          <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />
        </View>
      )}

      <View style={{ flex: 1, opacity: isBusy ? 0 : 1 }}>
        {lancamentosDaIgreja.length > 0 && (
          <View style={{ paddingHorizontal: 15, paddingTop: 10, gap: 10 }}>
            {lancamentosDaIgreja.map((lancamento) => (
              <LancamentoPendenteCard
                key={lancamento.lancamentoId}
                lancamento={lancamento}
                onMarcar={meusLancamentos.marcarJaLancei}
                onDesfazer={meusLancamentos.desfazerJaLancei}
                isMutating={meusLancamentos.isMutating}
              />
            ))}
          </View>
        )}
        <FancyTabs
          keepMounted
          contentGutter={false}
          items={tabItems}
          initialIndex={activeTab}
          onTabChange={setActiveTab}
        />

        <Animated.View
          pointerEvents='box-none'
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: fabAnim, transform: [{ scale: fabAnim }] },
          ]}
        >
          {activeTab === 0 && (
            <TutorialTarget
              id='indisponibilidade-adicionar'
              registerTarget={tour.registerTarget}
              unregisterTarget={tour.unregisterTarget}
              style={{ position: 'absolute', right: 15, bottom: 10, width: 50, height: 50 }}
              pointerEvents='box-none'
            >
              <FancyFab
                icon={{ library: 'MaterialCommunityIcons', name: 'calendar-plus', size: 26 }}
                onPress={() => setShowPeriodoModal(true)}
                bottom={0}
                right={0}
              />
            </TutorialTarget>
          )}

          {activeTab === 1 && (
            <TutorialTarget
              id='indisponibilidade-regras-fab'
              registerTarget={tour.registerTarget}
              unregisterTarget={tour.unregisterTarget}
              style={{ position: 'absolute', right: 15, bottom: 10, width: 50, height: 50 }}
              pointerEvents='box-none'
            >
              <FancyFab
                testID='fab-add-regra'
                icon={{ library: 'MaterialCommunityIcons', name: 'plus', size: 26 }}
                onPress={() => setShowRegraModal(true)}
                bottom={0}
                right={0}
              />
            </TutorialTarget>
          )}
        </Animated.View>
      </View>

      {isBusy && (
        <View style={styles.loadingOverlay}>
          <FancyLoading />
        </View>
      )}

      {modalState.visible && (
        <DateAvailabilityAdjustmentModal
          data={{
            date: modalState.date!,
            status: modalState.status!,
            motivo: modalState.motivo ?? undefined,
            ministeriosInteirosIds: modalState.ministeriosInteirosIds,
            funcoesIds: modalState.funcoesIds,
          }}
          modalProps={{ onButton1Press: closeModal }}
          onConfirm={handleConfirm}
        />
      )}

      {showPeriodoModal && (
        <AddPeriodoModal
          visible={showPeriodoModal}
          modalProps={{ onButton1Press: () => setShowPeriodoModal(false) }}
          onConfirm={handleConfirmAddPeriodo}
        />
      )}

      {showRegraModal && (
        <AddRegraModal
          visible={showRegraModal}
          onClose={() => {
            setShowRegraModal(false);
            setPendingAddRegra(null);
          }}
          onConfirm={handleConfirmAddRegra}
          initialValues={pendingAddRegra ?? undefined}
          voluntarioId={userId}
          igrejaId={igrejaId}
          regrasExistentes={regras}
        />
      )}

      {editingRegra && (
        <AddRegraModal
          visible={!!editingRegra}
          isEditing
          editingRegraId={editingRegra.id}
          initialValues={{
            tipo: editingRegra.tipo,
            ministeriosInteirosIds: editingRegra.ministeriosInteiros?.map((m) => m.id) ?? undefined,
            funcoesIds: editingRegra.funcoes?.map((f) => f.id) ?? undefined,
            diasSemana: editingRegra.diasSemana ?? undefined,
            dataInicio: editingRegra.dataInicio ?? undefined,
            dataFim: editingRegra.dataFim ?? undefined,
            recorrente: editingRegra.recorrente ?? undefined,
            limiteMensal: editingRegra.limiteMensal ?? undefined,
            motivo: editingRegra.motivo ?? undefined,
          }}
          onClose={() => setEditingRegra(null)}
          onConfirm={handleConfirmEditRegra}
          voluntarioId={userId}
          igrejaId={igrejaId}
          regrasExistentes={regras}
        />
      )}

      {/* Modal de detalhes de bloqueio por regra */}
      <BlockedDayDetailsModal
        visible={showBlockedDayModal}
        onClose={() => {
          setShowBlockedDayModal(false);
          setSelectedBlockedDay(undefined);
        }}
        selectedDate={selectedBlockedDay}
        regras={regras}
        indisponibilidadesPontuais={data}
      />

      <EscaladoNoDiaSheet
        visible={!!escaladoNoDia}
        date={escaladoNoDia?.date}
        itens={escaladoNoDia?.itens ?? []}
        onEscolherOutroDia={() => setEscaladoNoDia(null)}
        onPedirSubstituicao={() => {
          setEscaladoNoDia(null);
          router.push('/(app)/(drawer)/pessoal/escalas');
        }}
      />

      <TutorialOverlay tour={tour} />
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: palette.overlays.strongBackdrop,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
    },
    legend: {
      flexDirection: 'row',
      paddingHorizontal: 15,
      paddingTop: 8,
      paddingBottom: 16,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendCircle: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    regraChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
  });
}
