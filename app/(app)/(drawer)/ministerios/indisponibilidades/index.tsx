import { useLocalSearchParams } from 'expo-router';
import LancamentoTimelineCard from '../../../../../components/pages/lancamentos-indisponibilidade/LancamentoTimelineCard';
import { VoluntarioHierarquiaEnum } from '../../../../../domain/enums/MinisterioVoluntario/hierarquia.enum';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import { InteractionManager, StyleSheet, View } from 'react-native';
import DefaultIcons from '../../../../../components/FancyIcons';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ControlledSearchSelect from '../../../../../components/forms/ControlledSearchSelect';
import { useVoluntariosDoMinisterioCrud } from '../../../../../hooks/useVoluntariosDoMinisterioCrud';
import { useRegrasIndisponibilidadeMinisterioCrud } from '../../../../../hooks/useRegrasIndisponibilidadeMinisterioCrud';
import { zodResolver } from '@hookform/resolvers/zod';
import FancyError from '../../../../../components/error/FancyError';
import FancyLoading from '../../../../../components/FancyLoading';
import { ThemePalette } from '../../../../../constants/colors';
import FancyCalendar from '../../../../../components/calendar/FancyCalendar';
import FancyButton from '../../../../../components/buttons/FancyButton';
import FancyVerticalSpacer from '../../../../../components/FancyVerticalSpacer';
import FancyListEmpty from '../../../../../components/list/FancyListEmpty';
import FancyScrollView from '../../../../../components/FancyScrollView';
import FancyText from '../../../../../components/FancyText';
import FancyListItemCard from '../../../../../components/cards/FancyListItemCard';
import Toast from 'react-native-toast-message';
import { normalizeAxiosError } from '../../../../../core/errors/normalizeAxiosError';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useAppTheme } from '../../../../../hooks/useAppTheme';
import { useThemedStyles } from '../../../../../hooks/useThemedStyles';
import { ColorUtils } from '../../../../../utils/color_utils';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import { TutorialTarget } from '../../../../../components/tutorial/TutorialTarget';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  INDISPONIBILIDADES_LIDER_TOUR_ID,
  INDISPONIBILIDADES_LIDER_TOUR_STEPS,
  INDISPONIBILIDADES_LIDER_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/indisponibilidadesLiderTour';
import AddRegraModal, {
  AddRegraModalResult,
} from '../../../../../components/pages/pessoal/indisponibilidade/AddRegraModal';
import BlockedDayDetailsModal from '../../../../../components/pages/pessoal/indisponibilidade/BlockedDayDetailsModal';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import { ResponseRegraIndisponibilidadeVoluntarioDto } from '../../../../../domain/dtos/RegraIndisponibilidadeVoluntario/regra-indisponibilidade-voluntario.response';
import {
  descreverRegra,
  descreverDetalheRegra,
  regraIcone,
  regraChipLabel,
  regraCor,
  expandirRegrasParaCalendario,
} from '../../../../../domain/utils/regra_indisponibilidade_utils';

const schema = z.object({
  voluntarioId: z.string('Campo obrigatório').min(1, 'Selecione um voluntário'),
});

