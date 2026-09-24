import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import FancyText from '../../FancyText';
import FancyButton from '../../buttons/FancyButton';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { useResumoLancamentos } from '../../../hooks/useLancamentosIndisponibilidade';
import {
  formatarDiaMes,
  rotuloPeriodo,
  ymdDeDate,
} from '../../../domain/utils/lancamento_indisponibilidade_utils';
import { FaltantesSheet } from './LancamentoTimelineCard';

type Props = { ministerioId?: string; dataInicio?: Date; dataTermino?: Date };

const ymdSeguro = (data?: Date) => {
  if (!data) return undefined;
  const d = new Date(data);
  return Number.isNaN(d.getTime()) ? undefined : ymdDeDate(d);
};

/**
 * Assistente de escala: avisa (sem bloquear) quando o período escolhido ainda tem
 * Lançamento de Indisponibilidade com prazo aberto — a escala pode sair sem as datas de quem falta.
 */
export default function PrazoAbertoCard({ ministerioId, dataInicio, dataTermino }: Props) {
  const { palette } = useAppTheme();
  const { resumo } = useResumoLancamentos(
    ministerioId,
    ymdSeguro(dataInicio),
    ymdSeguro(dataTermino),
  );
  const [dispensados, setDispensados] = useState<string[]>([]);
  const [faltantesDe, setFaltantesDe] = useState<string | null>(null);

  const abertos = resumo.filter(
    (l) => l.aberto && l.jaLancei < l.total && !dispensados.includes(l.id),
  );
  if (!ministerioId || abertos.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      {abertos.map((lancamento) => (
        <View
          key={lancamento.id}
          style={[
            styles.card,
            { backgroundColor: palette.backgroundColor, borderColor: palette.border },
          ]}
        >
          <View style={styles.linha}>
            <View style={[styles.dot, { backgroundColor: palette.warning }]} />
            <FancyText type='semiBold'>Prazo ainda aberto</FancyText>
          </View>
          <FancyText size='small' color={palette.fonts.inactive2}>
            {`O lançamento de ${rotuloPeriodo(lancamento.periodoInicio, lancamento.periodoFim)} fecha em ${formatarDiaMes(lancamento.prazo)}. Hoje ${lancamento.jaLancei} de ${lancamento.total} marcaram.`}
          </FancyText>
          <View style={styles.linha}>
            <FancyButton
              type='outlined'
              label='Ver quem falta'
              onPress={() => setFaltantesDe(lancamento.id)}
              containerStyle={{ flex: 1 }}
            />
            <FancyButton
              type='text'
              label='Gerar mesmo assim'
              onPress={() => setDispensados((d) => [...d, lancamento.id])}
            />
          </View>
        </View>
      ))}

      {faltantesDe && (
        <FaltantesSheet
          visible
          onClose={() => setFaltantesDe(null)}
          ministerioId={ministerioId}
          lancamentoId={faltantesDe}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 15, gap: 10, borderWidth: 1 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
