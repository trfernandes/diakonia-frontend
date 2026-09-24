import { StyleSheet, View } from 'react-native';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import FancySteps from '../../../../../components/steps/FancySteps';
import { FancyStepsConfig } from '../../../../../components/steps/FancyStepsConfig';
import { useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { usePallete } from '../../../../../hooks/usePallete';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  EscalaEventosArraySchema,
  EscalaFormData,
  EscalaParticipantesArraySchema,
  EscalaSchema,
} from '../../../../../domain/schemas/escalaSchema';
import AssistenteParametrosStep from '../../../../../components/pages/ministerios/escalas/assistant/AssistenteParametrosStep';
import AssistenteEventosStep from '../../../../../components/pages/ministerios/escalas/assistant/AssistenteEventosStep';
import AssistenteParticipantesStep from '../../../../../components/pages/ministerios/escalas/assistant/AssistenteParticipantesStep';
import AssistenteRevisaoStep from '../../../../../components/pages/ministerios/escalas/assistant/AssistenteRevisaoStep';
import { router, useLocalSearchParams } from 'expo-router';
import { useEscalasCrud } from '../../../../../hooks/useEscalaCrud';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useLoading } from '../../../../../contexts/LoadingContext';
import AssistenteResultadoStep from '../../../../../components/pages/ministerios/escalas/assistant/AssistenteResultadoStep';
import {
  AssistenteEscalaProvider,
  useAssistenteEscala,
} from '../../../../../contexts/pages/escalas/AssistantContext';
import Toast from 'react-native-toast-message';
import { EscalaRepository } from '../../../../../domain/services/EscalaRepository';
import { useAnalytics } from '../../../../../core/analytics/AnalyticsContext';
import { AnalyticsEvent, buildEscalaCriadaProps } from '../../../../../core/analytics/events';
import { Operator, ValueType, Conjunction } from '../../../../../domain/utils/query_utils';
import {
  CreateEscalaDto,
  CreateEscalaEventoDto,
  CreateEscalaEventoEquipePersonalizadaDto,
  CreateEscalaEventoEquipePorTemplateDto,
} from '../../../../../domain/dtos/Escala/escala.create';
import { EscalaTemplateTipoEnum } from '../../../../../domain/enums/EscalaTemplate/escala-template-tipo.enum';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import { useEscalaNomeValidator } from '../../../../../hooks/useEscalaNomeValidator';
import { getApiErrorMessage } from '../../../../../domain/api/api-error';
import { TutorialTarget } from '../../../../../components/tutorial/TutorialTarget';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  ESCALA_ASSISTENTE_TOUR_ID,
  ESCALA_ASSISTENTE_TOUR_STEPS,
  ESCALA_ASSISTENTE_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/escalaAssistenteTour';
import { useJourney } from '../../../../../contexts/JourneyContext';

const DUPLICATE_NAME_MESSAGE = 'Já existe uma escala com esse nome neste ministério.';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeEscalaName = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const mapEscalaFormToDto = (
  ministerioId: string,
  usuarioId: string,
  values: EscalaFormData,
): CreateEscalaDto => {
  const eventos =
    values.eventos
      ?.filter((evento) => evento.selected)
      .map((evento) => {
        let equipe:
          CreateEscalaEventoEquipePorTemplateDto | CreateEscalaEventoEquipePersonalizadaDto | null;

        if (evento.template.templateBase) {
          const templateId =
            'id' in evento.template.templateBase
              ? (evento.template.templateBase as { id?: string }).id
              : undefined;

          if (!templateId || !UUID_REGEX.test(templateId)) {
            throw new Error(
              `O evento "${evento.nome}" usa um template inválido. Selecione novamente a equipe antes de gerar a escala.`,
            );
          }

          equipe = {
            origem: 'porTemplate',
            templateId,
          } as CreateEscalaEventoEquipePorTemplateDto;
        } else {
          equipe = {
            origem: 'personalizada',
            tipo: evento.template.tipo,
            funcoes:
              evento.template.tipo === EscalaTemplateTipoEnum.Funcoes
                ? evento.template.funcoes?.map((funcao) => ({
                    funcaoIds: funcao.funcaoIds!,
                    quantidade: funcao.quantidade,
                    experienciaMinima: funcao.experiencia,
                    comparacaoExperiencia: funcao.comparacaoExperiencia,
                  }))
                : undefined,
            fixos:
              evento.template.tipo === EscalaTemplateTipoEnum.Fixo
                ? evento.template.fixos?.map((fixo) => ({
                    voluntarioId: fixo.minVolId,
                    funcaoId: fixo.funcaoId,
                  }))
                : undefined,
          } as CreateEscalaEventoEquipePersonalizadaDto;
        }
        return {
          id: evento.eventoId,
          data: DateUtilsApi.dateOnlyToApi(evento.dataOcorrencia),
          equipe: equipe,
        } as CreateEscalaEventoDto;
      }) ?? [];

  const participantes =
    values.participantes
      ?.filter((e) => e.selected)
      .map((participante) => ({
        minVolId: participante.minVolId,
        voluntarioId: participante.voluntarioId,
      })) ?? [];

  return {
    ministerioId,
    criadoPor: usuarioId,
    nome: values.nome,
    dataInicio: DateUtilsApi.dateOnlyToApi(values.dataInicio),
    dataTermino: DateUtilsApi.dateOnlyToApi(values.dataTermino),
    ...(eventos.length ? { eventos } : {}),
    ...(participantes.length ? { participantes } : {}),
  };
};