export default function MinisterioIndisponibilidadesIndex() {
  const { palette, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const cardStyle = [
    styles.card,
    { backgroundColor: isDark ? palette.backgroundColor2 : palette.backgroundColor },
  ];
  const { ministerioId } = useLocalSearchParams<{ ministerioId?: string }>();
  const { igrejaAtiva } = useAuth();
  const igrejaId = igrejaAtiva?.id;
  const ehLider =
    igrejaAtiva?.ministerios?.find((m) => m.id === ministerioId)?.hierarquia?.toString() ===
    VoluntarioHierarquiaEnum.Lider;

  const [showRegraModal, setShowRegraModal] = useState(false);
  const [pendingAddRegra, setPendingAddRegra] = useState<AddRegraModalResult | null>(null);
  const [editingRegra, setEditingRegra] =
    useState<ResponseRegraIndisponibilidadeVoluntarioDto | null>(null);
  const [dayDetailsDate, setDayDetailsDate] = useState<Date | undefined>(undefined);

  const {
    voluntariosList,
    voluntariosDropDownList,
    isLoadingMinisterioVoluntarios: isLoadingVoluntarios,
  } = useVoluntariosDoMinisterioCrud(ministerioId);

  const { control, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      voluntarioId: voluntariosList[0]?.id,
    },
  });

  const voluntarioId = watch('voluntarioId');
  const voluntarioSelecionado = voluntariosList.find((v) => v.id === voluntarioId);

  const {
    pessoais,
    datasAvulsas,
    ministerio: regrasMinisterio,
    isLoading: isLoadingRegras,
    isRefetching: isRefetchingRegras,
    isError: isErrorRegras,
    refetch: refetchRegras,
    criarRegra,
    atualizarRegra,
    removerRegra,
    isLoadingMutation: isLoadingRegrasMutation,
  } = useRegrasIndisponibilidadeMinisterioCrud(ministerioId, voluntarioId);

  const [hasSettled, setHasSettled] = useState(true);
  useEffect(() => {
    if (isLoadingRegrasMutation) {
      setHasSettled(false);
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => setHasSettled(true));
    return () => task.cancel();
  }, [isLoadingRegrasMutation]);
  const isBusy = isLoadingRegrasMutation || !hasSettled;

  const [lazyToastOptions, setLazyToastOptions] = useState<{
    type: 'success' | 'error';
    text1: string;
    text2?: string;
  } | null>(null);
  useEffect(() => {
    if (!isBusy && lazyToastOptions) {
      Toast.show(lazyToastOptions);
      setLazyToastOptions(null);
    }
  }, [isBusy, lazyToastOptions]);

  const tour = useScreenTutorial(
    INDISPONIBILIDADES_LIDER_TOUR_ID,
    INDISPONIBILIDADES_LIDER_TOUR_TITLE,
    INDISPONIBILIDADES_LIDER_TOUR_STEPS,
  );

  const { startDate, endDate, hoje } = useMemo(() => {
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
      endDate: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()),
      hoje: now,
    };
  }, []);

  const markedDates = useMemo(() => {
    const ministerioKeys = expandirRegrasParaCalendario(
      regrasMinisterio.filter((r) => r.tipo !== 'LIMITE_MENSAL'),
      startDate,
      endDate,
    );
    const pessoalKeys = expandirRegrasParaCalendario(
      [...pessoais, ...datasAvulsas].filter((r) => r.tipo !== 'LIMITE_MENSAL'),
      startDate,
      endDate,
    );

    const ministerioMarcados = Array.from(ministerioKeys).map((k) => ({
      date: DateUtilsApi.dateOnlyFromApi(k),
      color: palette.secondary,
    }));
    const pessoalMarcados = Array.from(pessoalKeys)
      .filter((k) => !ministerioKeys.has(k))
      .map((k) => ({
        date: DateUtilsApi.dateOnlyFromApi(k),
        color: palette.fonts.inactive,
      }));

    return [...pessoalMarcados, ...ministerioMarcados];
  }, [
    pessoais,
    datasAvulsas,
    regrasMinisterio,
    startDate,
    endDate,
    palette.secondary,
    palette.fonts.inactive,
  ]);

  const regrasParaDetalhe = useMemo(
    () => [...pessoais, ...regrasMinisterio],
    [pessoais, regrasMinisterio],
  );

  const pontuaisParaDetalhe = useMemo(
    () => datasAvulsas.map((d) => ({ data: d.dataInicio!, motivo: d.motivo })),
    [datasAvulsas],
  );

  const handleSelectDate = useCallback(
    (date: Date) => {
      const key = DateUtilsApi.dateOnlyToApi(date);
      if (!markedDates.some((m) => DateUtilsApi.dateOnlyToApi(m.date) === key)) return;
      setDayDetailsDate(date);
    },
    [markedDates],
  );

  // Escopo sempre restrito a este ministério. Backend faz união de ministeriosInteiros + funcoes,
  // então mandar o ministério inteiro junto com funções anularia a escolha das funções.
  // Limite mensal não aceita funções (vale pelo ministério todo).
  const escopoDoMinisterio = useCallback(
    (result: AddRegraModalResult) => {
      const funcoesIds = result.tipo === 'LIMITE_MENSAL' ? [] : (result.funcoesIds ?? []);
      return funcoesIds.length
        ? { ministeriosInteirosIds: [], funcoesIds }
        : { ministeriosInteirosIds: ministerioId ? [ministerioId] : [], funcoesIds: [] };
    },
    [ministerioId],
  );

  const criar = useCallback(
    async (result: AddRegraModalResult) => {
      if (!voluntarioId || !igrejaId || !ministerioId) return;
      await criarRegra({
        ...result,
        ...escopoDoMinisterio(result),
        voluntarioId,
        igrejaId,
      });
      setShowRegraModal(false);
      setLazyToastOptions({ type: 'success', text1: 'Regra criada com sucesso!' });
    },
    [criarRegra, escopoDoMinisterio, voluntarioId, igrejaId, ministerioId],
  );

  const handleConfirmAddRegra = async (result: AddRegraModalResult) => {
    if (result.tipo === 'LIMITE_MENSAL' && result.dataInicio) {
      const regraAberta = regrasMinisterio.find((r) => r.tipo === 'LIMITE_MENSAL' && !r.dataFim);
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
          `Já existe uma regra de limite mensal em aberto para este ministério. Ao criar esta nova regra, a atual será encerrada em ${fechamentoFmt}.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setShowRegraModal(true) },
            {
              text: 'Confirmar',
              onPress: async () => {
                try {
                  await criar(result);
                } catch (error) {
                  setLazyToastOptions({
                    type: 'error',
                    text1: 'Erro ao criar regra',
                    text2: normalizeAxiosError(error).message,
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

    await criar(result);
  };

  const handleConfirmEditRegra = async (result: AddRegraModalResult) => {
    if (!editingRegra) return;
    const id = editingRegra.id;
    const { tipo, diasSemana, dataInicio, dataFim, recorrente, limiteMensal, motivo } = result;
    // erro exibido inline no próprio modal; modal fica aberto p/ o usuário corrigir
    await atualizarRegra({
      id,
      dto: {
        tipo,
        diasSemana,
        dataInicio,
        dataFim,
        recorrente,
        limiteMensal,
        motivo,
        ...escopoDoMinisterio(result),
      },
    });
    setEditingRegra(null);
    setLazyToastOptions({ type: 'success', text1: 'Regra atualizada com sucesso!' });
  };

  const handleRemoverRegra = useCallback(
    (regra: ResponseRegraIndisponibilidadeVoluntarioDto) => {
      FancyAlert.alert(`Remover regra`, `Deseja remover "${descreverRegra(regra)}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerRegra(regra.id);
            } catch {
              setLazyToastOptions({ type: 'error', text1: 'Erro ao remover a regra.' });
            }
          },
        },
      ]);
    },
    [removerRegra],
  );

  if (isLoadingVoluntarios) {
    return <FancyLoading />;
  }

  if (isErrorRegras) {
    return <FancyError.Default onUpdate={refetchRegras} />;
  }

  const isLoadingConteudo = isLoadingRegras || isRefetchingRegras || isLoadingRegrasMutation;

  return (
    <FancyPageView style={styles.container}>
      <View style={styles.headerContent}>
        {tour.showBanner && (
          <>
            <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />
            <FancyVerticalSpacer height={15} />
          </>
        )}

        {ministerioId && ehLider && (
          <>
            <LancamentoTimelineCard ministerioId={ministerioId} />
            <FancyVerticalSpacer height={15} />
          </>
        )}

        <ControlledSearchSelect
          control={control}
          name='voluntarioId'
          label='Voluntário'
          searchPlaceholder='Buscar voluntário...'
          listItems={voluntariosDropDownList}
        />
      </View>

      {!voluntarioId ? (
        <View style={[styles.emptyContainer, styles.headerContent]}>
          <FancyListEmpty
            label='Nenhum voluntário selecionado...'
            helperText='Selecione um voluntário no campo acima para ver e gerenciar as regras dele.'
            icon={{ library: 'MaterialCommunityIcons', name: 'calendar-remove-outline', size: 55 }}
          />
        </View>
      ) : isLoadingConteudo ? (
        <FancyLoading />
      ) : (
        <FancyScrollView contentContainerStyle={styles.scrollContent}>
          <FancyVerticalSpacer height={15} />
          <TutorialTarget
            id='indisponibilidade-calendario'
            registerTarget={tour.registerTarget}
            unregisterTarget={tour.unregisterTarget}
          >
            <View style={cardStyle}>
              <FancyCalendar
                selectDateOnPress={false}
                onChangeSelectedDate={handleSelectDate}
                containerStyle={styles.calendarContainer}
                minimumDate={startDate}
                maximumDate={endDate}
                initialDate={hoje}
                markedDates={markedDates}
                markedDatesType='SurroundCircle'
              />
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendCircle, { backgroundColor: palette.fonts.inactive }]}
                  />
                  <FancyText type='medium' size='extraSmall' color={palette.fonts.dark}>
                    Pessoal
                  </FancyText>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendCircle, { backgroundColor: palette.secondary }]} />
                  <FancyText type='medium' size='extraSmall' color={palette.fonts.dark}>
                    Deste ministério
                  </FancyText>
                </View>
              </View>
            </View>
          </TutorialTarget>

          <FancyVerticalSpacer height={20} />

          <View style={cardStyle}>
            <View style={styles.secaoHeader}>
              {DefaultIcons.Custom({
                library: 'MaterialCommunityIcons',
                name: 'lock-outline',
                size: 16,
                color: palette.fonts.inactive,
              })}
              <FancyText type='bold' size='small' color={palette.fonts.dark}>
                Bloqueios pessoais
              </FancyText>
            </View>
            <FancyVerticalSpacer height={14} />
            {pessoais.length ? (
              <View style={{ gap: 8 }}>
                {pessoais.map((regra) => {
                  const corRegra = regraCor(regra, palette);
                  const detalhe = descreverDetalheRegra(regra);
                  return (
                    <View key={regra.id} style={styles.pessoalItemRow}>
                      <View
                        style={[
                          styles.pessoalItemIcon,
                          { backgroundColor: ColorUtils.withAlpha(corRegra, 0.1) },
                        ]}
                      >
                        {DefaultIcons.Custom({
                          library: 'MaterialCommunityIcons',
                          name: regraIcone(regra) as any,
                          size: 20,
                          color: corRegra,
                        })}
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <FancyText type='semiBold' size='small' color={palette.fonts.dark}>
                          {descreverRegra(regra)}
                        </FancyText>
                        {detalhe ? (
                          <FancyText type='medium' size='extraSmall' color={palette.fonts.inactive}>
                            {detalhe}
                          </FancyText>
                        ) : null}
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
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <FancyListEmpty
                variant='compact'
                label='Nenhum bloqueio pessoal cadastrado'
                labelColor={palette.fonts.inactive}
                hideIcon
                containerStyle={styles.emptyCentered}
              />
            )}
          </View>

          <FancyVerticalSpacer height={20} />

          <TutorialTarget
            id='indisponibilidade-regras-ministerio'
            registerTarget={tour.registerTarget}
            unregisterTarget={tour.unregisterTarget}
          >
            <View style={cardStyle}>
              <View style={styles.secaoHeaderComAcao}>
                <View style={[styles.secaoHeader, { flexShrink: 1 }]}>
                  {DefaultIcons.Custom({
                    library: 'MaterialCommunityIcons',
                    name: 'format-list-checks',
                    size: 16,
                    color: palette.fonts.inactive,
                  })}
                  <FancyText
                    type='bold'
                    size='small'
                    color={palette.fonts.dark}
                    style={{ flexShrink: 1 }}
                  >
                    Regras deste ministério
                  </FancyText>
                </View>
                <TutorialTarget
                  id='indisponibilidade-regras-fab'
                  registerTarget={tour.registerTarget}
                  unregisterTarget={tour.unregisterTarget}
                  style={{ flexShrink: 0 }}
                >
                  <FancyButton
                    accessibilityLabel='Nova regra'
                    type='contained'
                    mode='icon'
                    size={32}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    icon={{ library: 'MaterialCommunityIcons', name: 'plus', size: 24 }}
                    onPress={() => setShowRegraModal(true)}
                  />
                </TutorialTarget>
              </View>
              <FancyVerticalSpacer height={10} />
              {regrasMinisterio.length ? (
                <View style={{ gap: 8 }}>
                  {regrasMinisterio.map((regra) => (
                    <FancyListItemCard
                      key={regra.id}
                      containerStyle={styles.regraCardFlat}
                      onPress={() => setEditingRegra(regra)}
                      title={descreverRegra(regra)}
                      subtitle={
                        <View style={{ gap: 4 }}>
                          {descreverDetalheRegra(regra) ? (
                            <FancyText
                              size='extraSmall'
                              type='medium'
                              color={palette.fonts.inactive}
                            >
                              {descreverDetalheRegra(regra)}
                            </FancyText>
                          ) : null}
                          <View
                            style={[
                              styles.regraChip,
                              {
                                backgroundColor: ColorUtils.withAlpha(
                                  regraCor(regra, palette),
                                  0.1,
                                ),
                                alignSelf: 'flex-start',
                              },
                            ]}
                          >
                            <FancyText
                              size='extraSmall'
                              type='semiBold'
                              color={regraCor(regra, palette)}
                            >
                              {regraChipLabel(regra)}
                            </FancyText>
                          </View>
                        </View>
                      }
                      leading={{
                        type: 'icon',
                        icon: {
                          library: 'MaterialCommunityIcons',
                          name: regraIcone(regra) as any,
                          size: 20,
                        },
                        color: regraCor(regra, palette),
                        backgroundColor: ColorUtils.withAlpha(regraCor(regra, palette), 0.1),
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
                  ))}
                </View>
              ) : (
                <FancyListEmpty
                  variant='compact'
                  label='Nenhuma regra cadastrada neste ministério'
                  labelColor={palette.fonts.inactive}
                  hideIcon
                  containerStyle={styles.emptyCentered}
                />
              )}
            </View>
          </TutorialTarget>
        </FancyScrollView>
      )}

      {showRegraModal && (
        <AddRegraModal
          visible={showRegraModal}
          onClose={() => {
            setShowRegraModal(false);
            setPendingAddRegra(null);
          }}
          onConfirm={handleConfirmAddRegra}
          voluntarioNome={voluntarioSelecionado?.nome}
          voluntarioId={voluntarioId}
          initialValues={pendingAddRegra ?? undefined}
          simplifiedMode={true}
          ministerioIdFixo={ministerioId}
        />
      )}

      {editingRegra && (
        <AddRegraModal
          visible={!!editingRegra}
          isEditing
          voluntarioNome={voluntarioSelecionado?.nome}
          voluntarioId={voluntarioId}
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
          simplifiedMode={true}
          ministerioIdFixo={ministerioId}
        />
      )}

      <BlockedDayDetailsModal
        visible={!!dayDetailsDate}
        onClose={() => setDayDetailsDate(undefined)}
        selectedDate={dayDetailsDate}
        regras={regrasParaDetalhe}
        indisponibilidadesPontuais={pontuaisParaDetalhe}
        voluntarioNome={voluntarioSelecionado?.nome}
      />

      <TutorialOverlay tour={tour} />
    </FancyPageView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { paddingBottom: 10, flex: 1 },
    headerContent: { paddingHorizontal: 15 },
    scrollContent: { paddingBottom: 100, paddingHorizontal: 15 },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      borderWidth: 0.5,
      borderColor: ColorUtils.withAlpha(palette.borderCard, 0.45),
      borderRadius: 16,
      padding: 15,
      ...palette.shadows[200],
    },
    calendarContainer: {
      paddingHorizontal: 5,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    legend: {
      flexDirection: 'row',
      paddingLeft: 5,
      paddingTop: 8,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendCircle: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    secaoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    secaoHeaderComAcao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    emptyCentered: {
      justifyContent: 'center',
      width: '100%',
    },
    pessoalItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    pessoalItemIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    regraChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    regraCardFlat: {
      borderWidth: 0,
      borderColor: 'transparent',
      shadowOpacity: 0,
      shadowColor: 'transparent',
      paddingHorizontal: 0,
      paddingVertical: 8,
      minHeight: 64,
    },
  });
}
