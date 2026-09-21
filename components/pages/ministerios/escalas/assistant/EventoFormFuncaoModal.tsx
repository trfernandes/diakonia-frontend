import { useEffect } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LARGE_MEDIUM_SIZE_FONT } from '../../../../../constants/font';
import FancyBottomSheetModal from '../../../../modal/FancyBottomSheetModal';
import FancyButton from '../../../../buttons/FancyButton';
import FancyChips from '../../../../FancyChips';
import FancyText from '../../../../FancyText';
import { usePallete } from '../../../../../hooks/usePallete';
import FancySearchSelect from '../../../../fields/FancySearchSelect';
import FancyErrorText from '../../../../forms/FancyErrorText';
import ControlledBottomSheetSelect from '../../../../forms/ControlledBottomSheetSelect';
import { EnumUtils } from '../../../../../utils/enum_utils';
import {
  EscalaEventoTemplateFuncaoFormData,
  EscalaEventoTemplateFuncaoSchema,
} from '../../../../../domain/schemas/escalaSchema';
import { strfyObj } from '../../../../../utils/text_utils';
import { DropDownItemProps } from '../../../../fields/FancyDropDownItem';
import {
  EscalaTemplateExperienciaEnum,
  EscalaTemplateExperienciaLabel,
} from '../../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import {
  EscalaTemplateComparacaoExperienciaEnum,
  EscalaTemplateComparacaoExperienciaLabel,
} from '../../../../../domain/enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';

export interface EventoFormFuncaoModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  data?: EscalaEventoTemplateFuncaoFormData;
  funcoesSelectionList: DropDownItemProps<string>[];
  // Demais vagas já configuradas nesse evento — usado só pra bloquear combinação duplicada.
  funcoesExistentes?: EscalaEventoTemplateFuncaoFormData[];
  editingIndex?: number;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (data: EscalaEventoTemplateFuncaoFormData) => void;
}

export default function EventoFormFuncaoModal({
  visible,
  mode,
  data,
  funcoesSelectionList,
  funcoesExistentes = [],
  editingIndex,
  isSaving,
  onClose,
  onSubmit,
}: EventoFormFuncaoModalProps) {
  const palette = usePallete();
  const defaultValues = {
    quantidade: 1,
    comparacaoExperiencia: EscalaTemplateComparacaoExperienciaEnum.MaiorIgual,
  };
  const form = useForm<EscalaEventoTemplateFuncaoFormData>({
    resolver: zodResolver(EscalaEventoTemplateFuncaoSchema),
    defaultValues: data || defaultValues,
  });

  useEffect(() => {
    if (!visible) return;
    form.reset(data || defaultValues);
  }, [visible, data]);

  const handleConfirm = () => {
    form.handleSubmit(
      (values) => {
        // A mesma função pode se repetir em vagas diferentes — só a combinação exata não pode.
        const combo = [...values.funcaoIds].sort().join('|');
        const duplicateIndex = funcoesExistentes.findIndex(
          (item) => [...item.funcaoIds].sort().join('|') === combo,
        );

        if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
          form.setError('funcaoIds', { message: 'Essa combinação de funções já foi adicionada.' });
          return;
        }

        onSubmit(values);
      },
      (errors) => console.log('Erro no formulário de adição de equipe', strfyObj(errors)),
    )();
  };

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={mode === 'add' ? 'Nova Função' : 'Editar Função'}
      footer={
        <FancyButton
          label={mode === 'add' ? 'Adicionar' : 'Salvar'}
          type='contained'
          isLoading={isSaving}
          onPress={handleConfirm}
          containerStyle={{ marginBottom: 8 }}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <Controller
          control={form.control}
          name='funcaoIds'
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <View style={{ gap: 5 }}>
              <FancySearchSelect<string>
                label='Funções aceitas'
                placeholder='Selecione uma ou mais funções...'
                listItems={funcoesSelectionList}
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
          control={form.control}
          name='experiencia'
          label='Experiência'
          listItems={EnumUtils.getDropDownItems(
            EscalaTemplateExperienciaEnum,
            EscalaTemplateExperienciaLabel,
          )}
        />
        <ControlledBottomSheetSelect
          control={form.control}
          name='comparacaoExperiencia'
          label='Comparação de experiência'
          listItems={EnumUtils.getDropDownItems(
            EscalaTemplateComparacaoExperienciaEnum,
            EscalaTemplateComparacaoExperienciaLabel,
          )}
        />
        <Controller
          control={form.control}
          name='quantidade'
          render={({ field: { value, onChange } }) => {
            const base = [1, 2, 3, 4, 5, 6];
            const options = value && value > 6 ? [...base, value] : base;
            return (
              <View style={{ gap: 8 }}>
                <FancyText type='semiBold' size='small' color={palette.fonts.inactive}>
                  Quantidade
                </FancyText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {options.map((n) => {
                    const selected = value === n;
                    return (
                      <FancyChips
                        key={n}
                        label={String(n)}
                        onPress={() => onChange(n)}
                        outlined={!selected}
                        color={selected ? palette.fonts.light : palette.fonts.inactive}
                        backgroundColor={selected ? palette.primary : undefined}
                        style={{
                          minWidth: 46,
                          minHeight: 44,
                          paddingHorizontal: 14,
                          justifyContent: 'center',
                        }}
                        labelProps={{ style: { fontSize: LARGE_MEDIUM_SIZE_FONT } }}
                      />
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      </View>
    </FancyBottomSheetModal>
  );
}
