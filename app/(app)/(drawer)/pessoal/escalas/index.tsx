import { StyleSheet } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import { useAuth } from '../../../../../contexts/AuthContext';
import FancyCalendar, { MarkedDate } from '../../../../../components/calendar/FancyCalendar';
import ModernDatePickerSheet from '../../../../../components/datepicker/ModernDatePickerSheet';
import FancyList from '../../../../../components/list/FancyList';
import { endOfMonth, isBefore, startOfDay, startOfMonth } from 'date-fns';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';

import SubstituicaoModalPage from '../../../../../components/pages/pessoal/escalas/index/SubstituicaoModalPage';
import { EscalaItensRepository } from '../../../../../domain/services/EscalaItensRepository';
import { useEscalaItensCrud } from '../../../../../hooks/useEscalaItensCrud';
import Toast from 'react-native-toast-message';
import EventoDetails, {
  EventoDetailsProps,
} from '../../../../../components/pages/pessoal/escalas/index/EventoDetails';
import FancyLoading from '../../../../../components/FancyLoading';
import FancyListEmpty from '../../../../../components/list/FancyListEmpty';
import EventoAccordeon from '../../../../../components/pages/pessoal/escalas/index/EventoAccordeon';
import PendenciasChip from '../../../../../components/pages/pessoal/escalas/index/PendenciasChip';
import FancySeparator from '../../../../../components/FancySeparator';
import { EscalaItemStatusEnum } from '../../../../../domain/enums/Escala/escala-item-status.enum';
import { EscalaStatusEnum } from '../../../../../domain/enums/Escala/escala-status.enum';
import { ResponseEscalaItemDto } from '../../../../../domain/dtos/Escala/escala-item.response';
import { getApiErrorMessage } from '../../../../../domain/api/api-error';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import { resolveEventoEnsaioInfo } from '../../../../../utils/evento-ensaio';
import { useSubstituicaoPedidosCrud } from '../../../../../hooks/useSubstituicaoPedidosCrud';
import { ResponseVoluntarioDto } from '../../../../../domain/dtos/Voluntario/voluntario.response';
import { TutorialTarget } from '../../../../../components/tutorial/TutorialTarget';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  ESCALAS_VOLUNTARIO_TOUR_ID,
  ESCALAS_VOLUNTARIO_TOUR_STEPS,
  ESCALAS_VOLUNTARIO_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/escalasVoluntarioTour';
import { useJourney } from '../../../../../contexts/JourneyContext';
import { useAnalytics } from '../../../../../core/analytics/AnalyticsContext';
import {
  AnalyticsEvent,
  buildDisponibilidadeRespondidaProps,
} from '../../../../../core/analytics/events';
import { usePallete } from '../../../../../hooks/usePallete';

// Piso do calendário. Sem isso o FancyCalendar trava em "hoje" e a seta de
// voltar mês fica desabilitada — aqui a tela é de consulta e precisa navegar
// pro passado sem limite prático.
const CALENDAR_PAST_FLOOR = new Date(2000, 0, 1);

export type EscalaDoDiaAgrupada = {
  eventoId: string;
  evento: ResponseEscalaItemDto['evento'];
  dataOcorrencia: Date;
  ministerio: NonNullable<ResponseEscalaItemDto['voluntario']>['ministerio'];
  voluntario: ResponseEscalaItemDto['voluntario'];
  itens: ResponseEscalaItemDto[];
  horarioEnsaio?: string;
  responsavelSetlistVoluntarioId?: string;
  responsavelSetlistVoluntario?: ResponseVoluntarioDto | null;
};

function firstRouteParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveRouteDate(value?: string | string[]) {
  const raw = firstRouteParam(value);
  if (!raw) return null;

  try {
    const date = DateUtilsApi.dateOnlyFromApi(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export default function MinhasEscalasIndexPage() {
  const palette = usePallete();
  const { user, igrejaAtiva } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    selectedDate?: string;
    dataOcorrencia?: string;
    dataEvento?: string;
    month?: string;
    dataReferencia?: string;
    escalaId?: string;
  }>();
  const [escalasDoUsuario, setEscalasDoUsuario] = useState<ResponseEscalaItemDto[]>([]);
  const [isLoadingEscalas, setIsLoadingEscalas] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const posthog = useAnalytics();
  const { update: updateEscala, isLoadingMutation: isLoading } = useEscalaItensCrud({
    muteMessages: true,
  });

  const journey = useJourney();
  const isJourneyStep = journey.currentStep?.tourId === ESCALAS_VOLUNTARIO_TOUR_ID;
  const tour = useScreenTutorial(
    ESCALAS_VOLUNTARIO_TOUR_ID,
    ESCALAS_VOLUNTARIO_TOUR_TITLE,
    ESCALAS_VOLUNTARIO_TOUR_STEPS,
    { onComplete: isJourneyStep ? journey.advance : undefined },
  );

  useEffect(() => {
    if (isJourneyStep && !tour.isActive && tour.ready) {
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourneyStep, tour.ready]);

  const [substituicaoPageParams, setSubstituicaoPageParams] = useState<
    { visible: boolean; dadosEscala?: ResponseEscalaItemDto } | undefined
  >({
    visible: false,
  });
  const [eventoPageParams, setEventoPageParams] = useState<{
    visible: boolean;
    data?: EventoDetailsProps;
  }>({
    visible: false,
  });

  const { criarPedido } = useSubstituicaoPedidosCrud();

  const initialDateFromParams = useMemo(
    () => resolveRouteDate(params.selectedDate ?? params.dataOcorrencia ?? params.dataEvento),
    [params.dataEvento, params.dataOcorrencia, params.selectedDate],
  );
  const initialMonthFromParams = useMemo(
    () => resolveRouteDate(params.month ?? params.dataReferencia),
    [params.dataReferencia, params.month],
  );

  const [selectedDate, setSelectedDate] = useState<Date>(
    initialDateFromParams ?? initialMonthFromParams ?? new Date(),
  );
  const [showingMonth, setShowingMonth] = useState<Date>(
    initialMonthFromParams ?? initialDateFromParams ?? new Date(),
  );
  const [eventosOfSelectedDate, setEventosOfSelectedDate] = useState<EscalaDoDiaAgrupada[]>([]);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    const nextDate = initialDateFromParams ?? initialMonthFromParams;
    if (!nextDate) return;
    setSelectedDate(nextDate);
    setShowingMonth(nextDate);
  }, [initialDateFromParams, initialMonthFromParams]);

  const loadMonthEscalas = useCallback(async () => {
    if (!igrejaAtiva?.id || !user?.user?.id) return;

    setIsLoadingEscalas(true);
    try {
      const dataInicio = DateUtilsApi.dateOnlyToApi(startOfMonth(showingMonth));
      const dataTermino = DateUtilsApi.dateOnlyToApi(endOfMonth(showingMonth));

      const result = await EscalaItensRepository.getByVoluntarioId(user.user.id, {
        igrejaId: igrejaAtiva.id,
        dataInicio,
        dataTermino,
      });

      // Filtrar escalas geradas — mostrar somente publicadas
      const filtered = result.filter(
        (item) => !item.escala || item.escala.status !== EscalaStatusEnum.Gerada,
      );
      setEscalasDoUsuario(filtered);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 400) {
          Toast.show({
            type: 'error',
            text1: 'Período inválido',
            text2: 'Período inválido para consulta.',
          });
          return;
        }

        if (status === 403) {
          Toast.show({
            type: 'error',
            text1: 'Acesso negado',
            text2: 'Você não pode consultar escalas de outro voluntário.',
          });
          return;
        }
      }

      Toast.show({
        type: 'error',
        text1: 'Não foi possível carregar suas escalas.',
        text2: getApiErrorMessage(error, 'Tente novamente em instantes.'),
      });
    } finally {
      setIsLoadingEscalas(false);
    }
  }, [user?.user?.id, igrejaAtiva?.id, showingMonth]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadMonthEscalas();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMonthEscalas]);

  useEffect(() => {
    loadMonthEscalas();
  }, [loadMonthEscalas]);

  useFocusEffect(
    useCallback(() => {
      loadMonthEscalas();
    }, [loadMonthEscalas]),
  );

  useEffect(() => {
    const escalaId = firstRouteParam(params.escalaId);
    if (!escalaId || escalasDoUsuario.length === 0) return;

    const match = escalasDoUsuario.find(
      (item) => item.escala?.id === escalaId || item.id === escalaId,
    );

    if (!match?.dataOcorrencia) return;
    const targetDate = DateUtilsApi.dateOnlyFromApi(match.dataOcorrencia);
    setSelectedDate(targetDate);
    setShowingMonth(targetDate);
  }, [escalasDoUsuario, params.escalaId]);

  const markedDates = useMemo<MarkedDate[]>(() => {
    if (!escalasDoUsuario) return [];

    const keyFrom = (item: ResponseEscalaItemDto) => {
      const ministerioId = item.voluntario?.ministerio?.id ?? '';
      const dataISO = DateUtilsApi.dateOnlyFromApi(item.dataOcorrencia).toISOString();
      const eventoId = item.evento?.id ?? '';
      return `${ministerioId}::${eventoId}::${dataISO}`;
    };

    const eventos = Array.from(
      new Map(
        escalasDoUsuario.map((item) => [
          keyFrom(item),
          {
            ministerioId: item.voluntario?.ministerio?.id!,
            evento: item.evento,
            dataOcorrencia: item.dataOcorrencia,
          },
        ]),
      ).values(),
    ).sort((a, b) => {
      const timeA = DateUtilsApi.dateOnlyFromApi(a.dataOcorrencia).getTime();

      const timeB = DateUtilsApi.dateOnlyFromApi(b.dataOcorrencia).getTime();

      const diffHora = timeA - timeB;
      if (diffHora !== 0) return diffHora;

      return (a.evento?.nome ?? '').localeCompare(b.evento?.nome ?? '', 'pt-BR', {
        sensitivity: 'base',
      });
    });

    return eventos.map((escala) => ({
      date: DateUtilsApi.dateOnlyFromApi(escala.dataOcorrencia),
      color: escala.evento?.cor ?? palette.primary,
    }));
  }, [escalasDoUsuario, palette]);

  const loadDayEscalas = useCallback(
    async (date: Date) => {
      const map = new Map<string, EscalaDoDiaAgrupada>();

      escalasDoUsuario
        // 1) mantém só as escalas desse dia
        .filter((evento) => DateUtilsApi.compareDateOnlyFromApi(evento.dataOcorrencia, date))
        .forEach((item) => {
          const eventoId = item.evento?.id ?? '';
          if (!eventoId) return;

          const dataDate = DateUtilsApi.dateOnlyFromApi(item.dataOcorrencia);

          // se quiser separar também por horário, manter o ISO inteiro faz sentido
          const dataISO = dataDate.toISOString();

          // ministério deste item (mesma expressão usada para definir agrupado.ministerio)
          const ministerioIdKey =
            item.voluntario?.ministerio?.id ?? item.escala?.ministerio?.id ?? '';

          // 2) chave = EVENTO + DATA_OCORRENCIA + MINISTÉRIO
          // inclui o ministério para não fundir escalas de ministérios distintos no mesmo
          // culto/data — caso contrário o ministerioId enviado ao backend (ex.: ao salvar
          // música no setlist) pode ser o de outro ministério e a validação falha.
          const key = `${eventoId}::${dataISO}::${ministerioIdKey}`;

          let agrupado = map.get(key);
          if (!agrupado) {
            agrupado = {
              eventoId,
              evento: item.evento,
              dataOcorrencia: dataDate,
              ministerio: item.voluntario?.ministerio ?? item.escala?.ministerio,
              voluntario: item.voluntario,
              itens: [],
              horarioEnsaio: resolveEventoEnsaioInfo({
                horarioEnsaio: item.horarioEnsaio,
                horarioEnsaioPadrao: item.evento?.horarioEnsaioPadrao,
              }).horario,
              responsavelSetlistVoluntarioId: item.responsavelSetlistVoluntarioId,
              responsavelSetlistVoluntario: item.responsavelSetlistVoluntario ?? null,
            };
            map.set(key, agrupado);
          }

          if (!agrupado.horarioEnsaio) {
            agrupado.horarioEnsaio = resolveEventoEnsaioInfo({
              horarioEnsaio: item.horarioEnsaio,
              horarioEnsaioPadrao: item.evento?.horarioEnsaioPadrao,
            }).horario;
          }
          if (!agrupado.ministerio) {
            agrupado.ministerio = item.voluntario?.ministerio ?? item.escala?.ministerio;
          }
          if (!agrupado.responsavelSetlistVoluntarioId) {
            agrupado.responsavelSetlistVoluntarioId = item.responsavelSetlistVoluntarioId;
          }
          if (!agrupado.responsavelSetlistVoluntario && item.responsavelSetlistVoluntario) {
            agrupado.responsavelSetlistVoluntario = item.responsavelSetlistVoluntario;
          }

          // 3) sempre adiciona o registro no grupo
          agrupado.itens.push(item);
        });

      const eventosAgrupados = Array.from(map.values()).sort((a, b) => {
        const diffHora = a.dataOcorrencia.getTime() - b.dataOcorrencia.getTime();
        if (diffHora !== 0) return diffHora;

        return (a.evento?.nome ?? '').localeCompare(b.evento?.nome ?? '', 'pt-BR', {
          sensitivity: 'base',
        });
      });

      setEventosOfSelectedDate(eventosAgrupados);
    },
    [escalasDoUsuario, setEventosOfSelectedDate],
  );

  useEffect(() => {
    loadDayEscalas(selectedDate);
  }, [loadDayEscalas, selectedDate]);

  const handleConfirmEvento = useCallback(
    (escalaItensId: string) => {
      FancyAlert.alert('Confirmação', 'Você confirma seu serviço neste evento?', [
        {
          text: 'Não',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateEscala?.({
                id: escalaItensId,
                data: { status: EscalaItemStatusEnum.Ausente },
              });
              posthog.capture(
                AnalyticsEvent.DisponibilidadeRespondida,
                buildDisponibilidadeRespondidaProps({
                  escalaItemId: escalaItensId,
                  disponivel: false,
                }),
              );
              Toast.show({ type: 'info', text1: 'Ausência registrada.' });
              await loadMonthEscalas();
              queryClient.invalidateQueries({ queryKey: ['evento-equipe'] });
            } catch {
              Toast.show({ type: 'error', text1: 'Erro ao registrar ausência.' });
            }
          },
        },
        {
          text: 'Sim',
          onPress: async () => {
            try {
              await updateEscala?.({
                id: escalaItensId,
                data: { status: EscalaItemStatusEnum.Confirmado },
              });
              posthog.capture(
                AnalyticsEvent.DisponibilidadeRespondida,
                buildDisponibilidadeRespondidaProps({
                  escalaItemId: escalaItensId,
                  disponivel: true,
                }),
              );
              Toast.show({ type: 'success', text1: 'Presença confirmada!' });
              await loadMonthEscalas();
              queryClient.invalidateQueries({ queryKey: ['evento-equipe'] });
            } catch {
              Toast.show({ type: 'error', text1: 'Erro ao confirmar presença.' });
            }
          },
        },
      ]);
    },
    [updateEscala, loadMonthEscalas, posthog],
  );

  const handleConfirmSubstituicao = useCallback(
    async (escalaItemId: string, motivo: string) => {
      try {
        await updateEscala?.({
          id: escalaItemId,
          data: { status: EscalaItemStatusEnum.SubstituicaoSolicitada },
        });

        await criarPedido({ escalaItemId, motivo });

        Toast.show({
          type: 'success',
          text1: 'Solicitação enviada!',
          text2: 'Estamos buscando alguém do ministério pra assumir a função.',
        });
        setSubstituicaoPageParams({ visible: false });
        await loadMonthEscalas();
        queryClient.invalidateQueries({ queryKey: ['evento-equipe'] });
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Erro ao solicitar substituição',
          text2: 'Tente novamente.',
        });
      }
    },
    [updateEscala, criarPedido, loadMonthEscalas, setSubstituicaoPageParams, queryClient],
  );

  if (isLoading || isLoadingEscalas) return <FancyLoading />;

  return (
    <FancyPageView style={styles.container}>
      {tour.showBanner && <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />}

      <PendenciasChip />

      <TutorialTarget
        id='escalas-calendario'
        registerTarget={tour.registerTarget}
        unregisterTarget={tour.unregisterTarget}
      >
        <FancyCalendar
          containerStyle={styles.calendarContainer}
          visualStyle='agendaPremium'
          value={selectedDate}
          minimumDate={CALENDAR_PAST_FLOOR}
          markedDates={markedDates}
          onDateJumpPress={() => setDatePickerVisible(true)}
          onChangeSelectedDate={setSelectedDate}
          onChangeMonthVisualization={(data) => {
            setShowingMonth(data);
            setSelectedDate(startOfMonth(data));
          }}
        />
      </TutorialTarget>
      <ModernDatePickerSheet
        visible={datePickerVisible}
        value={selectedDate}
        minimumDate={CALENDAR_PAST_FLOOR}
        quickActions={['today']}
        title='Ir para data'
        onClose={() => setDatePickerVisible(false)}
        onConfirm={(date) => {
          setDatePickerVisible(false);
          setShowingMonth(date);
          setSelectedDate(date);
        }}
      />
      <FancySeparator style={styles.calendarSeparator} />
      <TutorialTarget
        id='escalas-lista-dia'
        registerTarget={tour.registerTarget}
        unregisterTarget={tour.unregisterTarget}
        style={styles.eventsListContainer}
      >
        {eventosOfSelectedDate.length === 0 ? (
          <FancyListEmpty
            label='Nenhuma escala neste dia'
            icon={{ library: 'MaterialCommunityIcons', name: 'calendar-blank-outline', size: 55 }}
          />
        ) : (
          <FancyList
            bottomSpace={-10}
            containerStyle={{ borderWidth: 0, flex: 1 }}
            data={eventosOfSelectedDate}
            onRefresh={handleRefresh}
            refreshing={isRefreshing}
            renderItem={({ item, index }) => (
              <EventoAccordeon
                data={item}
                key={index}
                readOnly={isBefore(startOfDay(item.dataOcorrencia), startOfDay(new Date()))}
                onConfirmButtonPress={(dadosEscala) => handleConfirmEvento(dadosEscala.id!)}
                onSubButtonPress={(dadosEscala) =>
                  setSubstituicaoPageParams({
                    visible: true,
                    dadosEscala,
                  })
                }
              />
            )}
          />
        )}
        {substituicaoPageParams?.dadosEscala && (
          <SubstituicaoModalPage
            visible={!!substituicaoPageParams.visible}
            dadosEscala={substituicaoPageParams.dadosEscala}
            onClose={() => setSubstituicaoPageParams({ visible: false })}
            onConfirm={(data) => handleConfirmSubstituicao(data.escalaItemId, data.motivo)}
          />
        )}
        {eventoPageParams.visible && (
          <EventoDetails
            eventoId={eventoPageParams.data!.eventoId}
            data={eventoPageParams.data!.data}
            modalProps={{ visible: true }}
            onButton1Press={() => setEventoPageParams({ visible: false })}
            onButton2Press={() => setEventoPageParams({ visible: false })}
          />
        )}
      </TutorialTarget>

      <TutorialOverlay tour={tour} />
    </FancyPageView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderWidth: 0,
    gap: 8,
  },
  calendarContainer: { backgroundColor: 'transparent', borderWidth: 0 },
  calendarSeparator: { marginTop: -2, marginBottom: 0, opacity: 0.55 },
  eventsListContainer: { flex: 1, paddingTop: 2 },
});
