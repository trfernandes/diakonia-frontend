import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import FancyText from './FancyText';
import DefaultIcons from './FancyIcons';
import { usePallete } from '../hooks/usePallete';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ThemePalette } from '../constants/colors';
import { ColorUtils } from '../utils/color_utils';

export type FancyInfoNoteProps = {
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function FancyInfoNote({ children, containerStyle }: FancyInfoNoteProps) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.container, containerStyle]}>
      <DefaultIcons.Custom
        library='MaterialCommunityIcons'
        name='information-outline'
        size={16}
        color={palette.primary}
      />
      <FancyText size='extraSmall' type='medium' style={styles.text}>
        {children}
      </FancyText>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12),
    },
    text: {
      flex: 1,
      lineHeight: 16,
    },
  });
}
