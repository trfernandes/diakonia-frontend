import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { EscalaTemplateFuncaoFormData } from '../../../../domain/schemas/escalaTemplateSchema';
import { DropDownItemProps } from '../../../fields/FancyDropDownItem';
import FancySearchSelect from '../../../fields/FancySearchSelect';
import FancyErrorText from '../../../forms/FancyErrorText';
import ControlledBottomSheetSelect from '../../../forms/ControlledBottomSheetSelect';
import ControlledFancyToggle from '../../../forms/ControlledFancyToggle';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import FancyButton from '../../../buttons/FancyButton';
import FancyText from '../../../FancyText';
import FancyInfoNote from '../../../FancyInfoNote';
import { useMemo } from 'react';
import { EnumUtils } from '../../../../utils/enum_utils';
import { usePallete } from '../../../../hooks/usePallete';
import {
  EscalaTemplateExperienciaEnum,
  EscalaTemplateExperienciaLabel,
} from '../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import {
  EscalaTemplateComparacaoExperienciaEnum,
  EscalaTemplateComparacaoExperienciaLabel,
} from '../../../../domain/enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';
import ControlledNumberInput from '../../../forms/ControlledNumberInput';

interface TemplateFuncoesFormProps {
  mode: 'add' | 'edit';
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  funcoesList?: DropDownItemProps<string>[];
}

export default function TemplateFuncoesForm({
  mode = 'add',
  visible,
  onClose,
  onConfirm,
  funcoesList,
}: TemplateFuncoesFormProps) {
  const { control } = useFormContext<EscalaTemplateFuncaoFormData>();
  const apenasJaEscalado = useWatch({ control, name: 'apenasJaEscalado' });
  const sortedFuncoesList = useMemo(
    () =>
      [...(funcoesList ?? [])].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', 'pt-BR', {
          sensitivity: 'base',
        }),
      ),
    [funcoesList],
  );

  const experiencaList = useMemo<DropDownItemProps<EscalaTemplateExperienciaEnum>[]>(() => {
    return EnumUtils.getDropDownItems(
      EscalaTemplateExperienciaEnum,
      EscalaTemplateExperienciaLabel,
    ).sort(
      (a, b) => Number(a.value) - Number(b.value),
    ) as DropDownItemProps<EscalaTemplateExperienciaEnum>[];
  }, []);

  const comparacaoExperienciaList = useMemo<
    DropDownItemProps<EscalaTemplateComparacaoExperienciaEnum>[]
  >(() => {
    return EnumUtils.getDropDownItems(
      EscalaTemplateComparacaoExperienciaEnum,
      EscalaTemplateComparacaoExperienciaLabel,
    ) as DropDownItemProps<EscalaTemplateComparacaoExperienciaEnum>[];
  }, []);

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={mode === 'add' ? 'Adicionar Função' : 'Editar Função'}
      footer={
        <View style={styles.buttonsRow}>
          <FancyButton
            label='Cancelar'
            type='outlined'
            onPress={onClose}
            containerStyle={styles.button}
          />
          <FancyButton label='Confirmar' onPress={onConfirm} containerStyle={styles.button} />
        </View>
      }
    >
      <View style={{ gap: 15 }}>
        <Controller
          control={control}
          name='funcaoIds'
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <View style={{ gap: 5 }}>
              <FancySearchSelect<string>
                label='Funções aceitas'
                placeholder='Selecione uma ou mais funções...'
                listItems={sortedFuncoesList}
                value={value ?? []}
                onChange={(selected) => onChange(selected)}
                multiSelect
                searchPlaceholder='Buscar função...'
              />
              {error && <FancyErrorText message={error.message!} />}
            </View>
          )}
        />
        <ControlledBottomSheetSelect
          control={control}
          name='experiencia'
          label='Experiência'
          listItems={experiencaList}
        />
        <ControlledBottomSheetSelect
          control={control}
          name='comparacaoExperiencia'
          label='Comparação de experiência'
          listItems={comparacaoExperienciaList}
        />
        <ControlledNumberInput
          control={control}
          name='quantidade'
          title='Quantidade'
          min={1}
          max={10}
        />
        <View>
          <ControlledFancyToggle
            control={control}
            name='apenasJaEscalado'
            label='Restringir a quem já está escalado'
            option1={{ title: 'Não', value: false }}
            option2={{ title: 'Sim', value: true }}
          />
          {apenasJaEscalado && (
            <FancyInfoNote containerStyle={styles.infoNote}>
              Ativado: essa vaga fica reservada. A geração automática de escala só escala aqui
              quem já ganhou outra função nesta mesma Ocorrência — útil pra vaga extra (ex.: solo,
              apoio) que só faz sentido se a pessoa já estiver no evento. Não afeta atribuição
              manual.
            </FancyInfoNote>
          )}
        </View>
      </View>
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
  infoNote: {
    marginTop: 8,
  },
});
