import { Linking, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import FancyText from '../FancyText';
import { usePallete } from '../../hooks/usePallete';
import { ColorUtils } from '../../utils/color_utils';
import {
  detectMusicLinkService,
  isOpenableMusicUrl,
  toOpenableMusicUrl,
} from '../../utils/musicLinkUtils';

type Props = {
  url?: string | null;
  showLabel?: boolean;
};

export default function MusicListenButton({ url, showLabel = false }: Props) {
  const palette = usePallete();

  const trimmedUrl = url?.trim() || '';
  const hasUrl = trimmedUrl.length > 0 && isOpenableMusicUrl(trimmedUrl);
  const service = hasUrl ? detectMusicLinkService(trimmedUrl) : null;

  const icon: keyof typeof MaterialCommunityIcons.glyphMap = !hasUrl
    ? 'youtube'
    : service === 'youtube'
      ? 'youtube'
      : service === 'spotify'
        ? 'spotify'
        : 'play-circle-outline';

  const color =
    service === 'youtube' ? palette.primary : hasUrl ? palette.secondary : palette.icons.inactive2;

  const accessibilityLabel = hasUrl ? 'Abrir música' : 'Sem link cadastrado para esta música';

  const handlePress = () => {
    if (!hasUrl) return;
    void Linking.openURL(toOpenableMusicUrl(trimmedUrl));
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!hasUrl}
      hitSlop={8}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      style={[
        showLabel ? styles.wrapLabeled : styles.iconWrap,
        {
          backgroundColor: ColorUtils.withAlpha(color, 0.12),
          borderColor: ColorUtils.withAlpha(color, 0.24),
        },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      {showLabel ? (
        <FancyText type='bold' size='extraSmall' color={color}>
          {hasUrl ? 'Abrir no Youtube' : 'Sem Link'}
        </FancyText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    borderWidth: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapLabeled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 0.6,
    alignSelf: 'flex-start',
  },
});
