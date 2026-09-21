import { StyleSheet, View } from 'react-native';
import { useFormContext, useFieldArray } from 'react-hook-form';
import {
  EscalaEventoFormData,
  EscalaEventoTemplateFixoFormData,
  EscalaEventoTemplateFormData,
  EscalaEventoTemplateFuncaoFormData,
  EscalaFormData,
} from '../../../../../domain/schemas/escalaSchema';
import FancyList from '../../../../list/FancyList';
import { FancyCard } from '../../../../cards/Horizontal/FancyCard';
import { useEventosCrud } from '../../../../../hooks/useEventosCrud';
import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventoFormModal from './EventoFormModal';
import { DefaultIconsNames } from '../../../../../constants/icons';
import FancyText from '../../../../FancyText';
import FancyChips from '../../../../FancyChips';
import FancyButton from '../../../../buttons/FancyButton';
import FancyLoading from '../../../../FancyLoading';
import Toast from 'react-native-toast-message';
import * as Sentry from '@sentry/react-native';
import { useAssistenteEscala } from '../../../../../contexts/pages/escalas/AssistantContext';
import DefaultIcons from '../../../../FancyIcons';
import { EscalaTemplateTipoEnum } from '../../../../../domain/enums/EscalaTemplate/escala-template-tipo.enum';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import { usePallete } from '../../../../../hooks/usePallete';

