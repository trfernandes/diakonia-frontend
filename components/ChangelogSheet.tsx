import { StyleSheet, View } from 'react-native';
import FancyBottomSheetModal from './modal/FancyBottomSheetModal';
import FancyButton from './buttons/FancyButton';
import FancyText from './FancyText';
import DefaultIcons from './FancyIcons';
import { usePallete } from '../hooks/usePallete';
import { ColorUtils } from '../utils/color_utils';
import { ChangelogItem } from '../constants/changelog';

type Props = {
  visible: boolean;
  version: string;
  items: ChangelogItem[];
  onClose: () => void;
};

export default function ChangelogSheet({ visible, version, items, onClose }: Props) {
  const palette = usePallete();

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={`Novidades da versão ${version}`}
      footer={<FancyButton label='Entendi' onPress={onClose} />}
    >
      <View style={styles.list}>
        {items.map((item, index) => {
          const accentColor = palette[item.accent ?? 'primary'];
          return (
            <View key={index} style={styles.row}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: ColorUtils.withAlpha(accentColor, 0.14) },
                ]}
              >
                <DefaultIcons.Custom
                  library={item.icon.library}
                  name={item.icon.name}
                  size={22}
                  color={accentColor}
                />
              </View>
              <View style={styles.textColumn}>
                <FancyText type='bold' size='small' color={palette.fonts.dark}>
                  {item.title}
                </FancyText>
                <FancyText type='medium' size='small' color={palette.fonts.inactive}>
                  {item.description}
                </FancyText>
              </View>
            </View>
          );
        })}
      </View>
    </FancyBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textColumn: {
    flex: 1,
    gap: 3,
    justifyContent: 'center',
  },
});
