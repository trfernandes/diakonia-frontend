import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFormContext } from 'react-hook-form';

import FancyText from '../../../../FancyText';
import FancyImage from '../../../../images/FancyImage';
import FancySeparator from '../../../../FancySeparator';
import FancyListItemCard from '../../../../cards/FancyListItemCard';
import DefaultIcons from '../../../../FancyIcons';
import { AppImages } from '../../../../../assets/app_images';
import { ThemePalette } from '../../../../../constants/colors';
import { useAssistenteEscala } from '../../../../../contexts/pages/escalas/AssistantContext';
import { EscalaTemplateTipoEnum } from '../../../../../domain/enums/EscalaTemplate/escala-template-tipo.enum';
import { EscalaTemplateExperienciaLabel } from '../../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import {
  EscalaTemplateComparacaoExperienciaEnum,
  EscalaTemplateComparacaoExperienciaLabel,
} from '../../../../../domain/enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';
import { EscalaFormData } from '../../../../../domain/schemas/escalaSchema';
import { useFuncoesDoMinisterio } from '../../../../../hooks/useFuncoesDoMinisterio';
import { usePallete } from '../../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../../hooks/useThemedStyles';
import { useVoluntariosDoMinisterioCrud } from '../../../../../hooks/useVoluntariosDoMinisterioCrud';
import { ColorUtils } from '../../../../../utils/color_utils';
import { getFirstAndLastName } from '../../../../../utils/text_utils';

function SummaryMetric({
  icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: string;
  label: string;
  value: string;
  tone?: 'primary' | 'confirm';
}) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const toneColor = tone === 'confirm' ? palette.confirm : palette.primary;
  const valueColor = tone === 'confirm' ? palette.confirm : palette.fonts.dark;
  const valueSize = tone === 'confirm' ? 'small' : 'medium';

  return (
    <View style={styles.summaryMetric}>
      <View
        style={[
          styles.summaryMetricBadge,
          { backgroundColor: ColorUtils.withAlpha(toneColor, 0.12) },
        ]}
      >
        <DefaultIcons.Custom
          library='MaterialCommunityIcons'
          name={icon as any}
          size={11}
          color={toneColor}
        />
      </View>
      <View style={styles.summaryMetricText}>
        <FancyText size={valueSize} type='bold' color={valueColor} numberOfLines={1}>
          {value}
        </FancyText>
        <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive} numberOfLines={1}>
          {label}
        </FancyText>
      </View>
    </View>
  );
}

function ReviewSection({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = true,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.86}
        onPress={() => setExpanded((prev) => !prev)}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconBadge}>
            <DefaultIcons.Custom
              library='MaterialCommunityIcons'
              name={icon as any}
              size={14}
              color={palette.primary}
            />
          </View>
          <View style={styles.sectionTitleWrap}>
            <FancyText size='small' type='bold' color={palette.fonts.dark}>
              {title}
            </FancyText>
            {subtitle ? (
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                {subtitle}
              </FancyText>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionChevronBadge}>
          <DefaultIcons.Custom
            library='Feather'
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={17}
            color={palette.primary}
          />
        </View>
      </TouchableOpacity>

      {expanded ? (
        <>
          <FancySeparator />
          <View style={styles.sectionContent}>{children}</View>
        </>
      ) : null}
    </View>
  );
}