function AssistenteWrapper() {
  const Pallete = usePallete();
  const {
    ministerioId,
    setResultado,
    index,
    setIndex,
    nextStep,
    previousStep,
    setShouldLoadEvents,
    resultado,
    setTempoGeracaoEscala,
  } = useAssistenteEscala();

  const { showLoading, hideLoading } = useLoading();

  const { generate: generateEscala, isGenerating: isGeneratingEscala } = useEscalasCrud();
  const posthog = useAnalytics();

  const journey = useJourney();
  const isJourneyStep = journey.currentStep?.tourId === ESCALA_ASSISTENTE_TOUR_ID;
  const tour = useScreenTutorial(
    ESCALA_ASSISTENTE_TOUR_ID,
    ESCALA_ASSISTENTE_TOUR_TITLE,
    ESCALA_ASSISTENTE_TOUR_STEPS,
    { onComplete: isJourneyStep ? journey.advance : undefined },
  );

  useEffect(() => {
    if (isJourneyStep && !tour.isActive && tour.ready) {
      tour.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isJourneyStep, tour.ready]);

  // FancySteps desmonta o passo anterior ao trocar de índice (diferente do FancyTabs,
  // que mantém tudo montado) — por isso o tour precisa levar o wizard até o passo certo
  // antes de medir o alvo, e devolver o wizard ao início quando o tour terminar, já que
  // o usuário ainda não preencheu os campos obrigatórios do passo "Dados".
  useEffect(() => {
    if (tour.isActive && tour.currentStep?.wizardIndex !== undefined) {
      setIndex(tour.currentStep.wizardIndex);
    }
  }, [tour.isActive, tour.currentStep, setIndex]);

  const wasTourActiveRef = useRef(false);
  useEffect(() => {
    if (wasTourActiveRef.current && !tour.isActive) {
      setIndex(0);
    }
    wasTourActiveRef.current = tour.isActive;
  }, [tour.isActive, setIndex]);

  const dataAtual = new Date();

  const form = useForm({
    resolver: zodResolver(EscalaSchema),
    defaultValues: {
      dataInicio: new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1),
      dataTermino: new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 2, 0),
      markEventsAll: true,
      markParticipantsAll: true,
      eventos: [],
    },
  });

  form.register('dataInicio', {
    onChange: () => {
      setShouldLoadEvents(true);
      if (form.formState.errors.dataInicio) {
        form.trigger(['dataInicio', 'dataTermino']);
      }
    },
  });

  form.register('dataTermino', {
    onChange: () => {
      setShouldLoadEvents(true);
      if (form.formState.errors.dataTermino) {
        form.trigger(['dataInicio', 'dataTermino']);
      }
    },
  });

  const nomeWatch = form.watch('nome');
  const dataInicioWatch = form.watch('dataInicio');
  const dataTerminoWatch = form.watch('dataTermino');
  const eventosWatch = form.watch('eventos');
  const participantesWatch = form.watch('participantes');

  const { user, igrejaAtiva } = useAuth();
  const { validateNome, validateNomeDebounced, isCheckingName } =
    useEscalaNomeValidator(ministerioId);

  const handleNomeBlurValidation = useCallback(
    async (nome: string) => {
      const nomeNormalizado = nome?.trim() ?? '';

      if (!nomeNormalizado) {
        return;
      }

      try {
        const result = await validateNomeDebounced(nomeNormalizado);

        if (result.exists) {
          form.setError('nome', { message: DUPLICATE_NAME_MESSAGE });
          return;
        }

        if (form.formState.errors.nome?.message === DUPLICATE_NAME_MESSAGE) {
          form.clearErrors('nome');
        }
      } catch (error) {
        if (__DEV__) {
          console.log('[AssistenteEscala] erro ao validar nome no blur:', error);
        }
      }
    },
    [form, validateNomeDebounced],
  );

  const validateUniqueNameBeforeNext = useCallback(
    async (nome: string): Promise<boolean> => {
      const nomeNormalizado = nome?.trim() ?? '';

      if (!nomeNormalizado) {
        return true;
      }

      if (!ministerioId) {
        Toast.show({
          type: 'error',
          text1: 'Ministério não identificado',
          text2: 'Volte e entre novamente no assistente.',
        });
        return false;
      }

      if (!igrejaAtiva?.id) {
        Toast.show({
          type: 'error',
          text1: 'Igreja não selecionada',
          text2: 'Selecione uma igreja para continuar.',
        });
        return false;
      }

      try {
        const result = await validateNome(nomeNormalizado);
        if (result.exists) {
          form.setError('nome', { message: DUPLICATE_NAME_MESSAGE });
          return false;
        }
      } catch (error) {
        // Fallback para ambientes em que o endpoint validar-nome ainda não existe.
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
          throw error;
        }

        const duplicates = await EscalaRepository.search({
          where: {
            conjunction: Conjunction.AND,
            conditions: [
              {
                path: 'ministerio.id',
                operator: Operator.EQUALS,
                value: {
                  type: ValueType.LITERAL,
                  value: ministerioId,
                },
              },
              {
                path: 'nome',
                operator: Operator.ILIKE,
                value: {
                  type: ValueType.LITERAL,
                  value: nomeNormalizado,
                },
              },
            ],
          },
        });

        const normalizedTarget = normalizeEscalaName(nomeNormalizado);
        const exists = (duplicates ?? []).some(
          (escala) => normalizeEscalaName(escala.nome) === normalizedTarget,
        );

        if (exists) {
          form.setError('nome', { message: DUPLICATE_NAME_MESSAGE });
          return false;
        }
      }

      if (form.formState.errors.nome?.message === DUPLICATE_NAME_MESSAGE) {
        form.clearErrors('nome');
      }

      return true;
    },
    [form, igrejaAtiva?.id, ministerioId, validateNome],
  );

  const handleGenerate = useCallback(
    async (values: EscalaFormData) => {
      try {
        const eventosInvalidos = (values.eventos ?? [])
          .filter((e) => e.selected && e.template.templateBase)
          .filter((e) => {
            const id =
              'id' in (e.template.templateBase as object)
                ? (e.template.templateBase as { id?: string }).id
                : undefined;
            return !id || !UUID_REGEX.test(id);
          });

        if (eventosInvalidos.length > 0) {
          Toast.show({
            type: 'error',
            text1: 'Template inválido em evento(s)',
            text2: `Selecione novamente a equipe em: ${eventosInvalidos.map((e) => e.nome).join(', ')}`,
          });
          return;
        }

        showLoading('Iniciando geração...');
        const payload = mapEscalaFormToDto(ministerioId, user?.user?.id!, values);
        const resultado = await generateEscala(payload);
        posthog.capture(
          AnalyticsEvent.EscalaCriada,
          buildEscalaCriadaProps({
            escalaId: resultado.id,
            ministerioId,
            qtdItens: resultado.itens?.length ?? 0,
          }),
        );
        setResultado(resultado);
        nextStep();
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível gerar a escala.',
          text2: getApiErrorMessage(
            error,
            error instanceof Error
              ? error.message
              : 'Revise os eventos selecionados e tente novamente.',
          ),
        });
      } finally {
        hideLoading();
      }
    },
    [generateEscala],
  );

  const handleAbrirEscala = useCallback(() => {
    if (!resultado) return;

    router.push({
      pathname: '/ministerios/escalas/details',
      params: {
        ministerioId,
        escalaId: resultado.id,
        viewMode: 'edit',
      },
    });
  }, [resultado]);

  const stepsConfig: FancyStepsConfig = {
    steps: [
      {
        title: 'Dados',
        content: (
          <AssistenteParametrosStep
            isCheckingName={isCheckingName}
            onNomeBlur={handleNomeBlurValidation}
            ministerioId={ministerioId}
          />
        ),
        actions: [
          {
            label: 'Anterior',
            enabled: false,
            icon: {
              library: 'MaterialIcons',
              name: 'chevron-left',
              size: 20,
            },
          },
          {
            label: 'Próximo',
            enabled: !isCheckingName,
            icon: {
              library: 'MaterialIcons',
              name: 'chevron-right',
              size: 20,
            },
            iconPosition: 'right',
            onPress: async () => {
              showLoading();
              form.clearErrors();

              try {
                const values = {
                  nome: nomeWatch,
                  dataInicio: dataInicioWatch,
                  dataTermino: dataTerminoWatch,
                };

                const validation = EscalaSchema.safeParse(values);

                if (!validation.success) {
                  validation.error.issues.forEach((err) => {
                    form.setError(err.path[0] as keyof EscalaFormData, { message: err.message });
                  });
                  return;
                }

                const nomeDisponivel = await validateUniqueNameBeforeNext(values.nome);
                if (!nomeDisponivel) {
                  return;
                }

                const dataInicioApi = DateUtilsApi.dateOnlyToApi(values.dataInicio);
                const dataTerminoApi = DateUtilsApi.dateOnlyToApi(values.dataTermino);

                const escalasConflitantes = await EscalaRepository.search({
                  where: {
                    conditions: [
                      {
                        path: 'ministerio.id',
                        operator: Operator.EQUALS,
                        value: {
                          type: ValueType.LITERAL,
                          value: ministerioId,
                        },
                      },
                      {
                        conditions: [
                          {
                            path: 'dataInicio',
                            operator: Operator.LTE,
                            value: {
                              type: ValueType.LITERAL,
                              value: dataTerminoApi,
                            },
                          },
                          {
                            path: 'dataTermino',
                            operator: Operator.GTE,
                            value: {
                              type: ValueType.LITERAL,
                              value: dataInicioApi,
                            },
                          },
                        ],
                        conjunction: Conjunction.AND,
                      },
                    ],
                    conjunction: Conjunction.AND,
                  },
                });

                if (escalasConflitantes && escalasConflitantes.length > 0) {
                  Toast.show({
                    text1: 'Dados Inválidos',
                    text2: `Já existe(m) ${escalasConflitantes.length} escala(s) com datas que se sobrepõem ao período selecionado.`,
                    type: 'error',
                  });
                  return;
                }

                nextStep();
              } catch (error) {
                Toast.show({
                  type: 'error',
                  text1: 'Não foi possível validar os parâmetros.',
                  text2: getApiErrorMessage(error, 'Tente novamente em instantes.'),
                });
              } finally {
                hideLoading();
              }
            },
          },
        ],
      },
      {
        title: 'Eventos',
        content: (
          <TutorialTarget
            id='assistente-eventos-lista'
            registerTarget={tour.registerTarget}
            unregisterTarget={tour.unregisterTarget}
            style={{ flex: 1 }}
          >
            <AssistenteEventosStep />
          </TutorialTarget>
        ),
        actions: [
          {
            label: 'Anterior',
            icon: {
              library: 'MaterialIcons',
              name: 'chevron-left',
              size: 20,
            },
            onPress: () => previousStep(),
          },
          {
            label: 'Próximo',
            icon: {
              library: 'MaterialIcons',
              name: 'chevron-right',
              size: 20,
            },
            iconPosition: 'right',
            onPress: () => {
              showLoading();
              form.clearErrors();

              const values = eventosWatch;
              const validation = EscalaEventosArraySchema.safeParse(values);

              if (!validation.success) {
                validation.error.issues.forEach((err) => {
                  Toast.show({
                    text2: `${err.message}!` as string,
                    type: 'error',
                  });
                });
                hideLoading();
                return;
              }

              hideLoading();
              nextStep();
            },
          },
        ],
      },
      {
        title: 'Equipe',
        content: (
          <TutorialTarget
            id='assistente-participantes-lista'
            registerTarget={tour.registerTarget}
            unregisterTarget={tour.unregisterTarget}
            style={{ flex: 1 }}
          >
            <AssistenteParticipantesStep />
          </TutorialTarget>
        ),
        actions: [
          {
            label: 'Anterior',
            icon: {
              library: 'MaterialIcons',
              name: 'chevron-left',
              size: 20,
            },
            onPress: () => previousStep(),
          },
          {
            label: 'Próximo',
            icon: {
              library: 'MaterialIcons',
              name: 'chevron-right',
              size: 20,
            },
            iconPosition: 'right',
            onPress: () => {
              form.clearErrors();

              const values = participantesWatch;

              if (!values || values.length === 0) {
                Toast.show({
                  type: 'error',
                  text1: 'Sem participantes com função',
                  text2:
                    'Cadastre função em pelo menos um voluntário do ministério para continuar.',
                });
                return;
              }

              const validation = EscalaParticipantesArraySchema.safeParse(values);

              if (!validation.success) {
                validation.error.issues.forEach((err) => {
                  Toast.show({
                    text2: `${err.message}!` as string,
                    type: 'error',
                  });
                });
                return;
              }
              nextStep();
            },
          },
        ],
      },
      {
        title: 'Revisar',
        content: <AssistenteRevisaoStep />,
        actions: [
          {
            label: 'Anterior',
            icon: {
              library: 'MaterialIcons',
              name: 'chevron-left',
              size: 20,
            },
            onPress: () => previousStep(),
          },
          {
            label: 'Gerar',
            icon: {
              library: 'MaterialIcons',
              name: 'play-arrow',
              size: 16,
            },
            iconPosition: 'right',
            color: Pallete.secondary,
            onPress: () => {
              handleGenerate(form.getValues() as EscalaFormData);
            },
          },
        ],
      },
      {
        title: 'Pronto',
        content: <AssistenteResultadoStep />,
        actions: [
          {
            label: 'Ir ao início',
            type: 'outlined',
            icon: {
              library: 'MaterialCommunityIcons',
              name: 'home-outline',
              size: 16,
            },
            onPress: () => router.back(),
          },
          {
            label: 'Acompanhar',
            icon: {
              library: 'MaterialCommunityIcons',
              name: 'eye-outline',
              size: 16,
            },
            color: Pallete.secondary,
            onPress: handleAbrirEscala,
          },
        ],
      },
    ],
  };

  return (
    <FancyPageView
      style={[styles.container, { pointerEvents: isGeneratingEscala ? 'none' : 'auto' }]}
    >
      {index === 0 && tour.showBanner && (
        <View style={styles.bannerWrapper}>
          <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />
        </View>
      )}
      <FormProvider {...form}>
        <FancySteps
          config={stepsConfig}
          index={index}
          setIndex={setIndex}
          containerStyle={{ borderWidth: 0 }}
          headerContainerStyle={{ paddingHorizontal: 15 }}
          contentContainerStyle={{ paddingHorizontal: 15, flex: 1 }}
          navigationContainerStyle={{ paddingHorizontal: 15 }}
        />
      </FormProvider>

      <TutorialOverlay tour={tour} />
    </FancyPageView>
  );
}

export default function MinisterioEscalasAssistenteIndex() {
  const { ministerioId } = useLocalSearchParams<{ ministerioId: string }>();

  return (
    <AssistenteEscalaProvider ministerioId={ministerioId}>
      <AssistenteWrapper />
    </AssistenteEscalaProvider>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 10 },
  bannerWrapper: { paddingHorizontal: 15, marginBottom: 8 },
});
