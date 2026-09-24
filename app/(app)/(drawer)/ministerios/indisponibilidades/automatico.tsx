import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import Toast from 'react-native-toast-message';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import FancyScrollView from '../../../../../components/FancyScrollView';
import FancyText from '../../../../../components/FancyText';
import FancyButton from '../../../../../components/buttons/FancyButton';
import FancyError from '../../../../../components/error/FancyError';
import ControlledFancyToggle from '../../../../../components/forms/ControlledFancyToggle';
import ControlledNumberInput from '../../../../../components/forms/ControlledNumberInput';
import { useAppTheme } from '../../../../../hooks/useAppTheme';
import { ColorUtils } from '../../../../../utils/color_utils';
import { normalizeAxiosError } from '../../../../../core/errors/normalizeAxiosError';
import { useLancamentoConfig } from '../../../../../hooks/useLancamentosIndisponibilidade';
import { ProximoEnvio } from '../../../../../domain/api/LancamentosIndisponibilidadeApi';
import {
  capitalizar,
  formatarDiaMes,
  nomeMes,
} from '../../../../../domain/utils/lancamento_indisponibilidade_utils';

const schema = z
  .object({
    ativo: z.boolean(),
    diaEnvio: z.number().int().min(1, 'Entre 1 e 28').max(28, 'Entre 1 e 28'),
    diaPrazo: z.number().int().min(1, 'Entre 1 e 28').max(28, 'Entre 1 e 28'),
  })
  .refine((v) => !v.ativo || v.diaPrazo > v.diaEnvio, {
    path: ['diaPrazo'],
    message: 'O prazo precisa ser depois do dia de envio',
  });

type FormValues = z.infer<typeof schema>;

function motivoInativo(envio: ProximoEnvio): string {
  if (envio.status === 'pulado') return 'pulado por você';
  return envio.coberturaOrigem === 'MANUAL' ? 'pulado · você criou um manual' : 'já enviado';
}

export default function LancamentoAutomaticoPage() {
  const { palette, isDark } = useAppTheme();
  const { ministerioId } = useLocalSearchParams<{ ministerioId?: string }>();
  const {
    config,
    isLoading,
    isError,
    salvarConfig,
    isSalvando,
    pularMes,
    despularMes,
    isAlterandoMes,
  } = useLancamentoConfig(ministerioId);

  const { control, handleSubmit, reset, watch, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ativo: false, diaEnvio: 20, diaPrazo: 27 },
  });

  useEffect(() => {
    if (!config) return;
    reset({
      ativo: config.ativo,
      diaEnvio: config.diaEnvio ?? 20,
      diaPrazo: config.diaPrazo ?? 27,
    });
  }, [config, reset]);

  const ativo = watch('ativo');
  const fundo = isDark ? palette.backgroundColor4 : ColorUtils.lightenColor(palette.primary, 0.96);

  const salvar = handleSubmit(async (values) => {
    try {
      await salvarConfig(
        values.ativo
          ? { ativo: true, diaEnvio: values.diaEnvio, diaPrazo: values.diaPrazo }
          : { ativo: false },
      );
      Toast.show({
        type: 'success',
        text1: values.ativo ? 'Automático ligado' : 'Automático desligado',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Não foi possível salvar',
        text2: normalizeAxiosError(error).message,
      });
    }
  });

  const alternarMes = async (envio: ProximoEnvio) => {
    try {
      if (envio.status === 'pulado') await despularMes(envio.mesAlvo);
      else await pularMes(envio.mesAlvo);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Não foi possível alterar o mês',
        text2: normalizeAxiosError(error).message,
      });
    }
  };

  if (isError) return <FancyError.Default />;

  if (isLoading || !config) {
    return (
      <FancyPageView>
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator size='large' />
        </View>
      </FancyPageView>
    );
  }

  return (
    <FancyPageView>
      <FancyScrollView contentContainerStyle={styles.conteudo}>
        <FancyText size='small' color={palette.fonts.inactive2}>
          Todo mês, no dia de envio, o app pede sozinho as indisponibilidades do mês seguinte. Os
          voluntários recebem o aviso e os lembretes, igual a um lançamento manual.
        </FancyText>

        <ControlledFancyToggle
          control={control}
          name='ativo'
          label='Ligado'
          option1={{ title: 'Não', value: false }}
          option2={{ title: 'Sim', value: true }}
        />

        {ativo && (
          <View style={styles.linha}>
            <View style={{ flex: 1 }}>
              <ControlledNumberInput
                control={control}
                name='diaEnvio'
                title='Enviar dia'
                min={1}
                max={28}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ControlledNumberInput
                control={control}
                name='diaPrazo'
                title='Prazo dia'
                min={1}
                max={28}
              />
            </View>
          </View>
        )}
        {ativo && (
          <FancyText size='extraSmall' color={palette.fonts.inactive2}>
            Ex.: enviar dia 20 e prazo dia 27 — em 20/10 sai o pedido de novembro, com prazo 27/10.
            Dias até 28 pra funcionar em fevereiro.
          </FancyText>
        )}

        {config.ativo && config.proximos.length > 0 && (
          <View style={[styles.cartao, { backgroundColor: fundo }]}>
            <FancyText type='semiBold'>Próximos envios</FancyText>
            {config.proximos.map((envio) => {
              const inativo = envio.status !== 'envia';
              return (
                <View key={envio.mesAlvo} style={[styles.linhaEnvio, inativo && { opacity: 0.55 }]}>
                  <View style={{ flex: 1 }}>
                    <FancyText size='small' type='semiBold'>
                      {capitalizar(nomeMes(envio.mesAlvo))}
                    </FancyText>
                    <FancyText size='extraSmall' color={palette.fonts.inactive2}>
                      {inativo
                        ? motivoInativo(envio)
                        : `envia ${formatarDiaMes(envio.envio)} · prazo ${formatarDiaMes(envio.prazo)}`}
                    </FancyText>
                  </View>
                  {envio.status !== 'coberto' && (
                    <FancyButton
                      type='text'
                      label={envio.status === 'pulado' ? 'Voltar a enviar' : 'Pular'}
                      disabled={isAlterandoMes}
                      onPress={() => alternarMes(envio)}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
        {ativo && !config.ativo && (
          <FancyText size='extraSmall' color={palette.fonts.inactive2}>
            Salve pra ver os próximos envios.
          </FancyText>
        )}

        <FancyButton
          label='Salvar'
          isLoading={isSalvando}
          disabled={!formState.isDirty}
          onPress={salvar}
        />
      </FancyScrollView>
    </FancyPageView>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: 20, paddingBottom: 30 },
  linha: { flexDirection: 'row', gap: 10 },
  cartao: { borderRadius: 16, padding: 15, gap: 10 },
  linhaEnvio: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