function EventItem({
  evento,
  isLast,
  funcoesList,
  ministerioVoluntariosList,
}: {
  evento: any;
  isLast: boolean;
  funcoesList: any[];
  ministerioVoluntariosList: any[];
}) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);

  const tipoTemplate = useMemo(() => {
    return evento.template.tipo === EscalaTemplateTipoEnum.Fixo
      ? `Modelo fixo • ${evento.template.fixos?.length || 0} voluntários`
      : evento.template.tipo === EscalaTemplateTipoEnum.Funcoes
        ? `Por funções • ${evento.template.funcoes?.length || 0} funções`
        : 'Modelo manual';
  }, [evento]);

  return (
    <View style={!isLast ? styles.eventCardWrap : undefined}>
      <FancyListItemCard
        title={evento.nome}
        subtitle={`${format(evento.dataOcorrencia, 'dd/MM • HH:mm')} • ${tipoTemplate}`}
        leading={{
          type: 'icon',
          icon: {
            library: 'MaterialCommunityIcons',
            name: 'calendar-blank-outline',
            size: 18,
            color: evento.cor || palette.primary,
          },
          color: evento.cor || palette.primary,
          backgroundColor: ColorUtils.withAlpha(evento.cor || palette.primary, 0.14),
        }}
        trailing={{
          type: 'chevron',
          onPress: () => setExpanded((prev) => !prev),
        }}
        onPress={() => setExpanded((prev) => !prev)}
        meta={
          evento.template.templateBase?.nome ? (
            <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
              Template: {evento.template.templateBase.nome}
            </FancyText>
          ) : undefined
        }
        containerStyle={[
          styles.listCard,
          { backgroundColor: ColorUtils.withAlpha(evento.cor || palette.primary, 0.04) },
        ]}
      />

      {expanded ? (
        <View style={styles.expandedContent}>
          {evento.template.tipo === EscalaTemplateTipoEnum.Funcoes &&
          evento.template.funcoes?.length > 0 ? (
            <View style={styles.detailGroup}>
              <FancyText size='extraSmall' type='bold' color={palette.fonts.inactive}>
                Funções requeridas
              </FancyText>
              {evento.template.funcoes.map((f: any, idx: number) => {
                const funcaoNome =
                  ((f.funcaoIds as string[]) || [])
                    .map((id) => funcoesList.find((fl) => String(fl.id) === String(id))?.nome)
                    .filter(Boolean)
                    .join(' ou ') || 'Função desconhecida';
                const expLabel =
                  EscalaTemplateExperienciaLabel[
                    f.experiencia as keyof typeof EscalaTemplateExperienciaLabel
                  ];
                const comparacaoLabel =
                  f.comparacaoExperiencia === EscalaTemplateComparacaoExperienciaEnum.Igual
                    ? `${EscalaTemplateComparacaoExperienciaLabel[
                        f.comparacaoExperiencia as keyof typeof EscalaTemplateComparacaoExperienciaLabel
                      ].toLowerCase()} a `
                    : '';

                return (
                  <View key={idx} style={styles.detailRow}>
                    <View style={styles.detailBullet} />
                    <FancyText
                      size='extraSmall'
                      color={palette.fonts.dark}
                      style={styles.detailText}
                    >
                      {funcaoNome}
                      <FancyText size='extraSmall' color={palette.fonts.inactive}>
                        {' '}
                        • {f.quantidade}x {comparacaoLabel}
                        {expLabel}
                      </FancyText>
                    </FancyText>
                  </View>
                );
              })}
            </View>
          ) : null}

          {evento.template.tipo === EscalaTemplateTipoEnum.Fixo &&
          evento.template.fixos?.length > 0 ? (
            <View style={styles.detailGroup}>
              <FancyText size='extraSmall' type='bold' color={palette.fonts.inactive}>
                Voluntários fixos
              </FancyText>
              {evento.template.fixos.map((f: any, idx: number) => {
                const vol = ministerioVoluntariosList.find(
                  (v) => String(v.id) === String(f.minVolId),
                );
                const volNome = vol?.voluntario?.nome || 'Voluntário desconhecido';
                const funcaoNome =
                  funcoesList.find((fl) => String(fl.id) === String(f.funcaoId))?.nome ||
                  'Sem função';

                return (
                  <View key={idx} style={styles.detailRow}>
                    <FancyImage
                      source={
                        vol?.voluntario?.fotoThumbUrl
                          ? { uri: vol.voluntario.fotoThumbUrl }
                          : AppImages.emptyProfile
                      }
                      size={20}
                      style={styles.fixedVolunteerAvatar}
                    />
                    <FancyText
                      size='extraSmall'
                      color={palette.fonts.dark}
                      style={styles.detailText}
                    >
                      {getFirstAndLastName(volNome)}
                      <FancyText size='extraSmall' color={palette.fonts.inactive}>
                        {' '}
                        • {funcaoNome}
                      </FancyText>
                    </FancyText>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function AssistenteRevisaoStep() {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const { ministerioId } = useAssistenteEscala();
  const form = useFormContext<EscalaFormData>();

  const { funcoesList } = useFuncoesDoMinisterio(ministerioId);
  const { ministerioVoluntariosList = [] } = useVoluntariosDoMinisterioCrud(ministerioId);

  const eventosSelecionados = useMemo(() => {
    return (form.watch('eventos') || []).filter((e) => e.selected);
  }, [form.watch('eventos')]);

  const participantesSelecionados = useMemo(() => {
    const parts = form.watch('participantes') || [];
    return parts
      .filter((p) => p.selected)
      .map((p) => {
        const minVol = ministerioVoluntariosList.find((v) => v.id === p.minVolId);
        return {
          id: p.minVolId,
          nome: minVol?.voluntario?.nome || 'Desconhecido',
          fotoUrl: minVol?.voluntario?.fotoThumbUrl || minVol?.voluntario?.fotoUrl,
          funcoes:
            minVol?.funcoes
              ?.map((f) => {
                if (f.funcao?.nome) return f.funcao.nome;
                const fId = (f as any).funcaoId || (f.funcao as any)?.id || (f as any).id;
                return funcoesList.find((fl) => String(fl.id) === String(fId))?.nome;
              })
              .filter((n): n is string => !!n) || [],
        };
      });
  }, [form.watch('participantes'), ministerioVoluntariosList, funcoesList]);

  const resumoFuncoes = useMemo(() => {
    const counts: Record<string, number> = {};
    participantesSelecionados.forEach((p) => {
      if (p.funcoes.length === 0) {
        counts['Sem função'] = (counts['Sem função'] || 0) + 1;
      } else {
        p.funcoes.forEach((f) => {
          counts[f] = (counts[f] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [participantesSelecionados]);

  const dataInicio = form.watch('dataInicio');
  const dataTermino = form.watch('dataTermino');
  const nomeEscala = form.watch('nome');

  const periodoResumo = useMemo(() => {
    if (!dataInicio || !dataTermino) return '--';
    return `${format(dataInicio, 'dd MMM', { locale: ptBR })} - ${format(dataTermino, 'dd MMM yyyy', { locale: ptBR })}`;
  }, [dataInicio, dataTermino]);
  const dataInicioResumo = dataInicio ? format(dataInicio, 'dd MMM', { locale: ptBR }) : '--';
  const dataTerminoResumo = dataTermino
    ? format(dataTermino, 'dd MMM yyyy', { locale: ptBR })
    : '--';

  const totalFuncoesResumo = resumoFuncoes.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroBadge}>
            <DefaultIcons.Custom
              library='MaterialCommunityIcons'
              name='clipboard-text-outline'
              size={14}
              color={palette.primary}
            />
          </View>
          <View style={styles.heroTextWrap}>
            <FancyText size='small' type='bold' color={palette.fonts.dark}>
              Revise antes de gerar
            </FancyText>
            <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
              Confira o período, os eventos e a equipe selecionada.
            </FancyText>
          </View>
        </View>

        <View style={styles.heroPeriod}>
          <View style={styles.periodTitleRow}>
            <View style={styles.periodIconBadge}>
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='calendar-range'
                size={16}
                color={palette.primary}
              />
            </View>
            <View style={styles.periodTitleText}>
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                Período da escala
              </FancyText>
              <FancyText size='small' type='bold' color={palette.fonts.dark} numberOfLines={1}>
                {nomeEscala || 'Sem nome definido'}
              </FancyText>
            </View>
          </View>

          <View style={styles.periodRangeRow}>
            <View style={styles.periodDateBlock}>
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                Início
              </FancyText>
              <FancyText size='small' type='bold' color={palette.fonts.dark} numberOfLines={1}>
                {dataInicioResumo}
              </FancyText>
            </View>

            <View style={styles.periodRangeConnector}>
              <View style={styles.periodConnectorLine} />
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='arrow-right'
                size={14}
                color={palette.primary}
              />
              <View style={styles.periodConnectorLine} />
            </View>

            <View style={styles.periodDateBlock}>
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                Término
              </FancyText>
              <FancyText size='small' type='bold' color={palette.fonts.dark} numberOfLines={1}>
                {dataTerminoResumo}
              </FancyText>
            </View>
          </View>
        </View>

        <View style={styles.summaryMetricsRow}>
          <SummaryMetric
            icon='calendar-month-outline'
            label='Eventos'
            value={String(eventosSelecionados.length)}
          />
          <SummaryMetric
            icon='account-group-outline'
            label='Equipe'
            value={String(participantesSelecionados.length)}
          />
          <SummaryMetric icon='check-decagram-outline' label='Pronto' value='OK' tone='confirm' />
        </View>
      </View>

      <ReviewSection
        title={`Eventos (${eventosSelecionados.length})`}
        subtitle='Data, hora e modelo de equipe'
        icon='calendar-month-outline'
      >
        {eventosSelecionados.length === 0 ? (
          <View style={styles.emptyState}>
            <DefaultIcons.Custom
              library='MaterialCommunityIcons'
              name='calendar-remove-outline'
              size={28}
              color={palette.fonts.inactive}
            />
            <FancyText size='small' color={palette.fonts.inactive}>
              Nenhum evento selecionado.
            </FancyText>
          </View>
        ) : (
          <View>
            {eventosSelecionados.map((evento, index) => (
              <EventItem
                key={evento.eventoId + index}
                evento={evento}
                isLast={index === eventosSelecionados.length - 1}
                funcoesList={funcoesList}
                ministerioVoluntariosList={ministerioVoluntariosList}
              />
            ))}
          </View>
        )}
      </ReviewSection>

      <ReviewSection
        title={`Equipe (${participantesSelecionados.length})`}
        subtitle='Voluntários selecionados'
        icon='account-group-outline'
      >
        {participantesSelecionados.length > 0 ? (
          <View style={styles.teamSummaryStrip}>
            <DefaultIcons.Custom
              library='MaterialCommunityIcons'
              name='briefcase-check-outline'
              size={16}
              color={palette.primary}
            />
            <FancyText
              size='extraSmall'
              type='medium'
              color={palette.fonts.inactive}
              style={styles.teamSummaryText}
            >
              {participantesSelecionados.length} voluntários distribuídos em {totalFuncoesResumo}{' '}
              {totalFuncoesResumo === 1 ? 'função' : 'funções'}.
            </FancyText>
          </View>
        ) : null}

        <View style={styles.participantsList}>
          {participantesSelecionados.length === 0 ? (
            <View style={styles.emptyState}>
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='account-off-outline'
                size={28}
                color={palette.fonts.inactive}
              />
              <FancyText size='small' color={palette.fonts.inactive}>
                Nenhum participante selecionado.
              </FancyText>
            </View>
          ) : (
            participantesSelecionados.map((participante) => (
              <FancyListItemCard
                key={participante.id}
                title={getFirstAndLastName(participante.nome)}
                subtitle={
                  participante.funcoes.length > 0
                    ? participante.funcoes.join(' • ')
                    : 'Sem função cadastrada'
                }
                leading={{
                  type: 'image',
                  source: participante.fotoUrl
                    ? { uri: participante.fotoUrl }
                    : AppImages.emptyProfile,
                }}
                meta={
                  participante.funcoes.length > 1 ? (
                    <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                      {participante.funcoes.length} funções encontradas
                    </FancyText>
                  ) : undefined
                }
                containerStyle={styles.teamListCard}
              />
            ))
          )}
        </View>
      </ReviewSection>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 20,
      gap: 14,
    },
    heroCard: {
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: palette.backgroundColor,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.18),
      paddingVertical: 12,
      paddingHorizontal: 12,
      ...palette.shadows[100],
    },
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    heroBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.1),
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.16),
    },
    heroTextWrap: {
      flex: 1,
      gap: 2,
    },
    heroPeriod: {
      marginTop: 10,
      borderRadius: 16,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.06),
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.14),
      paddingVertical: 11,
      paddingHorizontal: 12,
      gap: 10,
    },
    periodTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    periodIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.backgroundColor,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.18),
    },
    periodTitleText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    periodRangeRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
    },
    periodDateBlock: {
      flex: 1,
      minHeight: 54,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.1),
      backgroundColor: palette.backgroundColor,
      paddingHorizontal: 10,
      paddingVertical: 8,
      justifyContent: 'center',
      gap: 2,
    },
    periodRangeConnector: {
      width: 36,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    periodConnectorLine: {
      width: 16,
      height: 1,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.25),
    },
    summaryMetricsRow: {
      marginTop: 10,
      flexDirection: 'row',
      gap: 0,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.1),
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.045),
      overflow: 'hidden',
    },
    summaryMetric: {
      minHeight: 50,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      flex: 1,
    },
    summaryMetricBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    summaryMetricText: {
      gap: 0,
      flex: 1,
      minWidth: 0,
    },
    sectionCard: {
      backgroundColor: palette.backgroundColor,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.16),
      overflow: 'hidden',
      ...palette.shadows[100],
    },
    sectionHeader: {
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.045),
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    sectionIconBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.backgroundColor,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.14),
    },
    sectionTitleWrap: {
      flex: 1,
      gap: 1,
    },
    sectionContent: {
      paddingTop: 10,
      paddingBottom: 12,
      paddingHorizontal: 10,
      gap: 9,
    },
    sectionChevronBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.backgroundColor,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.1),
    },
    listCard: {
      borderRadius: 14,
      minHeight: 64,
      paddingVertical: 8,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.025),
      borderWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    },
    teamListCard: {
      borderRadius: 14,
      minHeight: 64,
      paddingVertical: 8,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.035),
      borderWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
    },
    eventCardWrap: {
      marginBottom: 6,
    },
    expandedContent: {
      paddingTop: 8,
      paddingBottom: 2,
      paddingHorizontal: 6,
      gap: 10,
    },
    detailGroup: {
      gap: 6,
      paddingHorizontal: 6,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailBullet: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: palette.fonts.inactive,
      flexShrink: 0,
    },
    detailText: {
      flex: 1,
    },
    fixedVolunteerAvatar: {
      borderRadius: 10,
    },
    teamSummaryStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.12),
      backgroundColor: palette.backgroundColor,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    teamSummaryText: {
      flex: 1,
    },
    participantsList: {
      gap: 8,
    },
    emptyState: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: ColorUtils.withAlpha(palette.primary, 0.14),
      borderStyle: 'dashed',
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.05),
      paddingVertical: 20,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    bottomSpacer: {
      height: 20,
    },
  });
}
