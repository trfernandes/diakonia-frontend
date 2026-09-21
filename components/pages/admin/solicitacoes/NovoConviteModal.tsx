import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useMemo, useState } from 'react';
import FancyText from '../../../FancyText';
import FancyTextInput from '../../../fields/FancyTextInput';
import FancyChips from '../../../FancyChips';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import FancyButton from '../../../buttons/FancyButton';
import FancySearchSelect from '../../../fields/FancySearchSelect';
import DefaultIcons from '../../../FancyIcons';
import { ThemePalette } from '../../../../constants/colors';
import { CreateIgrejaConviteDto } from '../../../../domain/dtos/Igreja/create-igreja-convite.dto';
import { addDays } from 'date-fns';
import { usePallete } from '../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../hooks/useThemedStyles';
import { ColorUtils } from '../../../../utils/color_utils';
import { useMinisteriosCrud } from '../../../../hooks/useMinisteriosCrud';
import { DropDownItemProps } from '../../../fields/FancyDropDownItem';

type NovoConviteModalProps = {
  visible: boolean;
  onClose: () => void;
  onCriar: (dto: CreateIgrejaConviteDto) => void;
  isLoading?: boolean;
};

// Opções de validade
const VALIDADE_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: 'Sem limite', value: null },
];

// Opções de max uses
const MAX_USES_OPTIONS = [
  { label: '1 uso', value: 1 },
  { label: '5 usos', value: 5 },
  { label: '10 usos', value: 10 },
  { label: 'Ilimitado', value: null },
];

