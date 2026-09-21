import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FormProvider, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import { DefaultIconsNames } from '../../../../constants/icons';

import {
  EscalaTemplateFormData,
  EscalaTemplateFuncaoFormData,
  escalaTemplateFuncaoSchema,
} from '../../../../domain/schemas/escalaTemplateSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import TemplateFuncoesForm from './TemplateFuncoesForm';
import { DropDownItemProps } from '../../../fields/FancyDropDownItem';
import Toast from 'react-native-toast-message';
import { FancyAlert } from '../../../modal/FancyAlert';
import { EscalaTemplateExperienciaLabel } from '../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import { EscalaTemplateExperienciaEnum } from '../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import {
  EscalaTemplateComparacaoExperienciaEnum,
  EscalaTemplateComparacaoExperienciaLabel,
} from '../../../../domain/enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';
import { useFuncoesDoMinisterio } from '../../../../hooks/useFuncoesDoMinisterio';
import FancyLoading from '../../../FancyLoading';
import { usePallete } from '../../../../hooks/usePallete';
import FancyText from '../../../FancyText';
import FancyButton from '../../../buttons/FancyButton';
import FancyListItemCard from '../../../cards/FancyListItemCard';
import FancyListEmpty from '../../../list/FancyListEmpty';
import FancyActionSheet from '../../../actions/FancyActionSheet';

interface TemplateFuncoesListProps {
  disabled?: boolean;
  funcoesList?: DropDownItemProps<string>[];
  ministerioId: string;
}

const FORM_DEFAULT_VALUES: Partial<EscalaTemplateFuncaoFormData> = {
  experiencia: EscalaTemplateExperienciaEnum.Iniciante,
  comparacaoExperiencia: EscalaTemplateComparacaoExperienciaEnum.MaiorIgual,
  quantidade: 1,
};

