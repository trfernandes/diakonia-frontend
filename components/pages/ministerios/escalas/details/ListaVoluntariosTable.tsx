import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { EscalaItemEquipeType } from '../../../../../app/(app)/(drawer)/ministerios/escalas/details';
import FancyText from '../../../../FancyText';

import FancyAvatarImage from '../../../../images/FancyImage';
import DefaultIcons from '../../../../FancyIcons';
import { ThemePalette } from '../../../../../constants/colors';
import { useVoluntariosCrud } from '../../../../../hooks/useVoluntariosCrud';
import { useState, useCallback } from 'react';
import VoluntarioDetailsModal from './VoluntarioDetailsModal';
import {
  EscalaItemStatusEnum,
  EscalaItemStatusEnumLabel,
} from '../../../../../domain/enums/Escala/escala-item-status.enum';
import { EscalaTemplateExperienciaLabel } from '../../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import { AppImages } from '../../../../../assets/app_images';
import FancyActionSheet from '../../../../actions/FancyActionSheet';
import FancyListEmpty from '../../../../list/FancyListEmpty';
import { usePallete } from '../../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../../hooks/useThemedStyles';
import { useAppTheme } from '../../../../../hooks/useAppTheme';
import { ColorUtils } from '../../../../../utils/color_utils';
import { getFirstAndLastName } from '../../../../../utils/text_utils';
import { useProblemasPorItem } from './EscalaProblemasContext';

const ACTION_HIT_SLOP = { top: 16, bottom: 16, left: 16, right: 16 } as const;

export const VoluntarioStatusChipLabels: Record<EscalaItemStatusEnum, string> = {
  [EscalaItemStatusEnum.Pendente]: 'Pendente',
  [EscalaItemStatusEnum.Ausente]: 'Ausente',
  [EscalaItemStatusEnum.Confirmado]: 'Confirmado',
  [EscalaItemStatusEnum.Substituido]: 'Substituído',
  [EscalaItemStatusEnum.SubstituicaoSolicitada]: 'Aguard. aprovação',
};

export function getVoluntarioStatusChipParams(
  palette: ReturnType<typeof usePallete>,
  isDark: boolean,
) {
  const alpha = isDark ? 0.2 : 0.14;
  return {
    [EscalaItemStatusEnum.Pendente]: {
      label: VoluntarioStatusChipLabels[EscalaItemStatusEnum.Pendente],
      color: palette.warning,
      background: ColorUtils.withAlpha(palette.warning, isDark ? 0.22 : 0.18),
    },
    [EscalaItemStatusEnum.Ausente]: {
      label: VoluntarioStatusChipLabels[EscalaItemStatusEnum.Ausente],
      color: palette.error,
      background: ColorUtils.withAlpha(palette.error, alpha),
    },
    [EscalaItemStatusEnum.Confirmado]: {
      label: VoluntarioStatusChipLabels[EscalaItemStatusEnum.Confirmado],
      color: palette.confirm,
      background: ColorUtils.withAlpha(palette.confirm, alpha),
    },
    [EscalaItemStatusEnum.Substituido]: {
      label: VoluntarioStatusChipLabels[EscalaItemStatusEnum.Substituido],
      color: palette.secondary,
      background: ColorUtils.withAlpha(palette.secondary, alpha),
    },
    [EscalaItemStatusEnum.SubstituicaoSolicitada]: {
      label: VoluntarioStatusChipLabels[EscalaItemStatusEnum.SubstituicaoSolicitada],
      color: palette.warning,
      background: ColorUtils.withAlpha(palette.warning, isDark ? 0.22 : 0.18),
    },
  };
}

