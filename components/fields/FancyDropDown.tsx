import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { FancyTextInputProps } from './FancyTextInput';
import { DropDownItemProps } from './FancyDropDownItem';
import { Dropdown } from 'react-native-element-dropdown';
import {
  BOLD_FONT,
  ITALIC_SEMI_BOLD_FONT,
  MEDIUM_FONT,
  SMALL_SIZE_FONT,
} from '../../constants/font';
import { ThemePalette } from '../../constants/colors';
import { useCallback } from 'react';
import { ColorUtils } from '../../utils/color_utils';
import FancyText from '../FancyText';
import FancyImage from '../images/FancyImage';
import { ImageUtils } from '../../utils/image_utils';
import { DefaultIconsNames } from '../../constants/icons';
import DefaultIcons from '../FancyIcons';
import { usePallete } from '../../hooks/usePallete';
import { useThemedStyles } from '../../hooks/useThemedStyles';

export interface FancyDropDownProps<T>
  extends
    Pick<FancyTextInputProps, 'disabled' | 'label' | 'placeholder' | 'inputContainerStyle'>,
    Pick<TextInputProps, 'onBlur'> {
  listItems: DropDownItemProps<T>[] | undefined;
  containerStyle?: StyleProp<ViewStyle>;
  value?: T;
  onChange?: (value: T) => void;
  isLoading?: boolean;
  dropdownPosition?: 'auto' | 'top' | 'bottom';
  renderMode?: 'default' | 'modal' | 'portal';
  inverted?: boolean;
}

export default function FancyDropDown<ValueItem>({
  listItems,
  placeholder,
  isLoading,
  disabled,
  label,
  value,
  onChange,
  containerStyle,
  dropdownPosition = 'auto',
  renderMode,
  inverted = false,
}: FancyDropDownProps<ValueItem>) {
  const Pallete = usePallete();
  const styles = useThemedStyles(createStyles);
  const activeColor = ColorUtils.lightenColor(Pallete.primary, 0.7);

  const renderItem = useCallback(
    (item: DropDownItemProps<ValueItem>, selected?: boolean) => {
      return (
        <View style={styles.itemContainer}>
          {item.left && item.left.type === 'image' && item.left.source && (
            <FancyImage
              size={30}
              source={
                ImageUtils.normalizeImageSource(item.left?.source) ??
                (typeof item.left?.source === 'string'
                  ? { uri: item.left?.source }
                  : item.left?.source)
              }
            />
          )}
          <FancyText style={styles.itemText}>{item.title}</FancyText>
        </View>
      );
    },
    [styles],
  );

  const renderRightIcon = useCallback(() => {
    return isLoading ? (
      <ActivityIndicator size={'small'} color={Pallete.primary} />
    ) : (
      <DefaultIcons.Custom
        library={DefaultIconsNames['chevron-down'].library}
        name={DefaultIconsNames['chevron-down'].name}
        size={16}
        color={Pallete.icons.inactive}
      />
    );
  }, [isLoading, Pallete]);

  const innerDisabled = disabled || isLoading || listItems?.length === 0;
  const dropdownMode = renderMode === 'portal' ? 'modal' : renderMode;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <FancyText size={'extraSmall'} type='semiBold' color={Pallete.fonts.inactive}>
          {label}
        </FancyText>
      )}
      <Dropdown
        data={listItems || []}
        disable={innerDisabled}
        onChange={({ value }) => onChange?.(value)}
        labelField={'title'}
        valueField={'value'}
        renderItem={renderItem}
        fontFamily={MEDIUM_FONT}
        containerStyle={styles.listContainer}
        style={[styles.inputContainer, innerDisabled && { backgroundColor: Pallete.disabled }]}
        selectedTextStyle={[
          styles.selectedText,
          innerDisabled && { color: Pallete.fonts.inactive },
        ]}
        activeColor={activeColor}
        dropdownPosition={dropdownPosition}
        mode={dropdownMode}
        inverted={inverted}
        value={value}
        placeholder={placeholder || !innerDisabled ? 'Selecione...' : 'Nenhum item disponível'}
        placeholderStyle={styles.placeholder}
        renderRightIcon={renderRightIcon}
      />
    </View>
  );
}

function createStyles(Pallete: ThemePalette) {
  return StyleSheet.create({
    container: { gap: 5 },
    listContainer: {
      borderWidth: 1,
      borderColor: Pallete.border,
      borderRadius: 10,
      backgroundColor: Pallete.backgroundColor,
    },
    inputContainer: {
      backgroundColor: Pallete.backgroundColor,
      borderWidth: 0.6,
      borderColor: Pallete.border,
      borderRadius: 10,
      minHeight: 44,
      padding: 11,
      ...Pallete.shadows[200],
    },
    itemText: { fontFamily: MEDIUM_FONT, fontSize: SMALL_SIZE_FONT, color: Pallete.fonts.dark },
    itemContainer: {
      flexDirection: 'row',
      padding: 10,
      paddingHorizontal: 12,
      gap: 10,
      borderRadius: 10,
    },
    placeholder: {
      fontFamily: ITALIC_SEMI_BOLD_FONT,
      fontSize: SMALL_SIZE_FONT,
      opacity: 0.8,
      color: Pallete.fonts.inactive,
    },
    selectedText: { fontFamily: BOLD_FONT, fontSize: SMALL_SIZE_FONT, color: Pallete.fonts.dark },
  });
}
