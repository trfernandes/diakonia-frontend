import { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useForm, useWatch, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import ControlledTextArea from '../../../forms/ControlledTextArea';
import FancyErrorText from '../../../forms/FancyErrorText';
import FancyErrorBanner from '../../../forms/FancyErrorBanner';
import { getApiErrorMessage } from '../../../../domain/api/api-error';
import ControlledDateInput from '../../../forms/ControlledDateInput';
import ControlledNumberInput from '../../../forms/ControlledNumberInput';
import ControlledFancyToggle from '../../../forms/ControlledFancyToggle';
import ControlledDropDown from '../../../forms/ControlledDropDown';
import FancyText from '../../../FancyText';
import FancyInfoNote from '../../../FancyInfoNote';
import FancyButton from '../../../buttons/FancyButton';
import FancySegmentedControl from '../../../fields/FancySegmentedControl';
import FancyChips from '../../../FancyChips';
import FancyScrollView from '../../../FancyScrollView';
import { usePallete } from '../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../hooks/useThemedStyles';
import { ThemePalette } from '../../../../constants/colors';
import { ColorUtils } from '../../../../utils/color_utils';
import { DateUtilsApi } from '../../../../utils/date_utils';
import {
  RegraIndisponibilidadeTipo,
  ResponseRegraIndisponibilidadeVoluntarioDto,
} from '../../../../domain/dtos/RegraIndisponibilidadeVoluntario/regra-indisponibilidade-voluntario.response';
import { useMinisteriosCrud } from '../../../../hooks/useMinisteriosCrud';
import { useMinisterioVoluntarioFuncoesCrud } from '../../../../hooks/useMinisterioVoluntarioFuncoesCrud';
import { DropDownItemProps } from '../../../fields/FancyDropDownItem';
import { descreverRegra } from '../../../../domain/utils/regra_indisponibilidade_utils';

const DIAS_NOMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const TODOS_DIAS = [0, 1, 2, 3, 4, 5, 6];

function AnimatedDiaChip({
  onPress,
  isSelected,
  disabled,
  children,
  style,
}: {
  onPress: () => void;
  isSelected: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  style: object;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };
  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  };
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole='checkbox'
      accessibilityState={{ checked: isSelected, disabled }}
    >
      <Animated.View style={[style, disabled && chipStyles.disabled, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  disabled: { opacity: 0.5 },
});

const schema = z
  .object({
    tipo: z.enum(['DIAS_SEMANA', 'PERIODO', 'LIMITE_MENSAL']),
    ministerioId: z.string().optional(),
    funcoes: z.array(z.string()).optional(),
    diasSemana: z.array(z.number()).optional(),
    dataInicio: z.date().nullable().optional(),
    dataFim: z.date().nullable().optional(),
    recorrente: z.boolean().optional(),
    limiteMensal: z.number().optional(),
    motivo: z.string().trim().min(1, 'Informe o motivo').max(255, 'Máximo de 255 caracteres'),
  })
  .superRefine((val, ctx) => {
    if (val.tipo === 'DIAS_SEMANA' && (!val.diasSemana || val.diasSemana.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['diasSemana'],
        message: 'Selecione ao menos um dia da semana',
      });
    }
    if (val.tipo === 'PERIODO') {
      if (!val.dataInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataInicio'],
          message: 'Data inicial obrigatória',
        });
      }
      if (!val.dataFim) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataFim'],
          message: 'Data final obrigatória',
        });
      }
      if (val.dataInicio && val.dataFim && !val.recorrente && val.dataFim < val.dataInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataFim'],
          message: 'Data final deve ser ≥ data inicial',
        });
      }
    }
    if (val.tipo === 'LIMITE_MENSAL') {
      if (!val.limiteMensal || val.limiteMensal < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['limiteMensal'],
          message: 'Informe o limite (mínimo 1)',
        });
      }
      if (!val.dataInicio) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dataInicio'],
          message: 'Data de início obrigatória',
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export type AddRegraModalResult = {
  tipo: RegraIndisponibilidadeTipo;
  ministerioId?: string | null;
  funcoes?: string[];
  diasSemana?: number[];
  dataInicio?: string;
  dataFim?: string;
  recorrente?: boolean;
  limiteMensal?: number;
  motivo?: string;
};

