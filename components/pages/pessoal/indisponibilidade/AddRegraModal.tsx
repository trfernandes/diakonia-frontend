import { useEffect, useRef, useState, useMemo, Fragment } from 'react';
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
import FancyText from '../../../FancyText';
import FancyButton from '../../../buttons/FancyButton';
import FancySegmentedControl from '../../../fields/FancySegmentedControl';
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
import { useMinisterioFuncoesCrud } from '../../../../hooks/useMinisterioFuncoesCrud';
import { descreverRegra } from '../../../../domain/utils/regra_indisponibilidade_utils';
import EscopoIndisponibilidadeField from './EscopoIndisponibilidadeField';
import EscopoIndisponibilidadeSheet from './EscopoIndisponibilidadeSheet';

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
    ministeriosInteirosIds: z.array(z.string()).optional(),
    funcoesIds: z.array(z.string()).optional(),
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
  ministeriosInteirosIds?: string[] | null;
  funcoesIds?: string[];
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
    ministeriosInteirosIds?: string[] | null;
    funcoesIds?: string[] | null;
  }>;
  simplifiedMode?: boolean;
  ministerioIdFixo?: string;
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
  simplifiedMode = false,
  ministerioIdFixo,
}: AddRegraModalProps) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);

  const { data: ministeriosData, isLoading: isLoadingMinisteios } = useMinisteriosCrud({
    autoFetch: true,
  });

  // Buscar todas as funções para a Sheet
  const { data: allFuncoes } = useMinisterioFuncoesCrud({
    autoFetch: true,
  });

  // Em modo simplificado, filtra funções só do ministério fixo
  const funcoesDoMinisterio = useMemo(() => {
    if (!simplifiedMode || !ministerioIdFixo) return allFuncoes ?? [];
    return (allFuncoes ?? []).filter((f) => f.ministerioId === ministerioIdFixo);
  }, [simplifiedMode, ministerioIdFixo, allFuncoes]);

  const { control, handleSubmit, setValue, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'DIAS_SEMANA',
      ministeriosInteirosIds: undefined,
      funcoesIds: [],
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
        ministeriosInteirosIds: initialValues.ministeriosInteirosIds || undefined,
        funcoesIds: initialValues.funcoesIds ?? [],
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
        ministeriosInteirosIds: undefined,
        funcoesIds: [],
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
        ministeriosInteirosIds: undefined,
        funcoesIds: [],
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
  const ministeriosInteirosIds = useWatch({ control, name: 'ministeriosInteirosIds' }) ?? [];
  const funcoesIds = useWatch({ control, name: 'funcoesIds' }) ?? [];
  const diasSemana = useWatch({ control, name: 'diasSemana' }) ?? [];
  const dataInicio = useWatch({ control, name: 'dataInicio' });
  const dataFim = useWatch({ control, name: 'dataFim' });
  const { errors } = useFormState({ control });

  // Lógica de detecção de conflito
  const conflitoDetectado = useMemo(() => {
    if (tipo === 'LIMITE_MENSAL') return null; // LIMITE_MENSAL não usa escopo de função

    const regraConflitante = regrasExistentes.find((regra) => {
      // Ignora a regra sendo editada se estamos em modo edição
      if (isEditing && regra.id === editingRegraId) return false;

      if (regra.tipo === 'LIMITE_MENSAL') return false; // ignora limite mensal

      const temMinisterios = ministeriosInteirosIds && ministeriosInteirosIds.length > 0;
      const regraTemMinisterios =
        regra.ministeriosInteirosIds && regra.ministeriosInteirosIds.length > 0;

      // Se ambas bloqueiam tudo (sem ministério)
      if (!temMinisterios && !regraTemMinisterios) return true;

      // Se ambas têm ministério em comum
      if (temMinisterios && regraTemMinisterios) {
        const ministInterseção = ministeriosInteirosIds.filter((m) =>
          regra.ministeriosInteirosIds?.includes(m),
        );
        if (ministInterseção.length === 0) return false;

        // Verifica funções desses ministérios em comum
        for (const ministId of ministInterseção) {
          const temFuncoesNeste = funcoesIds && funcoesIds.length > 0;
          const regraTemFuncoesNeste = regra.funcoesIds && regra.funcoesIds.length > 0;

          // Se ambas bloqueiam o ministério inteiro (sem função)
          if (!temFuncoesNeste && !regraTemFuncoesNeste) return true;

          // Se uma bloqueia o ministério inteiro, ela cobre a outra
          if (temFuncoesNeste && !regraTemFuncoesNeste) return true;
          if (!temFuncoesNeste && regraTemFuncoesNeste) return false;

          // Se ambas têm funções, verifica sobreposição
          if (temFuncoesNeste && regraTemFuncoesNeste) {
            const overlap = funcoesIds.some((f) => regra.funcoesIds?.includes(f));
            if (overlap) return true;
          }
        }
      }

      return false;
    });

    return regraConflitante;
  }, [ministeriosInteirosIds, funcoesIds, tipo, regrasExistentes, isEditing, editingRegraId]);

  useEffect(() => {
    if (dataInicio && dataFim && dataFim < dataInicio) {
      setValue('dataFim', dataInicio, { shouldValidate: true });
    }
  }, [dataInicio, dataFim, setValue]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showEscopoSheet, setShowEscopoSheet] = useState(false);

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

    // Adiciona ministérios e funções (opcionais)
    result.ministeriosInteirosIds = values.ministeriosInteirosIds || undefined;
    if (values.funcoesIds?.length) {
      result.funcoesIds = values.funcoesIds;
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
    <>
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

          {/* ESCOPO: MINISTÉRIOS E FUNÇÕES */}
          {tipo !== 'LIMITE_MENSAL' && (
            <>
              {simplifiedMode ? (
                <>
                  <View style={styles.secao}>
                    <FancyText size='small' type='semiBold' color={palette.fonts.inactive}>
                      Funções deste ministério
                    </FancyText>
                    <View style={styles.chipRow}>
                      {funcoesDoMinisterio.map((funcao) => {
                        const isSelected = funcoesIds?.includes(funcao.id) ?? false;
                        return (
                          <Pressable
                            key={funcao.id}
                            onPress={() => {
                              const newFuncoes = isSelected
                                ? (funcoesIds?.filter((f) => f !== funcao.id) ?? [])
                                : [...(funcoesIds ?? []), funcao.id];
                              setValue('funcoesIds', newFuncoes, { shouldValidate: true });
                            }}
                            disabled={isSubmitting}
                            style={[
                              styles.chip,
                              isSelected
                                ? { backgroundColor: palette.primary, borderColor: palette.primary }
                                : {
                                    backgroundColor: ColorUtils.withAlpha(palette.primary, 0.08),
                                    borderColor: ColorUtils.withAlpha(palette.primary, 0.19),
                                  },
                            ]}
                          >
                            <FancyText
                              size='small'
                              type='semiBold'
                              color={isSelected ? palette.fonts.light : palette.primary}
                            >
                              {funcao.nome}
                            </FancyText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                    Deixe em branco para bloquear o ministério inteiro.
                  </FancyText>
                </>
              ) : (
                <>
                  <EscopoIndisponibilidadeField
                    ministeriosInteirosIds={ministeriosInteirosIds}
                    funcoesIds={funcoesIds}
                    ministerios={ministeriosData ?? []}
                    funcoes={allFuncoes ?? []}
                    label='Onde vale'
                    disabled={isSubmitting}
                    onPress={() => setShowEscopoSheet(true)}
                  />
                  <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                    Deixe em branco para bloquear em todos os ministérios.
                  </FancyText>
                </>
              )}
            </>
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
              {errors.diasSemana && (
                <FancyErrorText message={errors.diasSemana.message as string} />
              )}
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
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                {voluntarioNome
                  ? `${voluntarioNome.split(' ')[0]} não poderá ser escalado mais que este número de vezes neste ministério em um mesmo mês, a partir da data escolhida.`
                  : 'Você não será escalado mais que este número de vezes em um mesmo mês, a partir da data escolhida.'}
              </FancyText>
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

      {/* Sheet de seleção de escopo — só aparece em modo normal */}
      {!simplifiedMode && (
        <EscopoIndisponibilidadeSheet
          visible={showEscopoSheet}
          onClose={() => setShowEscopoSheet(false)}
          onConfirm={(novosMinisteios, novasFuncoes) => {
            setValue(
              'ministeriosInteirosIds',
              novosMinisteios.length > 0 ? novosMinisteios : undefined,
            );
            setValue('funcoesIds', novasFuncoes);
            setShowEscopoSheet(false);
          }}
          ministeriosInteirosIds={ministeriosInteirosIds}
          funcoesIds={funcoesIds}
          ministerios={ministeriosData ?? []}
          funcoes={allFuncoes ?? []}
          isLoading={isSubmitting}
        />
      )}
    </>
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
