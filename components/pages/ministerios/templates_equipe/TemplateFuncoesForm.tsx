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
import DefaultIcons from '../../../FancyIcons';
import { useMemo } from 'react';
import { EnumUtils } from '../../../../utils/enum_utils';
import { usePallete } from '../../../../hooks/usePallete';
import { ColorUtils } from '../../../../utils/color_utils';
import {
  EscalaTemplateExperienciaEnum,
  EscalaTemplateExperienciaLabel,
} from '../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import { EscalaTemplateComparacaoExperienciaEnum } from '../../../../domain/enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';
import ControlledNumberInput from '../../../forms/ControlledNumberInput';
import FancySegmentedControl from '../../../fields/FancySegmentedControl';

const EXPERIENCIA_ORDER: EscalaTemplateExperienciaEnum[] = [
  EscalaTemplateExperienciaEnum.Iniciante,
  EscalaTemplateExperienciaEnum.Intermediario,
  EscalaTemplateExperienciaEnum.Avancado,
];

function joinPt(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  if (labels.length === 2) return `${labels[0]} ou ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} ou ${labels[labels.length - 1]}`;
}

function buildComparacaoHelperText(
  comparacao: EscalaTemplateComparacaoExperienciaEnum,
  experienciaMinima: EscalaTemplateExperienciaEnum,
): string {
  const minimaLabel = EscalaTemplateExperienciaLabel[experienciaMinima];

  if (comparacao === EscalaTemplateComparacaoExperienciaEnum.Igual) {
    return `Serão escalados somente voluntários com experiência exatamente ${minimaLabel} nesta função.`;
  }

  const minIndex = EXPERIENCIA_ORDER.indexOf(experienciaMinima);
  const included =
    comparacao === EscalaTemplateComparacaoExperienciaEnum.MenorIgual
      ? EXPERIENCIA_ORDER.slice(0, minIndex + 1)
      : EXPERIENCIA_ORDER.slice(minIndex);
  const excluded =
    comparacao === EscalaTemplateComparacaoExperienciaEnum.MenorIgual
      ? EXPERIENCIA_ORDER.slice(minIndex + 1)
      : EXPERIENCIA_ORDER.slice(0, minIndex);

  const includedText = joinPt(included.map((e) => EscalaTemplateExperienciaLabel[e]));

  if (included.length <= 1 || excluded.length === 0) {
    return `Serão escalados voluntários com experiência ${includedText} nesta função.`;
  }

  const excludedText = joinPt(excluded.map((e) => EscalaTemplateExperienciaLabel[e]));
  const quem = excluded.length === 1 ? `quem já é ${excludedText}` : `quem é ${excludedText}`;
  return `Serão escalados voluntários com experiência ${includedText} nesta função — ${quem} não entra nessa vaga.`;
}

const COMPARACAO_OPTIONS: { label: string; value: EscalaTemplateComparacaoExperienciaEnum }[] = [
  { label: '≤  Menor ou igual', value: EscalaTemplateComparacaoExperienciaEnum.MenorIgual },
  { label: '=  Igual', value: EscalaTemplateComparacaoExperienciaEnum.Igual },
  { label: '≥  Maior ou igual', value: EscalaTemplateComparacaoExperienciaEnum.MaiorIgual },
];

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
  const palette = usePallete();
  const apenasJaEscalado = useWatch({ control, name: 'apenasJaEscalado' });
  const experiencia = useWatch({ control, name: 'experiencia' });
  const comparacaoExperiencia = useWatch({ control, name: 'comparacaoExperiencia' });
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
        <View>
          <Controller
            control={control}
            name='comparacaoExperiencia'
            render={({ field: { value, onChange } }) => (
              <FancySegmentedControl
                label='Comparação de experiência'
                options={COMPARACAO_OPTIONS}
                value={value}
                onChange={onChange}
              />
            )}
          />
          {experiencia && comparacaoExperiencia && (
            <View
              style={[
                styles.infoCard,
                { backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12) },
              ]}
            >
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='information-outline'
                size={16}
                color={palette.primary}
              />
              <FancyText size='extraSmall' type='medium' style={styles.infoCardText}>
                {buildComparacaoHelperText(comparacaoExperiencia, experiencia)}
              </FancyText>
            </View>
          )}
        </View>
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
            <View
              style={[
                styles.infoCard,
                { backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12) },
              ]}
            >
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='information-outline'
                size={16}
                color={palette.primary}
              />
              <FancyText size='extraSmall' type='medium' style={styles.infoCardText}>
                Ativado: essa vaga fica reservada. A geração automática de escala só escala aqui
                quem já ganhou outra função nesta mesma Ocorrência — útil pra vaga extra (ex.: solo,
                apoio) que só faz sentido se a pessoa já estiver no evento. Não afeta atribuição
                manual.
              </FancyText>
            </View>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  infoCardText: {
    flex: 1,
    lineHeight: 16,
  },
});
