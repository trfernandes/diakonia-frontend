import { FormProvider, useFieldArray, useForm, useFormContext } from 'react-hook-form';
import ControlledSearchSelect from '../../../forms/ControlledSearchSelect';
import { StyleSheet, View } from 'react-native';
import { DefaultIconsNames } from '../../../../constants/icons';
import {
  MinVoluntarioFormData,
  MinVoluntarioFuncaoFormData,
  minVoluntarioFuncaoModalSchema,
} from '../../../../domain/schemas/ministerioVoluntariosSchema';
import { useMemo, useState } from 'react';
import IntegranteFormModal from './FormModal';
import { DropDownItemProps } from '../../../fields/FancyDropDownItem';
import { zodResolver } from '@hookform/resolvers/zod';
import FancyContainerList from '../../../container_list/FancyContainerList';
import FancyScrollView from '../../../FancyScrollView';
import FancySeparator from '../../../FancySeparator';
import FancyButton from '../../../buttons/FancyButton';
import FancyListEmpty from '../../../list/FancyListEmpty';
import FancyListItemCard from '../../../cards/FancyListItemCard';
import FancyActionSheet from '../../../actions/FancyActionSheet';
import { FancyCard } from '../../../cards/Horizontal/FancyCard';
import FancyImage from '../../../images/FancyImage';
import FancyText from '../../../FancyText';

import FancyChips from '../../../FancyChips';
import { ResponseMinisterioFuncaoDto } from '../../../../domain/dtos/MinisterioFuncao/ministerio-funcao.response';
import { EscalaTemplateExperienciaLabel } from '../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import {
  MinisterioVoluntarioStatusEnumLabel,
  MinisterioVoluntarioStatusEnumMap,
  MinisterioVoluntarioStatusEnum,
} from '../../../../domain/enums/MinisterioVoluntario/ministerio-voluntario-status.enum';
import { MinisterioVoluntarioFuncaoStatusEnum } from '../../../../domain/enums/MinisterioVoluntarioFuncao/ministerio-voluntario-funcao-status.enum';
import { AppImages } from '../../../../assets/app_images';
import { usePallete } from '../../../../hooks/usePallete';
import { ColorUtils } from '../../../../utils/color_utils';

export interface IntegranteFormFieldsProps {
  mode: 'add' | 'edit';
  voluntariosDropDownList?: DropDownItemProps<string>[];
  funcoesDropDownList?: DropDownItemProps<string>[];
  funcoesList: ResponseMinisterioFuncaoDto[];
  /**
   * Permite renderizar apenas uma seção do formulário (usado no wizard de adição).
   * Quando omitido, renderiza voluntário + funções (comportamento da tela de edição).
   */
  section?: 'voluntario' | 'funcoes';
}

