import { useState } from 'react';
import { StyleSheet, ImageSourcePropType, ImageStyle, StyleProp, View } from 'react-native';
import { Image } from 'expo-image';
import { ImageUtils } from '../../utils/image_utils';
import { AppImages } from '../../assets/app_images';
import DefaultIcons from '../FancyIcons';
import FancyText from '../FancyText';
import { usePallete } from '../../hooks/usePallete';
import { ColorUtils } from '../../utils/color_utils';

export default function FancyImage({
  source,
  disabled = false,
  size = 120,
  style,
  fallbackName,
}: {
  source?: ImageSourcePropType;
  disabled?: boolean;
  size?: number;
  style?: StyleProp<ImageStyle>;
  /**
   * Nome usado pra montar as iniciais exibidas no lugar do ícone genérico quando
   * não há foto. Só surte efeito quando `source` é o placeholder de perfil vazio.
   */
  fallbackName?: string;
}) {
  const palette = usePallete();
  const resolvedSource = ImageUtils.normalizeImageSource(source) ?? source;
  const isEmptyProfilePlaceholder =
    source === AppImages.emptyProfile || resolvedSource === AppImages.emptyProfile;

  const initials = (() => {
    if (!fallbackName) return '';
    const parts = fallbackName.trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  })();
  const showInitials = isEmptyProfilePlaceholder && initials.length > 0;
  // Enquanto a foto remota carrega, mostra as iniciais no lugar do círculo vazio.
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const showLoadingInitials = !isEmptyProfilePlaceholder && initials.length > 0 && !photoLoaded;

  // IMPORTANTE: NUNCA montar/desmontar nem trocar o tipo de elemento nativo no
  // mesmo slot. Alternar <Image> <-> ícone (ou montar/desmontar um deles) faz o
  // Android crashar com "addViewAt: failed to insert view into parent at index"
  // durante a reconciliação — sobretudo quando a tela é desmontada logo depois
  // (ex.: router.back() após salvar). Por isso a <Image> e o ícone ficam SEMPRE
  // montados, nesta ordem, e só a opacity alterna. Assim a contagem e os tipos
  // dos filhos nunca mudam e não há operação addViewAt/removeView para falhar.
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          justifyContent: 'center',
          alignItems: 'center',
          ...(isEmptyProfilePlaceholder
            ? {}
            : { backgroundColor: palette.backgroundColor, ...palette.shadows[200] }),
        },
        isEmptyProfilePlaceholder && {
          backgroundColor: showInitials
            ? ColorUtils.withAlpha(palette.primary, 0.14)
            : palette.backgroundColor2,
          borderWidth: Math.max(1, Math.round(size * 0.03)),
          borderColor: showInitials ? ColorUtils.withAlpha(palette.primary, 0.14) : palette.border,
        },
        style as any,
        disabled && isEmptyProfilePlaceholder && styles.placeholderDisabled,
      ]}
    >
      <Image
        contentFit='cover'
        transition={100}
        priority='low'
        cachePolicy='memory-disk'
        source={isEmptyProfilePlaceholder ? undefined : resolvedSource}
        onLoad={() => setPhotoLoaded(true)}
        style={[
          { width: size, height: size },
          disabled && resolvedSource !== undefined && styles.blackAndWhiteFilter,
          isEmptyProfilePlaceholder && { opacity: 0 },
        ]}
      />
      <DefaultIcons.Custom
        library='MaterialIcons'
        name='person'
        size={Math.max(18, Math.round(size * 0.52))}
        color={palette.icons.inactive}
        style={{
          position: 'absolute',
          opacity: isEmptyProfilePlaceholder && !showInitials ? 1 : 0,
        }}
      />
      <FancyText
        type='bold'
        color={palette.primary}
        size={size < 32 ? Math.round(size * 0.4) : Math.max(12, Math.round(size * 0.36))}
        style={{
          position: 'absolute',
          opacity: showInitials || showLoadingInitials ? 1 : 0,
        }}
      >
        {initials}
      </FancyText>
    </View>
  );
}

const styles = StyleSheet.create({
  blackAndWhiteFilter: {
    // opacity: 0.4, // Reduz a opacidade
    // tintColor: 'gray', // Aplica um tom de cinza
  },
  placeholderDisabled: {
    opacity: 0.95,
  },
});
