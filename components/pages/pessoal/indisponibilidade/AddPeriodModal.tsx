import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import { FancyModalDialogProps } from '../../../modal/FancyModalDialog';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import ControlledTextArea from '../../../forms/ControlledTextArea';
import ControlledDateInput from '../../../forms/ControlledDateInput';
import { differenceInDays } from 'date-fns';
import { FancyAlert } from '../../../modal/FancyAlert';
import FancyText from '../../../FancyText';
import FancyButton from '../../../buttons/FancyButton';
import { useEscopoOpcoesVoluntario } from '../../../../hooks/useEscopoOpcoesVoluntario';
import { useAuth } from '../../../../contexts/AuthContext';
import EscopoIndisponibilidadeField from './EscopoIndisponibilidadeField';
import EscopoIndisponibilidadeSheet from './EscopoIndisponibilidadeSheet';

const schema = z
  .object({
    dataInicio: z
      .date()
      .nullable()
      .refine((d) => !!d, { message: 'Data inicial obrigatória' }),
    dataTermino: z
      .date()
      .nullable()
      .refine((d) => !!d, { message: 'Data final obrigatória' }),
    motivo: z
      .string()
      .min(3, 'Informe pelo menos 3 caracteres')
      .max(500, 'Máximo de 500 caracteres'),
    ministeriosInteirosIds: z.array(z.string()).optional(),
    funcoesIds: z.array(z.string()).optional(),
  })
  .refine((data) => data.dataInicio && data.dataTermino && data.dataTermino >= data.dataInicio, {
    path: ['dataTermino'],
    message: 'Data final deve ser maior ou igual à inicial',
  });

export type AddPeriodoModalProps = {
  visible: boolean;
  modalProps?: FancyModalDialogProps<any>;
  onConfirm: (
    inicio: Date,
    fim: Date,
    motivo: string,
    ministeriosInteirosIds?: string[],
    funcoesIds?: string[],
  ) => void;
};

export default function AddPeriodoModal({ visible, modalProps, onConfirm }: AddPeriodoModalProps) {
  const [showEscopoSheet, setShowEscopoSheet] = useState(false);

  const { user } = useAuth();
  const { ministerios: ministeriosData, funcoes: allFuncoes } = useEscopoOpcoesVoluntario(
    user?.user?.id,
  );

  const { control, handleSubmit, setValue, trigger } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      dataInicio: new Date(),
      dataTermino: new Date(),
      motivo: '',
      ministeriosInteirosIds: undefined,
      funcoesIds: [],
    },
  });

  const dataInicio = useWatch({ control, name: 'dataInicio' });
  const dataTermino = useWatch({ control, name: 'dataTermino' });
  const ministeriosInteirosIds = useWatch({ control, name: 'ministeriosInteirosIds' });
  const funcoesIds = useWatch({ control, name: 'funcoesIds' });

  useEffect(() => {
    if (dataInicio && dataTermino && dataInicio > dataTermino) {
      setValue('dataTermino', dataInicio, { shouldValidate: true });
    }
  }, [dataInicio, dataTermino, setValue]);

  const submit = (values: z.infer<typeof schema>) => {
    onConfirm(
      values.dataInicio as Date,
      values.dataTermino as Date,
      values.motivo,
      values.ministeriosInteirosIds,
      values.funcoesIds,
    );
  };

  const currentDate = new Date();
  const maxDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 0);

  const handleClose = () => modalProps?.onButton1Press?.();

  const handleSave = async () => {
    if (differenceInDays(dataTermino || new Date(), dataInicio || new Date()) > 31) {
      FancyAlert.alert('Erro', 'O período não pode ser maior que 31 dias.');
      return;
    }

    const valid = await trigger();

    if (!valid) return;

    FancyAlert.alert(
      'Confirmação',
      <View style={{ paddingBottom: 20, gap: 15 }}>
        <FancyText type='medium' size='medium'>
          Deseja realmente adicionar este período de indisponibilidade?
        </FancyText>
        <FancyText type='bold' size='small'>
          Atenção! Se houver alguma data já indisponível ela será sobreescrevida!
        </FancyText>
      </View>,
      [
        {
          text: 'Não',
          style: 'destructive',
        },
        {
          text: 'Sim, estou ciente',
          onPress: () => handleSubmit(submit)(),
        },
      ],
    );
  };

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={handleClose}
      title='Adicionar Período de Indisponibilidade'
      keyboardExtraOffset={0}
      footer={
        <View style={styles.footerActions}>
          <FancyButton
            label='Cancelar'
            type='outlined'
            onPress={handleClose}
            containerStyle={styles.footerButton}
          />
          <FancyButton label='Salvar' onPress={handleSave} containerStyle={styles.footerButton} />
        </View>
      }
    >
      <View style={styles.content}>
        <ControlledDateInput
          control={control}
          name='dataInicio'
          label='Data Início'
          calendarProps={{
            dayViewProps: {
              disablePastDates: true,
              maximumDate: maxDate,
            },
          }}
        />
        <ControlledDateInput
          control={control}
          name='dataTermino'
          label='Data Fim'
          calendarProps={{
            dayViewProps: {
              disablePastDates: true,
              maximumDate: maxDate,
            },
          }}
        />
        <EscopoIndisponibilidadeField
          ministeriosInteirosIds={ministeriosInteirosIds}
          funcoesIds={funcoesIds}
          ministerios={ministeriosData ?? []}
          funcoes={allFuncoes ?? []}
          label='Onde vale'
          onPress={() => setShowEscopoSheet(true)}
        />
        <ControlledTextArea control={control} name='motivo' label='Motivo' />
      </View>
      <EscopoIndisponibilidadeSheet
        visible={showEscopoSheet}
        onClose={() => setShowEscopoSheet(false)}
        onConfirm={(mids, fids) => {
          setValue('ministeriosInteirosIds', mids);
          setValue('funcoesIds', fids);
          setShowEscopoSheet(false);
        }}
        ministeriosInteirosIds={ministeriosInteirosIds}
        funcoesIds={funcoesIds}
        ministerios={ministeriosData ?? []}
        funcoes={allFuncoes ?? []}
      />
    </FancyBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 2,
  },
  footerButton: {
    flex: 1,
    height: 38,
  },
});