export default function IntegranteFormFields({
  voluntariosDropDownList,
  funcoesDropDownList,
  funcoesList,
  mode,
  section,
}: IntegranteFormFieldsProps) {
  const palette = usePallete();
  //   console.log('IntegranteFormFields render', strfyObj({ voluntariosDropDownList, funcoesDropDownList, funcoesList, mode }));

  const [formModalOptions, setFormModalOptions] = useState<{
    visible: boolean;
    mode: 'add' | 'edit';
  }>({
    visible: false,
    mode: 'add',
  });

  const [actionsFuncao, setActionsFuncao] = useState<MinVoluntarioFuncaoFormData | null>(null);

  const { control, getValues } = useFormContext<MinVoluntarioFormData>();

  const {
    fields: fieldsFuncao,
    append,
    remove,
    update,
  } = useFieldArray({
    control,
    name: 'funcoes',
    keyName: 'fieldId',
  });

  const formModal = useForm({
    resolver: zodResolver(minVoluntarioFuncaoModalSchema),
  });

  const handleSave = formModal.handleSubmit((data) => {
    // console.log('Saving funcao data:', strfyObj({ data, funcoesList }));

    const current = getValues('funcoes') as MinVoluntarioFuncaoFormData[];
    const selectedIds = Array.isArray(data.id) ? data.id : [data.id];

    selectedIds.forEach((funcaoId) => {
      const findedFuncao = funcoesList.find((f) => f.id === funcaoId);
      const existingIndex = current.findIndex((f) => f.id === funcaoId);

      const newItem: MinVoluntarioFuncaoFormData = {
        id: funcaoId,
        experiencia: data.experiencia,
        nome: findedFuncao?.nome || 'Nome não encontrado',
      };

      if (existingIndex === -1) append(newItem);
      else update(existingIndex, newItem);
    });

    handleClearForm();
    setFormModalOptions({ visible: false, mode: 'add' });
  });

  const handleEdit = (data: MinVoluntarioFuncaoFormData) => {
    formModal.reset(data);
    setFormModalOptions({ visible: true, mode: 'edit' });
  };

  const handleDelete = (id: string) => {
    const index = fieldsFuncao.findIndex((f) => f.id === id);
    if (index !== -1) remove(index);
  };

  const handleToggleStatus = (item: MinVoluntarioFuncaoFormData) => {
    const index = fieldsFuncao.findIndex((f) => f.id === item.id);
    if (index === -1) return;
    const newStatus =
      item.status === MinisterioVoluntarioFuncaoStatusEnum.Inativo
        ? MinisterioVoluntarioFuncaoStatusEnum.Ativo
        : MinisterioVoluntarioFuncaoStatusEnum.Inativo;
    update(index, { ...item, status: newStatus });
  };

  const handleClearForm = () => {
    formModal.reset({ id: undefined, experiencia: undefined, nome: '' });
  };

  const notUsedFuncoesList = useMemo(() => {
    const funcoes =
      funcoesDropDownList?.filter((v) => !fieldsFuncao.some((f) => f.id === v.value)) || [];
    return funcoes;
  }, [funcoesDropDownList, fieldsFuncao]);

  const sortedFuncoesList = useMemo<MinVoluntarioFuncaoFormData[]>(() => {
    return [...fieldsFuncao].sort((a, b) => {
      const nomeA = a.nome?.toUpperCase() || '';
      const nomeB = b.nome?.toUpperCase() || '';
      return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
    });
  }, [fieldsFuncao]);

  const showVoluntario = section !== 'funcoes';
  const showFuncoes = section !== 'voluntario';

  const funcaoListItem = (item: MinVoluntarioFuncaoFormData) => {
    const isInativa = item.status === MinisterioVoluntarioFuncaoStatusEnum.Inativo;
    return (
      <FancyListItemCard
        key={item.id}
        title={item.nome}
        subtitle={EscalaTemplateExperienciaLabel[item.experiencia!]}
        leading={{ icon: { library: 'FontAwesome6', name: 'person-rays', size: 18 }, type: 'icon' }}
        status={
          isInativa ? (
            <FancyChips size='small' label='Inativa' color={palette.fonts.inactive} outlined />
          ) : undefined
        }
        contentStyle={isInativa ? styles.funcaoInativa : undefined}
        trailing={{ type: 'menu', onPress: () => setActionsFuncao(item) }}
      />
    );
  };

  const funcaoCardItem = (item: MinVoluntarioFuncaoFormData) => (
    <FancyCard.Image
      key={item.id}
      type='icon'
      props={{
        title: item.nome,
        subtitle: EscalaTemplateExperienciaLabel[item.experiencia!],
        containerStyle: styles.funcaoCard,
        contentContainerStyle: styles.funcaoCardContent,
        centerContainerStyle: styles.funcaoCardCenter,
        cardIcon: {
          library: 'FontAwesome6',
          name: 'person-rays',
          size: 18,
        },
        actionButtons: [
          {
            icon: {
              ...DefaultIconsNames.edit,
              size: 17,
              color: palette.primary,
              backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12),
            },
            onPress: () => handleEdit(item),
          },
          {
            icon: {
              ...DefaultIconsNames.delete,
              size: 18,
              color: palette.error,
              backgroundColor: ColorUtils.withAlpha(palette.error, 0.12),
            },
            onPress: () => handleDelete(item.id),
          },
        ],
      }}
    />
  );

  return (
    <View style={[styles.root, styles.rootFlex]}>
      {mode === 'edit' ? (
        <>
          <View style={styles.heroSection}>
            <FancyImage
              source={
                getValues('voluntarioFoto')
                  ? { uri: getValues('voluntarioFoto') }
                  : AppImages.emptyProfile
              }
              size={72}
            />
            <FancyText size='large' type='bold' style={styles.heroName} numberOfLines={1}>
              {getValues('voluntarioNome')}
            </FancyText>
            <FancyText
              size='small'
              type='medium'
              style={styles.heroEmail}
              numberOfLines={1}
              ellipsizeMode='middle'
            >
              {getValues('voluntarioEmail')}
            </FancyText>
            {getValues('voluntarioStatus') && (
              <FancyChips
                size='small'
                style={styles.heroStatusChip}
                label={
                  MinisterioVoluntarioStatusEnumLabel[
                    MinisterioVoluntarioStatusEnumMap[getValues('voluntarioStatus')!]
                  ]
                }
                color={
                  MinisterioVoluntarioStatusEnumMap[getValues('voluntarioStatus')!] ===
                  MinisterioVoluntarioStatusEnum.Ativo
                    ? palette.primary
                    : palette.error
                }
              />
            )}
          </View>

          <FancySeparator />

          <View style={styles.funcoesSectionHeader}>
            <FancyText size='medium' type='bold' style={styles.funcoesSectionTitle}>
              Funções ({sortedFuncoesList.length})
            </FancyText>
            <FancyButton
              mode='icon'
              type='contained'
              icon={{ ...DefaultIconsNames.add, size: 19, color: palette.icons.light }}
              onPress={() => {
                handleClearForm();
                setFormModalOptions({ visible: true, mode: 'add' });
              }}
              containerStyle={styles.funcoesAddButton}
            />
          </View>

          <FancyScrollView fill contentContainerStyle={styles.funcoesListContent}>
            {sortedFuncoesList.length > 0 ? (
              sortedFuncoesList.map((item) => funcaoListItem(item))
            ) : (
              <FancyListEmpty label='Nenhuma função cadastrada' />
            )}
          </FancyScrollView>

          <FancyActionSheet
            visible={!!actionsFuncao}
            onClose={() => setActionsFuncao(null)}
            actions={[
              {
                label: 'Editar',
                icon: { ...DefaultIconsNames.edit, size: 18 },
                onPress: () => {
                  if (actionsFuncao) handleEdit(actionsFuncao);
                },
              },
              {
                label:
                  actionsFuncao?.status === MinisterioVoluntarioFuncaoStatusEnum.Inativo
                    ? 'Ativar'
                    : 'Inativar',
                icon: {
                  library: 'FontAwesome6',
                  name:
                    actionsFuncao?.status === MinisterioVoluntarioFuncaoStatusEnum.Inativo
                      ? 'thumbs-up'
                      : 'thumbs-down',
                  size: 16,
                },
                onPress: () => {
                  if (actionsFuncao) handleToggleStatus(actionsFuncao);
                },
              },
              {
                label: 'Excluir',
                destructive: true,
                icon: { ...DefaultIconsNames.delete, size: 18 },
                onPress: () => {
                  if (actionsFuncao) handleDelete(actionsFuncao.id);
                },
              },
            ]}
          />
        </>
      ) : (
        <>
          {showVoluntario && (
            <View style={styles.voluntarioSection}>
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                Mostrando voluntários que ainda não fazem parte deste ministério
              </FancyText>
              <ControlledSearchSelect
                control={control}
                name='voluntarioId'
                label='Voluntário'
                listItems={voluntariosDropDownList}
                searchPlaceholder='Buscar voluntário...'
              />
            </View>
          )}

          {showFuncoes && (
            <FancyContainerList
              title='Funções'
              contentContainerStyle={styles.funcoesContent}
              buttons={[
                {
                  icon: { ...DefaultIconsNames.add, size: 19 },
                  onPress: () => {
                    handleClearForm();
                    setFormModalOptions({ visible: true, mode: 'add' });
                  },
                },
              ]}
              data={sortedFuncoesList}
              renderItem={({ item }) => funcaoCardItem(item)}
            />
          )}
        </>
      )}

      <FormProvider {...formModal}>
        <IntegranteFormModal
          visible={formModalOptions.visible}
          mode={formModalOptions.mode}
          title={formModalOptions.mode === 'add' ? 'Adicionar Função' : 'Editar Função'}
          funcoesDropDownList={
            formModalOptions.mode === 'edit' ? funcoesDropDownList : notUsedFuncoesList
          }
          onButton2Press={() => handleSave()}
          onButton1Press={() => {
            setFormModalOptions({ visible: false, mode: 'add' });
          }}
        />
      </FormProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
  },
  rootFlex: {
    flex: 1,
  },
  voluntarioSection: {
    gap: 6,
  },
  heroSection: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  heroName: {
    marginTop: 6,
  },
  heroEmail: {
    opacity: 0.8,
  },
  heroStatusChip: {
    alignSelf: 'center',
  },
  funcoesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  funcoesSectionTitle: {
    flex: 1,
    opacity: 0.7,
  },
  funcoesAddButton: {
    minHeight: 25,
    height: 25,
    minWidth: 25,
    width: 25,
  },
  funcoesListContent: {
    gap: 8,
  },
  funcaoInativa: {
    opacity: 0.55,
  },
  funcoesContent: {
    paddingTop: 6,
    gap: 8,
  },
  funcaoCard: {
    borderRadius: 22,
    paddingVertical: 8,
  },
  funcaoCardContent: {
    paddingVertical: 2,
  },
  funcaoCardCenter: {
    gap: 1,
  },
});
