import React, { useCallback, useMemo, useState } from 'react';
import { usePallete } from '../../../../../hooks/usePallete';
import { DefaultIconsNames } from '../../../../../constants/icons';
import { FancyCard } from '../../../../cards/Horizontal/FancyCard';
import FancyContainerList from '../../../../container_list/FancyContainerList';
import EventoFormFuncaoModal from './EventoFormFuncaoModal';
import { FieldArrayWithId, useFieldArray, useFormContext } from 'react-hook-form';
import { DropDownItemProps } from '../../../../fields/FancyDropDownItem';
import {
  EscalaEventoTemplateFormData,
  EscalaEventoTemplateFuncaoFormData,
} from '../../../../../domain/schemas/escalaSchema';
import { FancyAlert } from '../../../../modal/FancyAlert';
import { ResponseMinisterioFuncaoDto } from '../../../../../domain/dtos/MinisterioFuncao/ministerio-funcao.response';
import { EscalaTemplateExperienciaLabel } from '../../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import {
  EscalaTemplateComparacaoExperienciaEnum,
  EscalaTemplateComparacaoExperienciaLabel,
} from '../../../../../domain/enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';

interface EscalaFormFuncaoListProps {
  ministerioId: string;
  funcoesList: ResponseMinisterioFuncaoDto[];
  funcoesDropDownList: DropDownItemProps<string>[];
}

export const EscalaFormFuncaoList = React.memo(function EscalaFormFuncaoList({
  ministerioId,
  funcoesList,
}: EscalaFormFuncaoListProps) {
  const Pallete = usePallete();
  const [equipeFormModalProps, setEquipeFormModalProps] = useState<{
    visible: boolean;
    mode: 'add' | 'edit';
    data?: EscalaEventoTemplateFuncaoFormData;
    index?: number;
  } | null>();

  const formTemplate = useFormContext<EscalaEventoTemplateFormData>();

  const funcoesArray = useFieldArray({
    control: formTemplate.control,
    name: 'funcoes',
    keyName: 'funKey',
  });

  // A mesma função pode ser alternativa em mais de uma vaga — não excluir funções já usadas.
  const funcoesSelectionList = useMemo<DropDownItemProps<string>[]>(() => {
    if (!funcoesList?.length) return [];

    return funcoesList
      .filter((f) => f.id)
      .map((ff) => ({
        title: ff.nome,
        value: ff.id!,
      }));
  }, [funcoesList]);

  const handleAddFuncao = useCallback(
    (data: EscalaEventoTemplateFuncaoFormData) => {
      funcoesArray.append(data);
    },
    [funcoesArray],
  );

  const handleEditFuncao = useCallback(
    (data: EscalaEventoTemplateFuncaoFormData, index: number) => {
      funcoesArray.update(index, data);
    },
    [funcoesArray],
  );

  const handleDeleteFuncao = useCallback(
    (item: FieldArrayWithId<EscalaEventoTemplateFormData, 'funcoes', 'funKey'>) => {
      FancyAlert.alert('Exclusão', `Deseja realmente excluir a função?`, [
        {
          text: 'Não',
          style: 'destructive',
        },
        {
          text: 'Sim',
          style: 'default',
          onPress: () => {
            const index = funcoesArray.fields.findIndex((f) => f.funKey === item.funKey);
            if (index >= 0) {
              funcoesArray.remove(index);
            }
          },
        },
      ]);
    },
    [funcoesArray],
  );

  const handleResetFuncoes = useCallback(() => {
    FancyAlert.alert('Exclusão', `Deseja realmente excluir todas as funções?`, [
      {
        text: 'Não',
        style: 'destructive',
      },
      {
        text: 'Sim',
        style: 'default',
        onPress: () => {
          funcoesArray.replace([]);
        },
      },
    ]);
  }, [funcoesArray]);

  const funcoesNomeMap = useMemo(
    () => new Map(funcoesList.map((funcao) => [funcao.id, funcao.nome ?? ''])),
    [funcoesList],
  );

  const nomesDaVaga = useCallback(
    (funcaoIds: string[]) => funcaoIds.map((id) => funcoesNomeMap.get(id) ?? '').join(' ou '),
    [funcoesNomeMap],
  );

  const sortedFuncoesFields = useMemo(() => {
    if (!funcoesArray.fields.length) return [];

    return [...funcoesArray.fields].sort((a, b) =>
      nomesDaVaga(a.funcaoIds).localeCompare(nomesDaVaga(b.funcaoIds), 'pt-BR', {
        sensitivity: 'base',
      }),
    );
  }, [funcoesArray.fields, nomesDaVaga]);

  return (
    <>
      <FancyContainerList
        title={'Equipe'}
        virtualized={false}
        contentContainerStyle={{ paddingTop: 5 }}
        data={sortedFuncoesFields}
        keyExtractor={({ funKey }) => funKey}
        renderItem={({ item }) => {
          const comparacaoLabel =
            item.comparacaoExperiencia === EscalaTemplateComparacaoExperienciaEnum.Igual
              ? EscalaTemplateComparacaoExperienciaLabel[item.comparacaoExperiencia].toLowerCase()
              : null;
          return (
            <FancyCard.Simple
              title={nomesDaVaga(item.funcaoIds)}
              subtitle={`${comparacaoLabel ? `${comparacaoLabel} a ` : ''}${EscalaTemplateExperienciaLabel[item.experiencia]} · Qtd. ${item.quantidade}`}
              containerStyle={{ paddingVertical: 6 }}
              contentContainerStyle={{ paddingVertical: 0, gap: 4 }}
              actionButtons={[
                {
                  size: 'small',
                  icon: { ...DefaultIconsNames.edit, size: 15 },
                  onPress: () => {
                    const index = funcoesArray.fields.findIndex((f) => f.funKey === item.funKey);
                    setEquipeFormModalProps({ mode: 'edit', visible: true, data: item, index });
                  },
                },
                {
                  size: 'small',
                  icon: { ...DefaultIconsNames.delete, size: 15, backgroundColor: Pallete.error },
                  onPress: () => handleDeleteFuncao(item),
                },
              ]}
            />
          );
        }}
        buttons={[
          {
            icon: { ...DefaultIconsNames.add, size: 18 },
            onPress: () => setEquipeFormModalProps({ visible: true, mode: 'add', data: undefined }),
          },
          {
            icon: { ...DefaultIconsNames['list-clear'], size: 16, style: { paddingLeft: 2 } },
            onPress: handleResetFuncoes,
            tone: 'destructive',
          },
        ]}
      />
      <EventoFormFuncaoModal
        visible={!!equipeFormModalProps?.visible}
        mode={equipeFormModalProps?.mode ?? 'add'}
        funcoesSelectionList={funcoesSelectionList}
        data={equipeFormModalProps?.data}
        funcoesExistentes={funcoesArray.fields}
        editingIndex={equipeFormModalProps?.index}
        onClose={() => setEquipeFormModalProps(null)}
        onSubmit={(data) => {
          if (equipeFormModalProps?.mode === 'edit' && equipeFormModalProps.index != null) {
            handleEditFuncao(data, equipeFormModalProps.index);
          } else {
            handleAddFuncao(data);
          }
          setEquipeFormModalProps(null);
        }}
      />
    </>
  );
});