export default function NovoConviteModal({
  visible,
  onClose,
  onCriar,
  isLoading = false,
}: NovoConviteModalProps) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);
  const [descricao, setDescricao] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [maxUses, setMaxUses] = useState<number | null>(1);
  const [validadeDias, setValidadeDias] = useState<number | null>(7);
  const [ministerioIds, setMinisterioIds] = useState<string[]>([]);

  const { data: ministeriosData } = useMinisteriosCrud({ autoFetch: true });
  const ministeriosDropDownList = useMemo<DropDownItemProps<string>[]>(
    () => (ministeriosData ?? []).map((m) => ({ title: m.nome, value: m.id })),
    [ministeriosData],
  );

  const handleCriar = () => {
    const dto: CreateIgrejaConviteDto = {
      descricao: descricao.trim() || undefined,
      autoApprove,
      maxUses: maxUses ?? undefined,
      expiresAt: validadeDias ? addDays(new Date(), validadeDias).toISOString() : undefined,
      ministerioIds: ministerioIds.length > 0 ? ministerioIds : undefined,
    };
    onCriar(dto);
  };

  const handleClose = () => {
    // Reset form
    setDescricao('');
    setAutoApprove(false);
    setMaxUses(1);
    setValidadeDias(7);
    setMinisterioIds([]);
    onClose();
  };

  return (
    <FancyBottomSheetModal
      visible={visible}
      title='Novo Convite'
      onClose={handleClose}
      closeDisabled={isLoading}
      footer={
        <View style={styles.footer}>
          <FancyText
            size='extraSmall'
            type='medium'
            color={palette.fonts.inactive}
            style={styles.footerPreview}
          >
            {descricao.trim() || 'Convite'} • {maxUses ? `${maxUses} uso(s)` : 'Ilimitado'} •{' '}
            {validadeDias ? `${validadeDias} dias` : 'Sem expiração'}
          </FancyText>
          <FancyButton
            label='Gerar Convite'
            loadingText='Gerando...'
            icon={{
              library: 'MaterialCommunityIcons',
              name: 'ticket-confirmation-outline',
              size: 16,
            }}
            disabled={isLoading}
            isLoading={isLoading}
            onPress={handleCriar}
          />
        </View>
      }
    >
      {/* Descrição */}
      <View style={styles.section}>
        <FancyTextInput
          label='Descrição (opcional)'
          placeholder='Ex: Convite para louvor, Ministério infantil...'
          value={descricao}
          disabled={isLoading}
          inputProps={{
            onChangeText: setDescricao,
            maxLength: 100,
          }}
        />
      </View>

      {/* Ministérios (opcional) */}
      <View style={styles.section}>
        <FancyText
          size='small'
          type='semiBold'
          color={palette.fonts.inactive}
          style={styles.sectionLabel}
        >
          Ministérios (opcional)
        </FancyText>
        <FancySearchSelect
          multiSelect
          placeholder='Nenhum — só entra na igreja'
          searchPlaceholder='Buscar ministério...'
          listItems={ministeriosDropDownList}
          value={ministerioIds}
          onChange={(value) => setMinisterioIds(Array.isArray(value) ? value : [])}
          disabled={isLoading}
        />
      </View>

      {/* Toggle de entrada imediata - Redesenhado */}
      <View style={styles.entryTypeSection}>
        <FancyText
          size='small'
          type='semiBold'
          color={palette.fonts.inactive}
          style={styles.sectionLabel}
        >
          Tipo de Entrada
        </FancyText>

        <View style={styles.entryTypeCards}>
          <TouchableOpacity
            style={[
              styles.entryTypeCard,
              !autoApprove && styles.entryTypeCardActive,
              !autoApprove && {
                borderColor: palette.warning,
                backgroundColor: ColorUtils.withAlpha(palette.warning, 0.14),
              },
            ]}
            onPress={() => setAutoApprove(false)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <DefaultIcons.Custom
              library='MaterialIcons'
              name='hourglass-empty'
              size={24}
              color={!autoApprove ? palette.warning : palette.fonts.inactive}
            />
            <FancyText
              type={!autoApprove ? 'semiBold' : 'normal'}
              size='small'
              color={!autoApprove ? palette.warning : palette.fonts.inactive}
            >
              Com Aprovação
            </FancyText>
            <FancyText
              size='extraSmall'
              color={palette.fonts.inactive}
              style={styles.entryTypeDesc}
            >
              Você aprova cada solicitação
            </FancyText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.entryTypeCard,
              autoApprove && styles.entryTypeCardActive,
              autoApprove && {
                borderColor: palette.confirm,
                backgroundColor: ColorUtils.withAlpha(palette.confirm, 0.14),
              },
            ]}
            onPress={() => setAutoApprove(true)}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <DefaultIcons.Custom
              library='MaterialIcons'
              name='flash-on'
              size={24}
              color={autoApprove ? palette.confirm : palette.fonts.inactive}
            />
            <FancyText
              type='bold'
              size='small'
              color={autoApprove ? palette.confirm : palette.fonts.inactive}
            >
              Entrada Imediata
            </FancyText>
            <FancyText
              size='extraSmall'
              color={palette.fonts.inactive}
              style={styles.entryTypeDesc}
            >
              Entra automaticamente
            </FancyText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Número de usos */}
      <View style={styles.section}>
        <FancyText
          size='small'
          type='semiBold'
          color={palette.fonts.inactive}
          style={styles.sectionLabel}
        >
          Número de Usos
        </FancyText>
        <View style={styles.chipsRow}>
          {MAX_USES_OPTIONS.map((opt) => (
            <FancyChips
              key={opt.label}
              label={opt.label}
              color={maxUses === opt.value ? palette.primary : palette.fonts.inactive}
              outlined={maxUses !== opt.value}
              size='small'
              style={styles.chip}
              onPress={() => setMaxUses(opt.value)}
            />
          ))}
        </View>
      </View>

      {/* Validade */}
      <View style={styles.section}>
        <FancyText
          size='small'
          type='semiBold'
          color={palette.fonts.inactive}
          style={styles.sectionLabel}
        >
          Validade
        </FancyText>
        <View style={styles.chipsRow}>
          {VALIDADE_OPTIONS.map((opt) => (
            <FancyChips
              key={opt.label}
              label={opt.label}
              color={validadeDias === opt.value ? palette.primary : palette.fonts.inactive}
              outlined={validadeDias !== opt.value}
              size='small'
              style={styles.chip}
              onPress={() => setValidadeDias(opt.value)}
            />
          ))}
        </View>
      </View>
    </FancyBottomSheetModal>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    content: {
      gap: 18,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    section: {
      gap: 10,
    },
    sectionLabel: {
      marginBottom: 2,
    },
    entryTypeSection: {
      gap: 10,
    },
    entryTypeCards: {
      flexDirection: 'row',
      gap: 10,
    },
    entryTypeCard: {
      flex: 1,
      alignItems: 'center',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: palette.borderCard,
      backgroundColor: palette.backgroundColor2,
      gap: 6,
    },
    entryTypeCardActive: {
      borderWidth: 1.5,
    },
    entryTypeDesc: {
      textAlign: 'center',
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    footer: {
      gap: 8,
      paddingBottom: 2,
    },
    footerPreview: {
      textAlign: 'center',
    },
  });
}
