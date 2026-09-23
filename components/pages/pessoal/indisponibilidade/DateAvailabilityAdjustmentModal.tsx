import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import { FancyModalDialogProps } from '../../../modal/FancyModalDialog';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import ControlledTextArea from '../../../forms/ControlledTextArea';
import FancyTextInput from '../../../fields/FancyTextInput';
import FancyToggle from '../../../fields/FancyToggle';
import FancyButton from '../../../buttons/FancyButton';
import { usePallete } from '../../../../hooks/usePallete';
import DateUtils from '../../../../utils/date_utils';

const schema = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, 'Informe o motivo (mínimo 3 caracteres)')
    .max(500, 'O motivo deve ter no maximo 500 caracteres'),
});

type DateAvailabilityForm = z.infer<typeof schema>;

export type DateAvailabilityAdjustmentModalProps = {
  data: {
    id?: string;
    date: Date;
    status: 'available' | 'unavailable';
    motivo?: string | null;
  };
  modalProps?: FancyModalDialogProps<any>;
  onConfirm: (mode: 'mark' | 'unmark', date: Date, motivo?: string) => void;
};

export default function DateAvailabilityAdjustmentModal({
  data,
  modalProps,
  onConfirm,
}: DateAvailabilityAdjustmentModalProps) {
  const palette = usePallete();
  const [selectedStatus, setSelectedStatus] = useState<'available' | 'unavailable'>(data.status);

  const { control, handleSubmit, reset, watch } = useForm<DateAvailabilityForm>({
    resolver: zodResolver(schema),
    defaultValues: { motivo: data.motivo ?? '' },
  });

  useEffect(() => {
    reset({ motivo: data.motivo ?? '' });
    setSelectedStatus(data.status);
  }, [data.date.getTime(), data.motivo, data.status, reset]);

  const motivoValue = watch('motivo');
  const trimmedCurrentMotivo = (motivoValue ?? '').trim();
  const trimmedOriginalMotivo = (data.motivo ?? '').trim();

  const hasSelectionChanged = selectedStatus !== data.status;
  const hasMotivoChanged = trimmedCurrentMotivo !== trimmedOriginalMotivo;
  const canSubmit = hasSelectionChanged || (selectedStatus === 'unavailable' && hasMotivoChanged);
  const shouldShowMotivoForm = selectedStatus === 'unavailable';

  const submitToMarkUnavailable = handleSubmit((formData) => {
    const trimmedMotivo = formData.motivo.trim();
    onConfirm('mark', data.date, trimmedMotivo.length > 0 ? trimmedMotivo : undefined);
  });

  const handleConfirmPress = () => {
    if (!canSubmit) {
      return;
    }

    if (selectedStatus === 'unavailable') {
      submitToMarkUnavailable();
      return;
    }

    onConfirm('unmark', data.date);
  };

  const handleModalClose = () => {
    reset({ motivo: data.motivo ?? '' });
    setSelectedStatus(data.status);
    modalProps?.onButton1Press?.();
  };

  return (
    <FancyBottomSheetModal
      visible
      onClose={handleModalClose}
      title='Detalhes da data'
      keyboardExtraOffset={0}
      footer={
        <View style={styles.footerActions}>
          <FancyButton
            label='Cancelar'
            type='outlined'
            onPress={handleModalClose}
            containerStyle={styles.footerButton}
          />
          <FancyButton
            label='Confirmar'
            onPress={handleConfirmPress}
            disabled={!canSubmit}
            containerStyle={styles.footerButton}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <FancyToggle<'available' | 'unavailable'>
          option1={{
            title: 'Disponível',
            value: 'available',
            activeContainerStyle: { backgroundColor: palette.primary },
            activeLabelProps: { color: palette.fonts.light },
          }}
          option2={{
            title: 'Indisponível',
            value: 'unavailable',
            activeContainerStyle: { backgroundColor: palette.error },
            activeLabelProps: { color: palette.fonts.light },
          }}
          value={selectedStatus}
          onChange={setSelectedStatus}
        />

        <FancyTextInput
          label='Data'
          value={DateUtils.formatStableDateBR(data.date)}
          readonly
          disabled
        />

        {shouldShowMotivoForm && (
          <ControlledTextArea
            control={control}
            name='motivo'
            label='Motivo'
            placeholder='Descreva o motivo'
          />
        )}
      </View>
    </FancyBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
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