export default function AssistenteEventosStep() {
  const palette = usePallete();
  const { ministerioId, isShouldLoadEvents, setShouldLoadEvents } = useAssistenteEscala();
  const form = useFormContext<EscalaFormData>();

  const dataInicio = form.watch('dataInicio');
  const dataTermino = form.watch('dataTermino');

  const eventosArray = useFieldArray({
    control: form.control,
    name: 'eventos',
    keyName: 'rhfKey',
  });

  const { buscarPorIntervalo } = useEventosCrud({ autoFetch: false });

  const [isLoadingEventos, setIsLoadingEventos] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const carregarEventos = async () => {
      if (!dataInicio || !dataTermino) {
        if (isMounted) eventosArray.replace([]);
        if (isMounted) setIsLoadingEventos(false);
        return;
      }

      try {
        if (isMounted) setIsLoadingEventos(true);
        const resultado = await buscarPorIntervalo({ dataInicio, dataTermino, ministerioId });

        if (!isMounted) return;

        const mapeados = (resultado ?? [])
          .filter((ocorrencia) => !ocorrencia?.cancelada)
          .map((ocorrencia) => {
            if (!ocorrencia) return null;

            const horario = ocorrencia.evento
              ? `${format(DateUtilsApi.dateTimeFromApi(ocorrencia.evento?.dataInicio), 'HH:mm')} - ${
                  ocorrencia.evento?.dataTermino
                    ? format(DateUtilsApi.dateTimeFromApi(ocorrencia.evento.dataTermino), 'HH:mm')
                    : 'Indefinido'
                }`
              : '';

            return {
              eventoId: ocorrencia.id,
              nome: ocorrencia.nome ?? 'Evento sem nome',
              local: ocorrencia.local ?? '',
              cor: ocorrencia.cor,
              dataOcorrencia: DateUtilsApi.dateTimeFromApi(ocorrencia.dataOcorrencia),
              horario: horario,
              selected: true,
              template: {
                tipo: ocorrencia.templatePadrao?.tipo
                  ? ocorrencia.templatePadrao?.tipo!
                  : EscalaTemplateTipoEnum.Funcoes,
                templateBase: {
                  id: ocorrencia.templatePadrao?.id,
                  nome: ocorrencia.templatePadrao?.nome,
                },
                fixos: ocorrencia.templatePadrao?.voluntarios?.map(
                  (v) =>
                    ({
                      funcaoId: v.funcao?.id,
                      minVolId: v.voluntario?.id || v.voluntarioId,
                    }) as EscalaEventoTemplateFixoFormData,
                ),
                funcoes: ocorrencia.templatePadrao?.funcoes?.map(
                  (f) =>
                    ({
                      funcaoIds: f.opcoes?.map((o) => o.funcaoId) ?? [],
                      experiencia: f.experiencia,
                      comparacaoExperiencia: f.comparacaoExperiencia,
                      quantidade: f.quantidade,
                    }) as EscalaEventoTemplateFuncaoFormData,
                ),
              },
            } as EscalaEventoFormData;
          })
          .filter((item): item is EscalaEventoFormData => Boolean(item));

        eventosArray.replace(mapeados);

        setShouldLoadEvents(false);
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
        Sentry.captureException(error);
        if (isMounted) {
          eventosArray.replace([]);
          Toast.show({
            type: 'error',
            text1: 'Erro ao buscar eventos',
            text2: 'Verifique sua conexão e tente novamente.',
          });
        }
      } finally {
        if (isMounted) setIsLoadingEventos(false);
      }
    };

    if (isShouldLoadEvents) carregarEventos();

    return () => {
      isMounted = false;
    };
  }, [isShouldLoadEvents]);

  const [eventoFormProps, setEventoFormProps] = useState<{
    visible: boolean;
    data?: EscalaEventoFormData;
    index?: number;
  }>({ visible: false });
  const hasOpenedEventoForm = useRef(false);
  if (eventoFormProps.visible) hasOpenedEventoForm.current = true;

  const handleSaveTemplate = useCallback(
    (data: EscalaEventoTemplateFormData) => {
      if (eventoFormProps.index === undefined) {
        return;
      }

      const eventos = form.getValues('eventos') ?? [];
      const eventoAtual = eventos[eventoFormProps.index];

      if (!eventoAtual) {
        setEventoFormProps({ visible: false, data: undefined, index: undefined });
        return;
      }

      eventosArray.update(eventoFormProps.index, {
        ...eventoAtual,
        template: data,
      });
      setEventoFormProps({ visible: false, data: undefined, index: undefined });
    },
    [eventosArray, eventoFormProps.index, form],
  );

  const markAll = form.watch('markEventsAll');

  const executeMarkAll = useCallback(
    (mark: boolean) => {
      eventosArray.replace(
        eventosArray.fields.map((evento) => ({
          ...evento,
          selected: mark,
        })),
      );
    },
    [markAll, eventosArray.fields],
  );

  const semTemplateCount = eventosArray.fields.filter((item) => {
    const hasTemplateBase = Boolean(
      item.template?.templateBase &&
      'id' in item.template.templateBase &&
      item.template.templateBase.id,
    );
    const hasEquipePersonalizada =
      (item.template?.fixos?.length ?? 0) > 0 || (item.template?.funcoes?.length ?? 0) > 0;
    return item.selected && !hasTemplateBase && !hasEquipePersonalizada;
  }).length;

  return (
    <View style={styles.container}>
      <View style={{ gap: 8 }}>
        <View style={styles.headerRow}>
          <FancyText size={'extraSmall'} type='semiBold' style={{ flex: 1 }}>
            Selecione os eventos da escala:
          </FancyText>
          <FancyButton
            type='text'
            label={!markAll ? 'Marcar todos' : 'Desmarcar todos'}
            labelProps={{ size: 'extraSmall', type: 'semiBold' }}
            icon={{ library: 'Octicons', name: markAll ? 'circle' : 'check-circle', size: 14 }}
            onPress={() => {
              form.setValue('markEventsAll', !markAll);
              executeMarkAll(!markAll);
            }}
          />
        </View>

        {semTemplateCount > 0 && (
          <View
            style={[
              styles.attentionBanner,
              { backgroundColor: palette.warning + '18', borderColor: palette.warning + '55' },
            ]}
          >
            <DefaultIcons.Custom
              library='MaterialCommunityIcons'
              name='alert-circle-outline'
              size={16}
              color={palette.warning}
            />
            <FancyText
              size='extraSmall'
              type='semiBold'
              style={{ color: palette.warning, flex: 1 }}
            >
              {semTemplateCount === 1
                ? '1 evento selecionado sem template definido'
                : `${semTemplateCount} eventos selecionados sem template definido`}
            </FancyText>
          </View>
        )}
      </View>

      {isLoadingEventos ? (
        <View style={styles.loadingContainer}>
          <FancyLoading />
        </View>
      ) : (
        <FancyList
          keyExtractor={({ eventoId, dataOcorrencia: data }) => eventoId + data}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 0 }}
          listEmptyProps={{
            label: 'Nenhum evento encontrado no período',
            icon: { library: 'MaterialCommunityIcons', name: 'calendar-search-outline', size: 68 },
          }}
          data={eventosArray.fields}
          extraData={eventosArray.fields}
          renderItem={({ item, index }) => {
            const accentColor = item.cor ?? palette.primary;
            const dataFormatada = format(item.dataOcorrencia, 'EEE dd/MM', { locale: ptBR });
            const horarioFormatado = item.horario || '--:--';
            const hasTemplateBase = Boolean(
              item.template?.templateBase &&
              'id' in item.template.templateBase &&
              item.template.templateBase.id,
            );
            const hasEquipePersonalizada =
              (item.template?.fixos?.length ?? 0) > 0 || (item.template?.funcoes?.length ?? 0) > 0;
            const eventoSemTemplate = !hasTemplateBase && !hasEquipePersonalizada;

            const estruturaEquipe = hasTemplateBase
              ? `${'nome' in item.template.templateBase ? item.template.templateBase.nome : ''}`
              : hasEquipePersonalizada
                ? 'Personalizada'
                : 'Nenhuma';
            return (
              <FancyCard.CheckBox
                key={item.eventoId}
                title={item.nome}
                subtitle={
                  <View style={styles.eventInfoContainer}>
                    <View style={styles.eventInfoRow}>
                      <DefaultIcons.Custom
                        library='MaterialIcons'
                        name='event'
                        size={13}
                        color={palette.primary}
                      />
                      <FancyText
                        size='extraSmall'
                        type='medium'
                        color={palette.fonts.dark}
                        numberOfLines={1}
                        style={{ flexShrink: 0 }}
                      >
                        {dataFormatada}
                      </FancyText>
                      <FancyText size='extraSmall' color={palette.fonts.light}>
                        ·
                      </FancyText>
                      <DefaultIcons.Custom
                        library='MaterialIcons'
                        name='access-time'
                        size={13}
                        color={palette.primary}
                      />
                      <FancyText
                        size='extraSmall'
                        type='medium'
                        color={palette.fonts.dark}
                        numberOfLines={1}
                        style={{ flex: 1 }}
                      >
                        {horarioFormatado}
                      </FancyText>
                    </View>
                    <View style={styles.eventInfoRow}>
                      <DefaultIcons.Custom
                        library='MaterialIcons'
                        name='group'
                        size={13}
                        color={palette.primary}
                      />
                      <FancyText
                        size='extraSmall'
                        type='medium'
                        color={palette.fonts.dark}
                        numberOfLines={1}
                        style={{ flexShrink: 1 }}
                      >
                        {estruturaEquipe}
                      </FancyText>
                      {eventoSemTemplate && (
                        <FancyChips
                          size='small'
                          label='Sem template'
                          color={palette.warning}
                          icon={{ library: 'MaterialCommunityIcons', name: 'alert-circle-outline' }}
                        />
                      )}
                    </View>
                  </View>
                }
                value={!!item.selected}
                checkboxColor={accentColor}
                onChangeValue={() => {
                  const nextSelected = !eventosArray.fields[index].selected;
                  eventosArray.update(index, {
                    ...eventosArray.fields[index],
                    selected: nextSelected,
                  });
                  form.trigger('eventos').catch(() => {});
                }}
                actionButtons={[
                  {
                    icon: { ...DefaultIconsNames.edit, size: 16 },
                    onPress: () => {
                      setEventoFormProps({ visible: true, data: item, index });
                    },
                  },
                ]}
              />
            );
          }}
        />
      )}
      {(eventoFormProps.visible || hasOpenedEventoForm.current) && (
        <EventoFormModal
          visible={eventoFormProps.visible}
          data={eventoFormProps.data}
          modalProps={{
            onButton1Press: () =>
              setEventoFormProps({ visible: false, data: undefined, index: undefined }),
            onButton2Press: (data) => {
              if (!data) return;
              handleSaveTemplate(data);
            },
          }}
          ministerioId={ministerioId}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attentionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  eventInfoContainer: {
    gap: 2,
    marginTop: 1,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