export default function ListaVoluntariosTable({
  data,
  onSubstituicaoButtonPressed,
  onAdicionarVoluntarioButtonPressed,
  onRemoverVoluntarioPressed,
  onExcluirFuncaoPressed,
  viewMode,
  accentColor,
}: {
  data: EscalaItemEquipeType[];
  onSubstituicaoButtonPressed?: (data: EscalaItemEquipeType) => void;
  onAdicionarVoluntarioButtonPressed?: (data: EscalaItemEquipeType) => void;
  onRemoverVoluntarioPressed?: (data: EscalaItemEquipeType) => void;
  onExcluirFuncaoPressed?: (item: EscalaItemEquipeType) => void;
  viewMode?: 'view' | 'edit';
  accentColor?: string;
}) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const { isDark } = useAppTheme();
  const voluntarioStatusChipParams = getVoluntarioStatusChipParams(palette, isDark);
  const { data: voluntariosData } = useVoluntariosCrud({ autoFetch: true });
  const voluntariosList = voluntariosData ?? [];
  const problemasPorItem = useProblemasPorItem();
  const [voluntarioDetailsProps, setVoluntarioDetailsProps] = useState<{
    isVisible: boolean;
    ministerioVoluntarioId?: string;
    voluntarioId?: string;
  }>({ isVisible: false });
  const [menuItem, setMenuItem] = useState<EscalaItemEquipeType | null>(null);

  const handleVoluntarioClick = useCallback((minVoluntarioId: string, voluntarioId: string) => {
    setVoluntarioDetailsProps({
      isVisible: true,
      ministerioVoluntarioId: minVoluntarioId,
      voluntarioId: voluntarioId,
    });
  }, []);

  const isEditMode = !viewMode || viewMode === 'edit';

  const validEquipe = data?.filter((item) => !!item.funcao?.id || !!item.nomeFuncaoAvulsa) ?? [];

  return (
    <>
      <View style={styles.container}>
        {validEquipe.map((equipeItem, index) => {
          const voluntarioData = voluntariosList.find(
            (v) => v.id === equipeItem.voluntario?.voluntarioId,
          );
          const hasVoluntario = !!equipeItem.voluntario?.nome;
          const isAvulso = !hasVoluntario && !!equipeItem.nomeAvulso;
          const isPreenchido = hasVoluntario || isAvulso;
          const isFuncaoAvulsa = !equipeItem.funcao?.id && !!equipeItem.nomeFuncaoAvulsa;

          // E2E 2.3 rascunho (vermelho) / 2.2b (laranja): pessoa que trava a publicação.
          const problemas = isPreenchido
            ? (problemasPorItem.get(equipeItem.idEscalaItem) ?? [])
            : [];
          const temIndisponivel = problemas.some((p) => p.tipo === 'INDISPONIVEL');
          const corProblema = temIndisponivel ? palette.error : palette.warning;

          const isVago = !isPreenchido;
          const rowPressesToAdd = isVago && isEditMode;
          const rowPressesToProfile = hasVoluntario;
          const rowOnPress = rowPressesToProfile
            ? () =>
                handleVoluntarioClick(
                  equipeItem.voluntario?.minVoluntarioId!,
                  equipeItem.voluntario?.voluntarioId!,
                )
            : rowPressesToAdd
              ? () => onAdicionarVoluntarioButtonPressed?.(equipeItem)
              : undefined;

          const rowContent = (
            <View style={styles.row}>
              {/* Avatar com dot de status */}
              {hasVoluntario ? (
                <View style={styles.avatarWrapper}>
                  <FancyAvatarImage
                    source={
                      voluntarioData?.fotoThumbUrl || voluntarioData?.fotoUrl
                        ? { uri: voluntarioData?.fotoThumbUrl || voluntarioData?.fotoUrl || '' }
                        : AppImages.emptyProfile
                    }
                    size={36}
                    style={styles.avatar}
                  />
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: voluntarioStatusChipParams[equipeItem.status].color },
                    ]}
                  />
                </View>
              ) : isAvulso ? (
                <View style={[styles.avatarWrapper, styles.emptyAvatar]}>
                  <DefaultIcons.Custom
                    library='MaterialIcons'
                    name='person-outline'
                    size={16}
                    color={palette.icons.inactive}
                  />
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: voluntarioStatusChipParams[equipeItem.status].color },
                    ]}
                  />
                </View>
              ) : (
                <View style={styles.emptyAvatar}>
                  <DefaultIcons.Custom
                    library='MaterialIcons'
                    name='work-outline'
                    size={15}
                    color={palette.icons.inactive2}
                  />
                </View>
              )}

              {/* Info: Função + Nome */}
              <View style={styles.infoColumn}>
                <FancyText
                  type='medium'
                  size='extraSmall'
                  color={palette.fonts.inactive}
                  numberOfLines={1}
                >
                  {equipeItem.funcao?.nome ?? equipeItem.nomeFuncaoAvulsa}
                  {hasVoluntario && equipeItem.funcao?.experiencia
                    ? ` · ${EscalaTemplateExperienciaLabel[equipeItem.funcao.experiencia]}`
                    : !isPreenchido && equipeItem.funcao?.expMinima
                      ? ` · mín: ${EscalaTemplateExperienciaLabel[equipeItem.funcao.expMinima]}`
                      : isFuncaoAvulsa
                        ? ' · função sem cadastro'
                        : isAvulso
                          ? ' · pessoa sem cadastro'
                          : ''}
                </FancyText>
                {hasVoluntario || isAvulso ? (
                  <View style={styles.nomeRow}>
                    <FancyText type='semiBold' size='small' numberOfLines={1} style={styles.nome}>
                      {hasVoluntario
                        ? getFirstAndLastName(equipeItem.voluntario?.nome)
                        : equipeItem.nomeAvulso}
                    </FancyText>
                    {problemas.length > 0 && (
                      <View
                        style={[
                          styles.seloProblema,
                          { backgroundColor: ColorUtils.withAlpha(corProblema, 0.14) },
                        ]}
                      >
                        <DefaultIcons.Custom
                          library='MaterialCommunityIcons'
                          name={temIndisponivel ? 'calendar-remove' : 'clock-alert-outline'}
                          size={12}
                          color={corProblema}
                        />
                        <FancyText type='semiBold' size='extraSmall' color={corProblema}>
                          {temIndisponivel ? 'Indisponível' : 'Mesmo horário'}
                        </FancyText>
                      </View>
                    )}
                  </View>
                ) : (
                  <FancyText type='semiBold' size='medium' color={palette.fonts.inactive}>
                    Sem Voluntário
                  </FancyText>
                )}
                {problemas.map((problema) => (
                  <FancyText
                    key={`${problema.tipo}-${problema.detalhe}`}
                    type='medium'
                    size='extraSmall'
                    color={problema.tipo === 'INDISPONIVEL' ? palette.error : palette.warning}
                  >
                    {problema.detalhe}
                  </FancyText>
                ))}
              </View>

              {/* Ações */}
              {rowPressesToAdd ? (
                <View style={styles.vagoActions}>
                  <Pressable
                    hitSlop={ACTION_HIT_SLOP}
                    onPress={() => onExcluirFuncaoPressed?.(equipeItem)}
                    style={styles.deleteButton}
                  >
                    <DefaultIcons.Custom
                      library='MaterialIcons'
                      name='delete-outline'
                      size={18}
                      color={palette.error}
                    />
                  </Pressable>
                  <DefaultIcons.Custom
                    library='MaterialIcons'
                    name='chevron-right'
                    size={20}
                    color={palette.icons.inactive2}
                  />
                </View>
              ) : (
                isEditMode && (
                  <Pressable
                    hitSlop={ACTION_HIT_SLOP}
                    onPress={() => setMenuItem(equipeItem)}
                    style={styles.dotsButton}
                  >
                    <DefaultIcons.Custom
                      library='Entypo'
                      name='dots-three-vertical'
                      size={14}
                      color={accentColor ?? palette.icons.inactive}
                    />
                  </Pressable>
                )
              )}
            </View>
          );

          return (
            <View key={index}>
              {rowOnPress ? <Pressable onPress={rowOnPress}>{rowContent}</Pressable> : rowContent}
              {index < validEquipe.length - 1 && <View style={styles.rowDivider} />}
            </View>
          );
        })}
      </View>

      <FancyActionSheet
        visible={!!menuItem}
        onClose={() => setMenuItem(null)}
        title={
          menuItem?.voluntario?.nome ??
          menuItem?.nomeAvulso ??
          menuItem?.funcao?.nome ??
          menuItem?.nomeFuncaoAvulsa ??
          'Opções'
        }
        actions={
          menuItem
            ? menuItem.voluntario?.nome
              ? [
                  {
                    label: 'Substituir voluntário',
                    icon: { library: 'FontAwesome5' as const, name: 'exchange-alt', size: 15 },
                    onPress: () => onSubstituicaoButtonPressed?.(menuItem),
                  },
                  {
                    label: 'Remover da escala',
                    icon: { library: 'MaterialIcons' as const, name: 'person-remove', size: 18 },
                    onPress: () => onRemoverVoluntarioPressed?.(menuItem),
                    destructive: true,
                  },
                ]
              : menuItem.nomeAvulso
                ? [
                    {
                      label: 'Substituir',
                      icon: { library: 'FontAwesome5' as const, name: 'exchange-alt', size: 15 },
                      onPress: () => onSubstituicaoButtonPressed?.(menuItem),
                    },
                    {
                      label: 'Remover da escala',
                      icon: { library: 'MaterialIcons' as const, name: 'person-remove', size: 18 },
                      onPress: () => onRemoverVoluntarioPressed?.(menuItem),
                      destructive: true,
                    },
                  ]
                : [
                    {
                      label: 'Adicionar voluntário',
                      icon: { library: 'MaterialIcons' as const, name: 'person-add', size: 18 },
                      onPress: () => onAdicionarVoluntarioButtonPressed?.(menuItem),
                    },
                    {
                      label: 'Excluir função',
                      icon: { library: 'MaterialIcons' as const, name: 'delete-outline', size: 18 },
                      onPress: () => onExcluirFuncaoPressed?.(menuItem),
                      destructive: true,
                    },
                  ]
            : []
        }
      />

      {voluntarioDetailsProps.isVisible &&
        voluntarioDetailsProps.ministerioVoluntarioId &&
        voluntarioDetailsProps.voluntarioId && (
          <VoluntarioDetailsModal
            ministerioVoluntarioId={voluntarioDetailsProps.ministerioVoluntarioId}
            voluntarioId={voluntarioDetailsProps.voluntarioId}
            onClose={() => setVoluntarioDetailsProps({ isVisible: false })}
          />
        )}
    </>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      gap: 0,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      marginLeft: 50,
      backgroundColor: ColorUtils.withAlpha(palette.fonts.dark, 0.07),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      gap: 10,
      minHeight: 44,
    },
    avatarWrapper: {
      position: 'relative',
      alignSelf: 'center',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignSelf: 'center',
    },
    statusDot: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: palette.backgroundColor,
    },
    emptyAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: palette.backgroundColor3,
      borderWidth: 1,
      borderColor: palette.borderCard,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
    },
    infoColumn: {
      flex: 1,
      gap: 2,
      justifyContent: 'center',
    },
    nomeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nome: {
      flexShrink: 1,
    },
    seloProblema: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    dotsButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
    },
    vagoActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    deleteButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
    },
  });
}
