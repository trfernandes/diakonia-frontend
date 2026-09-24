import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import z from 'zod';
import Toast from 'react-native-toast-message';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import FancyScrollView from '../../../../../components/FancyScrollView';
import FancyText from '../../../../../components/FancyText';
import FancyButton from '../../../../../components/buttons/FancyButton';
import ControlledDateInput from '../../../../../components/forms/ControlledDateInput';
import { useAppTheme } from '../../../../../hooks/useAppTheme';
import { ColorUtils } from '../../../../../utils/color_utils';
import { normalizeAxiosError } from '../../../../../core/errors/normalizeAxiosError';
import {
  useLancamentoConfig,
  useLancamentosDoMinisterio,
} from '../../../../../hooks/useLancamentosIndisponibilidade';
import { useVoluntariosDoMinisterioCrud } from '../../../../../hooks/useVoluntariosDoMinisterioCrud';
import {
  agendaDeAvisos,
  formatarDiaMes,
  hojeYmd,
  mesesDoPeriodo,
  nomeMes,
  proximoMesInteiro,
  somarDias,
  ymdDeDate,
} from '../../../../../domain/utils/lancamento_indisponibilidade_utils';

const dateDeYmd = (ymd: string) => {
  const [a, m, d] = ymd.split('-').map(Number);
  return new Date(a, m - 1, d);
};

const schema = z
  .object({
    periodoInicio: z.date({ error: 'Informe o início' }),
    periodoFim: z.date({ error: 'Informe o fim' }),
    prazo: z.date({ error: 'Informe o prazo' }),
  })
  .refine((v) => ymdDeDate(v.periodoFim) >= ymdDeDate(v.periodoInicio), {
    path: ['periodoFim'],
    message: 'O fim precisa ser depois do início',
  })
  .refine((v) => ymdDeDate(v.prazo) >= hojeYmd(), {
    path: ['prazo'],
    message: 'O prazo não pode ser no passado',
  })
  .refine((v) => ymdDeDate(v.prazo) <= ymdDeDate(v.periodoFim), {
    path: ['prazo'],
    message: 'O prazo precisa ser até o fim do período',
  });

type FormValues = z.infer<typeof schema>;

const ROTULO_AVISO = {
  inicial: 'aviso inicial',
  lembrete: 'lembrete pra quem ainda não marcou',
  vespera: 'véspera do prazo',
} as const;

