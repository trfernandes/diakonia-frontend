import { Pressable, StyleSheet, View } from 'react-native';
import FancyText from '../../../FancyText';
import { usePallete } from '../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../hooks/useThemedStyles';
import { ThemePalette } from '../../../../constants/colors';
import DefaultIcons from '../../../FancyIcons';
import { ColorUtils } from '../../../../utils/color_utils';
import { resumoEscopoIndisponibilidade } from '../../../../domain/utils/escopo_indisponibilidade_utils';

type MinisterioInfo = {
  id: string;
  nome: string;
};

type FuncaoInfo = {
  id: string;
  nome: string;
  ministerioId: string;
};

export type EscopoIndisponibilidadeFieldProps = {
  ministeriosInteirosIds: string[] | null | undefined;
  funcoesIds: string[] | null | undefined;
  ministerios: MinisterioInfo[];
  funcoes: FuncaoInfo[];
  label?: string;
  disabled?: boolean;
  onPress: () => void;
};

export default function EscopoIndisponibilidadeField({
  ministeriosInteirosIds,
  funcoesIds,
  ministerios,
  funcoes,
  label = 'Onde vale',
  disabled = false,
  onPress,
}: EscopoIndisponibilidadeFieldProps) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);

  const resumo = resumoEscopoIndisponibilidade(
    ministeriosInteirosIds,
    funcoesIds,
    ministerios,
    funcoes,
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityHint={resumo}
    >
      <View
        style={[
          styles.container,
          disabled && { backgroundColor: ColorUtils.withAlpha(palette.disabled, 0.05) },
        ]}
      >
        <View style={styles.content}>
          <FancyText size='small' type='medium' color={palette.fonts.inactive}>
            {label}
          </FancyText>
          <FancyText size='medium' type='medium' color={palette.fonts.dark}>
            {resumo}
          </FancyText>
        </View>
        <DefaultIcons.Custom
          library='MaterialCommunityIcons'
          name='chevron-right'
          size={24}
          color={palette.fonts.dark}
        />
      </View>
    </Pressable>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.04),
      borderWidth: 1,
      borderColor: palette.border,
      minHeight: 60,
    },
    content: {
      flex: 1,
      gap: 4,
    },
  });
}
