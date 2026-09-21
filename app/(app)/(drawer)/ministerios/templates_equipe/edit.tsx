import { FormProvider, useForm } from 'react-hook-form';
import TemplateForm from '../../../../../components/pages/ministerios/templates_equipe/TemplateForm';
import { router, useLocalSearchParams } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  EscalaTemplateFormData,
  escalaTemplateSchema,
} from '../../../../../domain/schemas/escalaTemplateSchema';
import { useEscalaTemplatesCrud } from '../../../../../useEscalaTemplatesCrud';
import { useCallback, useEffect, useMemo } from 'react';
import { DynamicQuery, Operator, ValueType } from '../../../../../domain/utils/query_utils';
import FancyLoading from '../../../../../components/FancyLoading';
import { strfyObj } from '../../../../../utils/text_utils';
import {
  EscalaTemplateTipoEnum,
  EscalaTemplateTipoEnumMap,
} from '../../../../../domain/enums/EscalaTemplate/escala-template-tipo.enum';
import { MinisterioTipoEnum } from '../../../../../domain/enums/Ministerio/ministerio-tipo.enum';
import { useLoading } from '../../../../../contexts/LoadingContext';
import { useMinisteriosCrud } from '../../../../../hooks/useMinisteriosCrud';

export default function MinisterioTemplatesEditPage() {
  const { ministerioId, templateId } = useLocalSearchParams<{
    ministerioId: string;
    templateId: string;
  }>();

  const ministerioSearchParams = useMemo<DynamicQuery>(
    () => ({
      where: {
        conditions: [
          {
            path: 'id',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: ministerioId },
          },
        ],
      },
    }),
    [ministerioId],
  );

  const { data: ministeriosData } = useMinisteriosCrud({
    initialParams: ministerioSearchParams,
  });
  const ministerio = ministeriosData[0];

  const dataParams = useMemo(() => {
    if (!templateId) return undefined;

    return {
      where: {
        conditions: [
          {
            path: 'id',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: templateId },
          },
        ],
      },
      relations: [
        'voluntarios.voluntario',
        'voluntarios.funcao',
        'funcoes.opcoes.funcao',
        'respSetListVoluntarios',
        'respSetListFuncoes',
      ],
    } as DynamicQuery;
  }, [templateId]);

  const {
    data: templatesData,
    update: updateTemplate,
    isLoading,
    isLoadingMutation,
  } = useEscalaTemplatesCrud({ autoFetch: true, initialParams: dataParams });

  const { showLoading, hideLoading } = useLoading();

  const form = useForm<EscalaTemplateFormData>({
    resolver: zodResolver(escalaTemplateSchema),
  });

  useEffect(() => {
    const template = templatesData?.[0];
    if (template) {
      form.reset({
        ministerioId: ministerioId,
        id: template.id,
        nome: template.nome,
        funcoes: template.funcoes
          ? template.funcoes.map((f) => ({
              funcaoIds: f.opcoes?.map((o) => o.funcaoId) ?? [],
              funcoesAceitas: f.opcoes?.map((o) => ({
                id: o.funcaoId,
                nome: o.funcao?.nome ?? '',
              })),
              experiencia: f.experiencia,
              quantidade: f.quantidade,
            }))
          : [],
        voluntarios: template.voluntarios
          ? template.voluntarios?.map((v) => ({
              id: v.id,
              voluntarioId: v.voluntario?.id,
              funcaoId: v.funcao?.id,
            }))
          : [],
        respSetListFuncoesId: template.respSetListFuncoes?.id,
        respSetListVoluntariosId: template.respSetListVoluntarios?.id,
        tipo: EscalaTemplateTipoEnumMap[template.tipo],
      });
    }
  }, [templatesData]);

  const handleOnSave = useCallback(
    form.handleSubmit(
      async (data) => {
        if (!data.id) return;

        if (ministerio?.tipo === MinisterioTipoEnum.Louvor) {
          if (
            data.tipo === EscalaTemplateTipoEnum.Fixo &&
            !data.respSetListVoluntariosId
          ) {
            form.setError('respSetListVoluntariosId', {
              type: 'custom',
              message: 'Informe o responsável pelo setlist para ministérios de louvor.',
            });
            return;
          }
          if (
            data.tipo === EscalaTemplateTipoEnum.Funcoes &&
            !data.respSetListFuncoesId
          ) {
            form.setError('respSetListFuncoesId', {
              type: 'custom',
              message: 'Informe o responsável pelo setlist para ministérios de louvor.',
            });
            return;
          }
        }

        showLoading('Salvando...');
        try {
          const { respSetListVoluntariosId, respSetListFuncoesId, ...rest } = data;
          await updateTemplate?.({
            id: data.id,
            data: {
              ...rest,
              respSetListVoluntarios: respSetListVoluntariosId,
              respSetListFuncoes: respSetListFuncoesId,
            },
          });
          router.back();
        } finally {
          hideLoading();
        }
      },
      (errors) =>
        console.log(
          'Erro no submit do formulário\n',
          '=> Erros: ',
          strfyObj(errors),
          '\n=> Data: ',
          strfyObj(form.getValues()),
        ),
    ),
    [form.handleSubmit],
  );

  if (isLoading) return <FancyLoading />;

  return (
    <FormProvider {...form}>
      <TemplateForm
        mode='edit'
        ministerioId={ministerioId}
        ministerioTipo={ministerio?.tipo}
        onSave={handleOnSave}
        isLoading={isLoadingMutation}
      />
    </FormProvider>
  );
}