export type AddRegraModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (result: AddRegraModalResult) => Promise<void>;
  initialValues?: Partial<AddRegraModalResult>;
  isEditing?: boolean;
  editingRegraId?: string;
  voluntarioNome?: string;
  voluntarioId?: string;
  igrejaId?: string;
  regrasExistentes?: Array<{
    id?: string;
    tipo: RegraIndisponibilidadeTipo;
    ministerioId?: string | null;
    funcoes?: string[] | null;
  }>;
};

export default function AddRegraModal({
  visible,
  onClose,
  onConfirm,
  initialValues,
  isEditing,
  editingRegraId,
  voluntarioNome,
  voluntarioId,
  igrejaId,
  regrasExistentes = [],
}: AddRegraModalProps) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);

  const { data: ministeriosData, isLoading: isLoadingMinisteios } = useMinisteriosCrud({
    autoFetch: true,
  });

  const { control, handleSubmit, setValue, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'DIAS_SEMANA',
      ministerioId: undefined,
      funcoes: [],
      diasSemana: [],
      dataInicio: isEditing ? null : new Date(),
      dataFim: null,
      recorrente: false,
      limiteMensal: 2,
      motivo: '',
    },
  });

  useEffect(() => {
    if (visible && initialValues) {
      reset({
        tipo: initialValues.tipo ?? 'DIAS_SEMANA',
        ministerioId: initialValues.ministerioId || undefined,
        funcoes: initialValues.funcoes ?? [],
        diasSemana: initialValues.diasSemana ?? [],
        dataInicio: initialValues.dataInicio
          ? DateUtilsApi.dateOnlyFromApi(initialValues.dataInicio)
          : null,
        dataFim: initialValues.dataFim ? DateUtilsApi.dateOnlyFromApi(initialValues.dataFim) : null,
        recorrente: initialValues.recorrente ?? false,
        limiteMensal: initialValues.limiteMensal ?? 2,
        motivo: initialValues.motivo ?? '',
      });
    } else if (visible && !isEditing) {
      reset({
        tipo: 'DIAS_SEMANA',
        ministerioId: undefined,
        funcoes: [],
        diasSemana: [],
        dataInicio: new Date(),
        dataFim: null,
        recorrente: false,
        limiteMensal: 2,
        motivo: '',
      });
    } else if (!visible) {
      reset({
        tipo: 'DIAS_SEMANA',
        ministerioId: undefined,
        funcoes: [],
        diasSemana: [],
        dataInicio: null,
        dataFim: null,
        recorrente: false,
        limiteMensal: 2,
        motivo: '',
      });
    }
  }, [visible, initialValues, isEditing, reset]);

  const tipo = useWatch({ control, name: 'tipo' });
  const ministerioId = useWatch({ control, name: 'ministerioId' });
  const funcoes = useWatch({ control, name: 'funcoes' }) ?? [];
  const diasSemana = useWatch({ control, name: 'diasSemana' }) ?? [];
  const dataInicio = useWatch({ control, name: 'dataInicio' });
  const dataFim = useWatch({ control, name: 'dataFim' });
  const { errors } = useFormState({ control });

  // Hook para buscar funções que o voluntário exerce no ministério selecionado
  const { data: ministerioVoluntarioFuncoes, isLoading: isLoadingFuncoes } =
    useMinisterioVoluntarioFuncoesCrud({
      autoFetch: Boolean(voluntarioId && igrejaId && ministerioId),
      initialParams:
        voluntarioId &&
        igrejaId &&
        ministerioId &&
        ({
          where: {
            conditions: [
              {
                path: 'ministerioVoluntario.voluntario.id',
                operator: 'EQUALS' as any,
                value: { type: 'LITERAL' as any, value: voluntarioId },
              },
              {
                path: 'ministerioVoluntario.ministerio.id',
                operator: 'EQUALS' as any,
                value: { type: 'LITERAL' as any, value: ministerioId },
              },
            ],
            conjunction: 'AND' as any,
          },
        } as any),
    });

  const funcoesList = useMemo(() => {
    return (
      ministerioVoluntarioFuncoes?.map((mvf) => ({
        id: mvf.funcaoId,
        nome: mvf.funcao?.nome ?? 'Função',
      })) ?? []
    );
  }, [ministerioVoluntarioFuncoes]);

  // Dropdown de ministérios
  const ministeriosList = useMemo<DropDownItemProps<string>[]>(() => {
    return (
      ministeriosData?.map((ministerio) => {
        const logoUrl = ministerio.logoThumbUrl || ministerio.logoUrl;
        return {
          title: ministerio.nome,
          value: ministerio.id,
          ...(logoUrl && {
            left: {
              type: 'image' as const,
              source: logoUrl,
            },
          }),
        };
      }) ?? []
    );
  }, [ministeriosData]);

  // Lógica de detecção de conflito
  const conflitoDetectado = useMemo(() => {
    if (tipo === 'LIMITE_MENSAL') return null; // LIMITE_MENSAL não usa escopo de função

    const regraConflitante = regrasExistentes.find((regra) => {
      // Ignora a regra sendo editada se estamos em modo edição
      if (isEditing && regra.id === editingRegraId) return false;

      if (regra.tipo === 'LIMITE_MENSAL') return false; // ignora limite mensal

      // Se ambas bloqueiam tudo (sem ministério)
      if (!ministerioId && !regra.ministerioId) return true;

      // Se ambas têm o mesmo ministério
      if (ministerioId && ministerioId === regra.ministerioId) {
        // Se ambas bloqueiam o ministério inteiro (sem função)
        if (funcoes.length === 0 && !regra.funcoes?.length) return true;

        // Se uma bloqueia o ministério inteiro, ela cobre a outra
        if (funcoes.length > 0 && !regra.funcoes?.length) return true;
        if (funcoes.length === 0 && regra.funcoes?.length) return false;

        // Se ambas têm funções, verifica sobreposição
        if (funcoes.length > 0 && regra.funcoes?.length) {
          const overlap = funcoes.some((f) => regra.funcoes?.includes(f));
          return overlap;
        }
      }

      return false;
    });

    return regraConflitante;
  }, [ministerioId, funcoes, tipo, regrasExistentes, isEditing, editingRegraId]);

  useEffect(() => {
    if (dataInicio && dataFim && dataFim < dataInicio) {
      setValue('dataFim', dataInicio, { shouldValidate: true });
    }
  }, [dataInicio, dataFim, setValue]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggleDia = (idx: number) => {
    if (isSubmitting) return;
    const next = diasSemana.includes(idx)
      ? diasSemana.filter((d) => d !== idx)
      : [...diasSemana, idx];
    setValue('diasSemana', next, { shouldValidate: true });
  };

  const setAtalho = (dias: number[]) => {
    if (isSubmitting) return;
    setValue('diasSemana', dias, { shouldValidate: true });
  };

  useEffect(() => {
    if (visible) setSubmitError(null);
  }, [visible]);

  const handleClose = () => {
    reset();
    setSubmitError(null);
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    const result: AddRegraModalResult = { tipo: values.tipo as RegraIndisponibilidadeTipo };
    if (values.tipo === 'DIAS_SEMANA') {
      result.diasSemana = values.diasSemana;
    } else if (values.tipo === 'PERIODO') {
      result.dataInicio = values.dataInicio
        ? DateUtilsApi.dateOnlyToApi(values.dataInicio)
        : undefined;
      result.dataFim = values.dataFim ? DateUtilsApi.dateOnlyToApi(values.dataFim) : undefined;
      result.recorrente = values.recorrente;
    } else if (values.tipo === 'LIMITE_MENSAL') {
      result.limiteMensal = values.limiteMensal;
      result.dataInicio = values.dataInicio
        ? DateUtilsApi.dateOnlyToApi(values.dataInicio)
        : undefined;
    }

    // Adiciona ministério e funções (opcionais)
    result.ministerioId = values.ministerioId || undefined;
    if (values.funcoes?.length) {
      result.funcoes = values.funcoes;
    }
    result.motivo = values.motivo.trim();

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(result);
      // onConfirm resolve com sucesso em 2 casos: (1) regra criada/atualizada —
      // pai fecha o modal (visible=false), o efeito acima reseta o form; (2) tipo
      // LIMITE_MENSAL em conflito — pai já fechou o modal antes de abrir o
      // FancyAlert de confirmação, então este resolve também cai aqui sem erro.
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'Não foi possível salvar a regra.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const TIPOS: { label: string; value: RegraIndisponibilidadeTipo }[] = [
    { label: 'Semanal', value: 'DIAS_SEMANA' },
    { label: 'Período', value: 'PERIODO' },
    { label: 'Mensal', value: 'LIMITE_MENSAL' },
  ];

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={handleClose}
      title={isEditing ? 'Editar regra de indisponibilidade' : 'Nova regra de indisponibilidade'}
      closeDisabled={isSubmitting}
      footer={
        <View style={styles.footerActions}>
          <FancyButton
            label='Cancelar'
            type='outlined'
            onPress={handleClose}
            disabled={isSubmitting}
            containerStyle={styles.footerButton}
          />
          <FancyButton
            label={isEditing ? 'Atualizar' : 'Salvar'}
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            containerStyle={styles.footerButton}
          />
        </View>
      }
    >
      <View style={styles.content}>
        {submitError && <FancyErrorBanner message={submitError} />}

        <FancySegmentedControl<RegraIndisponibilidadeTipo>
          label='Tipo de regra'
          options={TIPOS}
          value={tipo}
          disabled={isSubmitting}
          onChange={(v) => setValue('tipo', v, { shouldValidate: false })}
        />

        {/* MINISTÉRIO */}
        <View style={styles.secao}>
          <ControlledDropDown
            label='Restringir a'
            listItems={ministeriosList}
            control={control}
            name='ministerioId'
            disabled={isSubmitting || isLoadingMinisteios}
            isLoading={isLoadingMinisteios}
            placeholder='Sem restrição (bloqueia tudo)'
          />
          <FancyInfoNote>Deixe em branco para bloquear em todos os ministérios.</FancyInfoNote>
        </View>

        {/* FUNÇÕES (só aparece se ministério selecionado e tipo != LIMITE_MENSAL) */}
        {ministerioId && tipo !== 'LIMITE_MENSAL' && (
          <View style={styles.secao}>
            <FancyText size='small' type='semiBold' color={palette.fonts.inactive}>
              Funções (opcional)
            </FancyText>
            {funcoesList.length > 0 ? (
              <FancyScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.funcoesScroll}
              >
                {funcoesList.map((funcao) => {
                  const isSelected = funcoes.includes(funcao.id);
                  return (
                    <FancyChips
                      key={funcao.id}
                      label={funcao.nome}
                      color={isSelected ? palette.primary : palette.fonts.inactive}
                      backgroundColor={
                        isSelected
                          ? ColorUtils.withAlpha(palette.primary, 0.15)
                          : ColorUtils.withAlpha(palette.fonts.inactive, 0.08)
                      }
                      onPress={() => {
                        const next = isSelected
                          ? funcoes.filter((f) => f !== funcao.id)
                          : [...funcoes, funcao.id];
                        setValue('funcoes', next, { shouldValidate: true });
                      }}
                      size='small'
                      outlined={!isSelected}
                    />
                  );
                })}
              </FancyScrollView>
            ) : isLoadingFuncoes ? (
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                Carregando funções...
              </FancyText>
            ) : (
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                Nenhuma função encontrada para este ministério.
              </FancyText>
            )}
            <FancyInfoNote>Deixe em branco para bloquear o ministério inteiro.</FancyInfoNote>
          </View>
        )}

        {/* ALERTA DE CONFLITO */}
        {conflitoDetectado && (
          <FancyErrorBanner
            message={`Conflita com "${descreverRegra(conflitoDetectado as ResponseRegraIndisponibilidadeVoluntarioDto)}". Essa regra mais ampla continua valendo.`}
          />
        )}

        {/* DIAS_SEMANA */}
        {tipo === 'DIAS_SEMANA' && (
          <View style={styles.secao}>
            <FancyText size='small' type='semiBold' color={palette.fonts.inactive}>
              Dias da semana
            </FancyText>
            {errors.diasSemana && <FancyErrorText message={errors.diasSemana.message as string} />}
            <View style={styles.chipRow}>
              {(() => {
                const todosSelected = TODOS_DIAS.every((d) => diasSemana.includes(d));
                return (
                  <AnimatedDiaChip
                    onPress={() => setAtalho(todosSelected ? [] : TODOS_DIAS)}
                    isSelected={todosSelected}
                    disabled={isSubmitting}
                    style={[
                      styles.chip,
                      todosSelected
                        ? { backgroundColor: palette.secondary, borderColor: palette.secondary }
                        : {
                            backgroundColor: ColorUtils.withAlpha(palette.secondary, 0.1),
                            borderColor: ColorUtils.withAlpha(palette.secondary, 0.25),
                          },
                    ]}
                  >
                    <FancyText
                      size='small'
                      type='bold'
                      color={todosSelected ? palette.fonts.light : palette.secondary}
                    >
                      Todos
                    </FancyText>
                  </AnimatedDiaChip>
                );
              })()}
              {DIAS_NOMES.map((nome, idx) => {
                const sel = diasSemana.includes(idx);
                return (
                  <AnimatedDiaChip
                    key={idx}
                    onPress={() => toggleDia(idx)}
                    isSelected={sel}
                    disabled={isSubmitting}
                    style={[
                      styles.chip,
                      sel
                        ? { backgroundColor: palette.primary, borderColor: palette.primary }
                        : {
                            backgroundColor: ColorUtils.withAlpha(palette.primary, 0.08),
                            borderColor: ColorUtils.withAlpha(palette.primary, 0.19),
                          },
                    ]}
                  >
                    <FancyText
                      size='small'
                      type='bold'
                      color={sel ? palette.fonts.light : palette.primary}
                    >
                      {nome}
                    </FancyText>
                  </AnimatedDiaChip>
                );
              })}
            </View>
          </View>
        )}

        {/* PERIODO */}
        {tipo === 'PERIODO' && (
          <View style={styles.secao}>
            <ControlledDateInput
              control={control}
              name='dataInicio'
              label='Data início'
              disabled={isSubmitting}
            />
            <ControlledDateInput
              control={control}
              name='dataFim'
              label='Data fim'
              disabled={isSubmitting}
            />
            <ControlledFancyToggle
              control={control}
              name='recorrente'
              label='Repetir anualmente'
              option1={{ title: 'Não', value: false }}
              option2={{ title: 'Sim', value: true }}
              disabled={isSubmitting}
            />
          </View>
        )}

        {/* LIMITE_MENSAL */}
        {tipo === 'LIMITE_MENSAL' && (
          <View style={styles.secao}>
            <ControlledNumberInput
              control={control}
              name='limiteMensal'
              title='Escalas por mês'
              min={1}
              max={31}
              disabled={isSubmitting}
            />
            <ControlledDateInput
              control={control}
              name='dataInicio'
              label='A partir de'
              disabled={isSubmitting}
            />
            <FancyInfoNote>
              {voluntarioNome
                ? `${voluntarioNome.split(' ')[0]} não poderá ser escalado mais que este número de vezes neste ministério em um mesmo mês, a partir da data escolhida.`
                : 'Você não será escalado mais que este número de vezes em um mesmo mês, a partir da data escolhida.'}
            </FancyInfoNote>
          </View>
        )}

        <ControlledTextArea
          control={control}
          name='motivo'
          label='Motivo'
          disabled={isSubmitting}
        />
      </View>
    </FancyBottomSheetModal>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
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
    },
    secao: {
      gap: 12,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    funcoesScroll: {
      gap: 8,
      paddingRight: 12,
    },
  });
}