export default function NovoLancamentoPage() {
  const { palette, isDark } = useAppTheme();
  const { ministerioId } = useLocalSearchParams<{ ministerioId?: string }>();
  const { criarLancamento, isCriando } = useLancamentosDoMinisterio(ministerioId);
  const { config } = useLancamentoConfig(ministerioId);
  const { voluntariosList } = useVoluntariosDoMinisterioCrud(ministerioId);

  const hoje = hojeYmd();
  const sugestao = proximoMesInteiro(hoje);

  const { control, handleSubmit, watch } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodoInicio: dateDeYmd(sugestao.inicio),
      periodoFim: dateDeYmd(sugestao.fim),
      prazo: dateDeYmd(somarDias(hoje, 7)),
    },
  });

  const [inicio, fim, prazo] = watch(['periodoInicio', 'periodoFim', 'prazo']);
  const inicioYmd = inicio ? ymdDeDate(inicio) : undefined;
  const fimYmd = fim ? ymdDeDate(fim) : undefined;
  const prazoYmd = prazo ? ymdDeDate(prazo) : undefined;

  const avisos = useMemo(
    () => (prazoYmd && prazoYmd > hoje ? agendaDeAvisos(hoje, prazoYmd) : []),
    [hoje, prazoYmd],
  );

  // Automático agendado pra um mês que este lançamento já cobre deixa de sair (backend pula sozinho).
  const mesesAutomaticoPulados = useMemo(() => {
    if (!config?.ativo || !inicioYmd || !fimYmd || fimYmd < inicioYmd) return [];
    const meses = mesesDoPeriodo(inicioYmd, fimYmd);
    return config.proximos
      .filter((p) => p.status === 'envia' && meses.includes(p.mesAlvo))
      .map((p) => p.mesAlvo);
  }, [config, inicioYmd, fimYmd]);

  const total = voluntariosList.length;
  const fundoAviso = isDark
    ? palette.backgroundColor4
    : ColorUtils.lightenColor(palette.primary, 0.96);

  const enviar = handleSubmit(async (values) => {
    try {
      await criarLancamento({
        periodoInicio: ymdDeDate(values.periodoInicio),
        periodoFim: ymdDeDate(values.periodoFim),
        prazo: ymdDeDate(values.prazo),
      });
      Toast.show({
        type: 'success',
        text1: 'Lançamento enviado',
        text2: 'Os voluntários receberam o aviso no celular.',
      });
      router.back();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Não foi possível enviar',
        text2: normalizeAxiosError(error).message,
      });
    }
  });

  return (
    <FancyPageView>
      <FancyScrollView contentContainerStyle={styles.conteudo}>
        <FancyText size='small' color={palette.fonts.inactive2}>
          Os voluntários do ministério recebem um aviso no celular pedindo pra cadastrar os dias em
          que não podem servir. Quem não marcar &quot;Já lancei&quot; recebe lembretes até o prazo.
        </FancyText>

        <View style={styles.secao}>
          <FancyText type='semiBold'>Período que vão preencher</FancyText>
          <View style={styles.linha}>
            <View style={{ flex: 1 }}>
              <ControlledDateInput control={control} name='periodoInicio' label='De' />
            </View>
            <View style={{ flex: 1 }}>
              <ControlledDateInput control={control} name='periodoFim' label='Até' />
            </View>
          </View>
        </View>

        <View style={styles.secao}>
          <FancyText type='semiBold'>Até quando</FancyText>
          <ControlledDateInput control={control} name='prazo' label='Prazo' />
          <FancyText size='extraSmall' color={palette.fonts.inactive2}>
            Depois do prazo os lembretes param e você pode gerar a escala.
          </FancyText>
        </View>

        {avisos.length > 0 && (
          <View style={[styles.cartao, { backgroundColor: fundoAviso }]}>
            <FancyText type='semiBold'>Avisos que vão sair</FancyText>
            {avisos.map((aviso) => (
              <View key={aviso.data} style={styles.linhaAviso}>
                <View style={[styles.dot, { backgroundColor: palette.primary }]} />
                <FancyText size='small' style={{ flex: 1 }}>
                  <FancyText size='small' type='semiBold'>
                    {aviso.data === hoje ? 'Hoje' : formatarDiaMes(aviso.data)}
                  </FancyText>
                  {` · ${ROTULO_AVISO[aviso.tipo]}`}
                </FancyText>
              </View>
            ))}
          </View>
        )}

        {mesesAutomaticoPulados.length > 0 && (
          <View
            style={[
              styles.cartao,
              { backgroundColor: ColorUtils.withAlpha(palette.warning, 0.14) },
            ]}
          >
            <FancyText size='small'>
              {`O lançamento automático de ${mesesAutomaticoPulados.map(nomeMes).join(', ')} não vai sair — este já cobre ${mesesAutomaticoPulados.length > 1 ? 'esses meses' : 'esse mês'}.`}
            </FancyText>
          </View>
        )}

        <FancyButton
          label={total > 0 ? `Enviar para ${total} voluntário${total === 1 ? '' : 's'}` : 'Enviar'}
          isLoading={isCriando}
          onPress={enviar}
        />
      </FancyScrollView>
    </FancyPageView>
  );
}

const styles = StyleSheet.create({
  conteudo: { gap: 20, paddingBottom: 30 },
  secao: { gap: 10 },
  linha: { flexDirection: 'row', gap: 10 },
  cartao: { borderRadius: 16, padding: 15, gap: 8 },
  linhaAviso: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
