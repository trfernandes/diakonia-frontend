import { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { ThemePalette } from '../constants/colors';
import FancyToast from '../components/FancyToast';
import { ColorUtils } from './color_utils';

export function createToastConfig(palette: ThemePalette): ToastConfig {
  const isDarkPalette = ColorUtils.getTextColorForBackground(palette.backgroundColor) === '#FFFFFF';

  return {
    success: (props: ToastConfigParams<any>) => (
      <FancyToast
        {...props}
        icon={{
          library: 'FontAwesome5',
          name: 'check',
          size: 20,
          color: palette.confirm,
          style: {
            paddingTop: 2,
            lineHeight: 16,
            height: 15,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
          },
        }}
        color={palette.confirm}
        lightColorPercent={64}
        backgroundColor={
          isDarkPalette
            ? ColorUtils.blendOver(palette.confirm, 0.34, palette.backgroundColor2)
            : undefined
        }
      />
    ),
    error: (props: ToastConfigParams<any>) => (
      <FancyToast
        {...props}
        icon={{
          library: 'FontAwesome',
          name: 'exclamation',
          size: 23,
          color: palette.error,
          style: {
            paddingTop: 1,
            lineHeight: 21,
            height: 21,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
          },
        }}
        color={palette.error}
        lightColorPercent={42}
        backgroundColor={
          isDarkPalette
            ? ColorUtils.blendOver(palette.error, 0.34, palette.backgroundColor2)
            : undefined
        }
      />
    ),
    info: (props: ToastConfigParams<any>) => (
      <FancyToast
        {...props}
        icon={{
          library: 'FontAwesome',
          name: 'info',
          size: 24,
          color: palette.primary,
          style: {
            lineHeight: 23,
            height: 22,
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
          },
        }}
        color={palette.primary}
        lightColorPercent={38}
        backgroundColor={
          isDarkPalette
            ? ColorUtils.blendOver(palette.primary, 0.34, palette.backgroundColor2)
            : undefined
        }
      />
    ),
  };
}