export default function TemplateFuncoesList({
  disabled = false,
  funcoesList = [] as DropDownItemProps<string>[],
  ministerioId,
}: TemplateFuncoesListProps) {
  const palette = usePallete();
  const { control, watch } = useFormContext<EscalaTemplateFormData>();
  const {
    append: addFuncao,
    update: updateFuncao,
    remove: removeFuncao,
  } = useFieldArray({ control, name: 'funcoes' });
  const funcoesWatch = watch('funcoes') ?? [];

  const [formParams, setFormParams] = useState<{ visible: boolean; mode: 'add' | 'edit' }>();
  // índice da função sendo editada — usado para atualizar a linha correta no field array,
  // em vez de localizar por funcaoId (que quebra ao trocar a função durante a edição)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [actionsItem, setActionsItem] = useState<{
    item: EscalaTemplateFuncaoFormData;
    index: number;
  } | null>(null);
  const formAdd = useForm<EscalaTemplateFuncaoFormData>({
    resolver: zodResolver(escalaTemplateFuncaoSchema),
    defaultValues: FORM_DEFAULT_VALUES,
  });

  const { funcoesList: funcoesDataList, isLoading: isLoadingFuncoes } =
    useFuncoesDoMinisterio(ministerioId);

  const handleOpen = useCallback(
    (mode: 'add' | 'edit') => {
      if (disabled) {
        return;
      }
      setEditingIndex(null);
      formAdd.reset(FORM_DEFAULT_VALUES);
      setFormParams({ visible: true, mode });
    },
    [disabled, formAdd],
  );

  const handleConfirm = useCallback(
    (mode: 'add' | 'edit') => {
      if (disabled) {
        return;
      }
      formAdd.handleSubmit((data) => {
        // o backend exige combinação de funcaoIds única por vaga (@ArrayUnique) — a mesma
        // função pode se repetir em vagas diferentes, só a combinação exata não pode repetir
        const combo = [...data.funcaoIds].sort().join('|');
        const duplicateIndex = funcoesWatch.findIndex(
          (item) => [...item.funcaoIds].sort().join('|') === combo,
        );

        if (mode === 'add') {
          if (duplicateIndex !== -1) {
            formAdd.setError('funcaoIds', {
              message: 'Essa combinação de funções já foi adicionada.',
            });
            return;
          }

          addFuncao({
            id: data.id,
            funcaoIds: data.funcaoIds,
            experiencia: data.experiencia,
            comparacaoExperiencia: data.comparacaoExperiencia,
            quantidade: data.quantidade,
          });
        } else if (mode === 'edit') {
          if (editingIndex == null) {
            return;
          }
          // impede colisão com OUTRA linha ao trocar as funções durante a edição
          if (duplicateIndex !== -1 && duplicateIndex !== editingIndex) {
            formAdd.setError('funcaoIds', {
              message: 'Essa combinação de funções já foi adicionada.',
            });
            return;
          }

          updateFuncao(editingIndex, { ...data });
        }

        setEditingIndex(null);
        setFormParams({ visible: false, mode: 'add' });
        formAdd.reset(FORM_DEFAULT_VALUES);
      })();
    },
    [addFuncao, disabled, editingIndex, formAdd, funcoesWatch, updateFuncao],
  );

  const handleEdit = useCallback(
    (index: number) => {
      if (disabled) {
        return;
      }
      const entry = funcoesWatch[index];
      if (!entry) {
        return;
      }

      setEditingIndex(index);
      formAdd.reset({ ...entry });
      setFormParams({ visible: true, mode: 'edit' });
    },
    [disabled, formAdd, funcoesWatch],
  );

  const handleRemove = useCallback(
    (index: number) => {
      if (disabled) {
        return;
      }
      const entry = funcoesWatch[index];
      if (!entry) {
        return;
      }

      FancyAlert.alert('Confirmar remoção', `Tem certeza que deseja remover a função?`, [
        { text: 'Não', style: 'destructive' },
        {
          text: 'Sim',
          onPress: () => {
            removeFuncao(index);
            Toast.show({
              type: 'success',
              text1: 'Função removida com sucesso!',
            });
          },
        },
      ]);
    },
    [disabled, funcoesWatch, removeFuncao],
  );

  if (isLoadingFuncoes) return <FancyLoading />;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <FancyText size='medium' type='bold' style={styles.headerTitle}>
          Formação da Equipe ({funcoesWatch.length})
        </FancyText>
        {!disabled && (
          <FancyButton
            mode='icon'
            type='contained'
            icon={{ ...DefaultIconsNames.add, size: 19, color: palette.icons.light }}
            onPress={() => handleOpen('add')}
            containerStyle={styles.addButton}
          />
        )}
      </View>

      {funcoesWatch.length > 0 ? (
        <View style={styles.listContent}>
          {funcoesWatch.map((item, index) => {
            const nomes = item.funcaoIds.map(
              (id) =>
                funcoesDataList.find((funcao) => funcao.id === id)?.nome ||
                item.funcoesAceitas?.find((fa) => fa.id === id)?.nome ||
                'Função não encontrada',
            );
            const funcaoNome = nomes.join(' ou ');
            const experienciaLabel = EscalaTemplateExperienciaLabel[item.experiencia];
            const comparacaoLabel =
              item.comparacaoExperiencia === EscalaTemplateComparacaoExperienciaEnum.Igual
                ? EscalaTemplateComparacaoExperienciaLabel[item.comparacaoExperiencia].toLowerCase()
                : null;
            return (
              <FancyListItemCard
                key={item.id ?? index}
                title={funcaoNome}
                subtitle={`${comparacaoLabel ? `${comparacaoLabel} a ` : ''}${experienciaLabel} · ${item.quantidade} ${item.quantidade === 1 ? 'pessoa' : 'pessoas'}`}
                leading={{ type: 'letter', letter: funcaoNome.charAt(0) }}
                trailing={
                  disabled
                    ? undefined
                    : { type: 'menu', onPress: () => setActionsItem({ item, index }) }
                }
              />
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <FancyListEmpty label='Nenhuma função cadastrada' />
        </View>
      )}

      <FancyActionSheet
        visible={!!actionsItem}
        onClose={() => setActionsItem(null)}
        actions={[
          {
            label: 'Editar',
            icon: { ...DefaultIconsNames.edit, size: 18 },
            onPress: () => {
              if (actionsItem) handleEdit(actionsItem.index);
            },
          },
          {
            label: 'Excluir',
            destructive: true,
            icon: { ...DefaultIconsNames.delete, size: 18 },
            onPress: () => {
              if (actionsItem) handleRemove(actionsItem.index);
            },
          },
        ]}
      />

      <FormProvider {...formAdd}>
        {formParams?.visible && (
          <TemplateFuncoesForm
            mode={formParams.mode}
            visible={formParams.visible}
            onClose={() => {
              setEditingIndex(null);
              formAdd.reset(FORM_DEFAULT_VALUES);
              setFormParams({ visible: false, mode: 'add' });
            }}
            onConfirm={() => handleConfirm(formParams.mode)}
            funcoesList={funcoesList}
          />
        )}
      </FormProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    flex: 1,
    opacity: 0.7,
  },
  addButton: {
    minHeight: 25,
    height: 25,
    minWidth: 25,
    width: 25,
  },
  listContent: {
    gap: 8,
  },
  emptyContainer: {
    minHeight: 120,
  },
});
