import { StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import FancyText from '../../FancyText';
import FancyButton from '../../buttons/FancyButton';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { ColorUtils } from '../../../utils/color_utils';
import { normalizeAxiosError } from '../../../core/errors/normalizeAxiosError';
import { MeuLancamento } from '../../../domain/api/LancamentosIndisponibilidadeApi';
import {
  formatarDiaMes,
  rotuloPeriodo,
  ymdDeDate,
} from '../../../domain/utils/lancamento_indisponibilidade_utils';

type Props = {
  lancamento: MeuLancamento;
  onMarcar: (lancamentoId: string) => Promise<unknown>;
  onDesfazer: (lancamentoId: string) => Promise<unknown>;
  isMutating: boolean;
};

/**
 * Pedido do líder pra o voluntário cadastrar as datas em que não pode servir.
 * Fica no topo de Pessoal > Indisponibilidade até o prazo. "Já lancei" só avisa o líder
 * que a pessoa terminou — não trava nada, e dá pra desfazer até o prazo.
 */
export default function LancamentoPendenteCard({
  lancamento,
  onMarcar,
  onDesfazer,
  isMutating,
}: Props) {
  const { palette, isDark } = useAppTheme();
  const fundo = isDark ? palette.backgroundColor4 : ColorUtils.lightenColor(palette.primary, 0.96);
  const periodo = rotuloPeriodo(lancamento.periodoInicio, lancamento.periodoFim);
  const prazo = formatarDiaMes(lancamento.prazo);

  const executar = async (acao: () => Promise<unknown>, erro: string) => {
    try {
      await acao();
    } catch (error) {
      Toast.show({ type: 'error', text1: erro, text2: normalizeAxiosError(error).message });
    }
  };

  if (lancamento.jaLancei) {
    const marcadoEm = lancamento.marcadoEm
      ? formatarDiaMes(ymdDeDate(new Date(lancamento.marcadoEm)))
      : '';
    return (
      <View style={[styles.card, styles.linha, { backgroundColor: fundo }, palette.shadows[100]]}>
        <View style={[styles.dot, { backgroundColor: palette.confirm }]} />
        <FancyText size='small' style={{ flex: 1 }}>
          {lancamento.ministerioNome} · {periodo}: você marcou em {marcadoEm}
        </FancyText>
        <FancyButton
          type='text'
          label='Desfazer'
          disabled={isMutating}
          onPress={() =>
            executar(() => onDesfazer(lancamento.lancamentoId), 'Não foi possível desfazer')
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: fundo }, palette.shadows[200]]}>
      <View style={styles.linha}>
        <FancyText size='small' type='semiBold' color={palette.primary} style={{ flex: 1 }}>
          {lancamento.ministerioNome} pede
        </FancyText>
        <View
          style={[styles.chip, { backgroundColor: ColorUtils.withAlpha(palette.warning, 0.14) }]}
        >
          <FancyText size='extraSmall' type='semiBold'>
            prazo {prazo}
          </FancyText>
        </View>
      </View>

      <FancyText size='largeMedium' type='bold'>
        Cadastre suas datas de {periodo}
      </FancyText>
      <FancyText size='small' color={palette.fonts.inactive2}>
        {`Período ${formatarDiaMes(lancamento.periodoInicio)} a ${formatarDiaMes(lancamento.periodoFim)}. O líder vai montar a escala depois do prazo.`}
      </FancyText>

      <FancyButton
        label='Já lancei minhas datas'
        isLoading={isMutating}
        onPress={() => executar(() => onMarcar(lancamento.lancamentoId), 'Não foi possível marcar')}
      />
      <FancyText size='extraSmall' color={palette.fonts.inactive2} style={{ textAlign: 'center' }}>
        Livre o mês todo? Pode marcar mesmo sem cadastrar nada.
      </FancyText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 15, gap: 10 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
