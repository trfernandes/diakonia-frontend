import { useCallback, useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEscalaTemplatesCrud } from '../../../../../useEscalaTemplatesCrud';
import {
  EscalaTemplateFormData,
  escalaTemplateSchema,
} from '../../../../../domain/schemas/escalaTemplateSchema';
import { AxiosError } from 'axios';
import TemplateForm from '../../../../../components/pages/ministerios/templates_equipe/TemplateForm';
import { strfyObj } from '../../../../../utils/text_utils';
import { EscalaTemplateTipoEnum } from '../../../../../domain/enums/EscalaTemplate/escala-template-tipo.enum';
import { MinisterioTipoEnum } from '../../../../../domain/enums/Ministerio/ministerio-tipo.enum';
import { useLoading } from '../../../../../contexts/LoadingContext';
import { useMinisteriosCrud } from '../../../../../hooks/useMinisteriosCrud';
import { DynamicQuery, Operator, ValueType } from '../../../../../domain/utils/query_utils';

export default function MinisterioTemplatesAddPage() {
  const { ministerioId } = useLocalSearchParams<{ ministerioId: string }>();

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

  const form = useForm<EscalaTemplateFormData>({
    resolver: zodResolver(escalaTemplateSchema),
    defaultValues: {
      ministerioId,
      tipo: EscalaTemplateTipoEnum.Funcoes,
      respSetListFuncoesId: undefined,
      respSetListVoluntariosId: undefined,
    },
  });

  const { add: addTemplate, isLoadingMutation } = useEscalaTemplatesCrud();
  const { showLoading, hideLoading } = useLoading();

  const handleOnSave = useCallback(
    form.handleSubmit(
      async (data) => {
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
          await addTemplate({
            ...rest,
            ministerioId: data.ministerioId,
            respSetListVoluntarios: respSetListVoluntariosId,
            respSetListFuncoes: respSetListFuncoesId,
          });
          router.back();
        } catch (error) {
          const errorMessage = (error as AxiosError<any, any>).response?.data?.message;
          if (
            errorMessage &&
            errorMessage.trim() ===
              'Ja existe um template com esse nome para o ministerio informado.'
          ) {
            form.setError('nome', {
              type: 'custom',
              message: 'O nome já está sendo utilizado',
            });
          }
        } finally {
          hideLoading();
        }
      },
      (errors) => {
        console.log('Erro ao adicionar template\n', strfyObj(errors));
      },
    ),
    [form.handleSubmit],
  );

  return (
    <FormProvider {...form}>
      <TemplateForm
        mode='add'
        ministerioId={ministerioId}
        ministerioTipo={ministerio?.tipo}
        onSave={handleOnSave}
        isLoading={isLoadingMutation}
      />
    </FormProvider>
  );
}
