import { useFormContext } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import FancyButton from '../../../buttons/FancyButton';
import { MinVoluntarioFuncaoModalFormData } from '../../../../domain/schemas/ministerioVoluntariosSchema';
import { DropDownItemProps } from '../../../fields/FancyDropDownItem';
import { useMemo } from 'react';
import { EnumUtils } from '../../../../utils/enum_utils';
import {
  EscalaTemplateExperienciaEnum,
  EscalaTemplateExperienciaLabel,
} from '../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import ControlledSearchSelect from '../../../forms/ControlledSearchSelect';
import ControlledBottomSheetSelect from '../../../forms/ControlledBottomSheetSelect';

interface IntegranteFormModalProps {
  funcoesDropDownList?: DropDownItemProps<string>[];
  mode: 'add' | 'edit';
  visible: boolean;
  title?: string;
  onButton1Press?: () => void;
  onButton2Press?: () => void;
}

export default function IntegranteFormModal({
  funcoesDropDownList,
  mode,
  visible,
  title,
  onButton1Press,
  onButton2Press,
}: IntegranteFormModalProps) {
  const { control } = useFormContext<MinVoluntarioFuncaoModalFormData>();

  const experiencaList = useMemo<DropDownItemProps<EscalaTemplateExperienciaEnum>[]>(() => {
    return EnumUtils.getDropDownItems(
      EscalaTemplateExperienciaEnum,
      EscalaTemplateExperienciaLabel,
    ).sort(
      (a, b) => Number(a.value) - Number(b.value),
    ) as DropDownItemProps<EscalaTemplateExperienciaEnum>[];
  }, []);

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={() => onButton1Press?.()}
      title={title}
      footer={
        <View style={styles.buttonsRow}>
          <FancyButton
            label='Cancelar'
            type='outlined'
            onPress={onButton1Press}
            containerStyle={styles.button}
          />
          <FancyButton label='Confirmar' onPress={onButton2Press} containerStyle={styles.button} />
        </View>
      }
    >
      <ControlledSearchSelect
        name='id'
        label={mode === 'add' ? 'Funções' : 'Função'}
        control={control}
        listItems={funcoesDropDownList}
        disabled={mode === 'edit'}
        multiSelect={mode === 'add'}
        searchPlaceholder='Buscar função...'
      />
      <ControlledBottomSheetSelect
        control={control}
        name='experiencia'
        label='Experiência'
        listItems={experiencaList}
      />
    </FancyBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 36,
  },
});
