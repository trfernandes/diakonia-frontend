import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import FancyText from '../../FancyText';
import FancyButton from '../../buttons/FancyButton';
import FancyBottomSheetModal from '../../modal/FancyBottomSheetModal';
import FancyScrollView from '../../FancyScrollView';
import FancyListEmpty from '../../list/FancyListEmpty';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { ColorUtils } from '../../../utils/color_utils';
import {
  useLancamentoDetalhe,
  useLancamentosDoMinisterio,
} from '../../../hooks/useLancamentosIndisponibilidade';
import {
  capitalizar,
  formatarDiaMes,
  hojeYmd,
  iniciais,
  proximoAviso,
  rotuloPeriodo,
  ymdDeDate,
} from '../../../domain/utils/lancamento_indisponibilidade_utils';

/** criadoEm vem como timestamp ISO; data pura ('yyyy-MM-dd') passa direto sem cair no fuso UTC. */
export function ymdDoCriadoEm(criadoEm: string): string {
  return criadoEm.length === 10 ? criadoEm : ymdDeDate(new Date(criadoEm));
}

type Props = { ministerioId: string };

/**
 * Topo de Ministérios > Indisponibilidades (só líder): acompanha o Lançamento aberto
 * em forma de linha do tempo — o que já saiu, o próximo aviso e o prazo.
 */
export default function LancamentoTimelineCard({ ministerioId }: Props) {
  const { palette, isDark } = useAppTheme();
  const { lancamentos, isLoading } = useLancamentosDoMinisterio(ministerioId);
  const [faltantesVisivel, setFaltantesVisivel] = useState(false);

  const fundo = isDark ? palette.backgroundColor4 : ColorUtils.lightenColor(palette.primary, 0.96);
  const aberto = lancamentos.find((l) => l.aberto);

  const irParaNovo = () =>
    router.push({
      pathname: '/ministerios/indisponibilidades/novo-lancamento',
      params: { ministerioId },
    });
  const irParaAutomatico = () =>
    router.push({
      pathname: '/ministerios/indisponibilidades/automatico',
      params: { ministerioId },
    });

  const acoes = (
    <View style={styles.acoes}>
      <FancyButton
        type='outlined'
        label='Novo lançamento'
        icon={{ library: 'MaterialCommunityIcons', name: 'plus', size: 18 }}
        onPress={irParaNovo}
        containerStyle={{ flex: 1 }}
      />
      <FancyButton
        type='text'
        label='Automático'
        icon={{ library: 'MaterialCommunityIcons', name: 'chevron-right', size: 18 }}
        iconPosition='right'
        onPress={irParaAutomatico}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: fundo }, palette.shadows[200]]}>
        <ActivityIndicator size='small' />
      </View>
    );
  }

  if (!aberto) {
    return (
      <View style={[styles.card, { backgroundColor: fundo }, palette.shadows[200]]}>
        <FancyText type='semiBold'>Pedir as indisponibilidades da equipe</FancyText>
        <FancyText size='small' color={palette.fonts.inactive2}>
          Antes de montar a escala, peça pros voluntários cadastrarem os dias em que não podem
          servir. Eles recebem aviso no celular e lembretes até o prazo.
        </FancyText>
        {acoes}
      </View>
    );
  }

  const hoje = hojeYmd();
  const criadoEm = ymdDoCriadoEm(aberto.criadoEm);
  const faltam = aberto.total - aberto.jaLancei;
  const proximo = faltam > 0 ? proximoAviso(criadoEm, aberto.prazo, hoje) : null;
  const periodo = capitalizar(rotuloPeriodo(aberto.periodoInicio, aberto.periodoFim));

  const passos: { titulo: string; detalhe: string; feito: boolean }[] = [
    {
      titulo: `Enviado ${formatarDiaMes(criadoEm)}`,
      detalhe: `${aberto.total} voluntário${aberto.total === 1 ? '' : 's'}`,
      feito: true,
    },
  ];
  if (proximo) {
    passos.push({
      titulo: `${proximo.tipo === 'vespera' ? 'Véspera' : 'Lembrete'} ${formatarDiaMes(proximo.data)}`,
      detalhe: `vai pra ${faltam} que falta${faltam === 1 ? '' : 'm'}`,
      feito: false,
    });
  }
  passos.push({
    titulo: `Prazo ${formatarDiaMes(aberto.prazo)}`,
    detalhe: 'depois disso, gere a escala',
    feito: false,
  });

  return (
    <View style={[styles.card, { backgroundColor: fundo }, palette.shadows[200]]}>
      <View style={styles.linha}>
        <FancyText type='bold' style={{ flex: 1 }}>
          {periodo} · {aberto.jaLancei} de {aberto.total}
        </FancyText>
        <View
          style={[styles.chip, { backgroundColor: ColorUtils.withAlpha(palette.warning, 0.14) }]}
        >
          <FancyText size='extraSmall' type='semiBold'>
            prazo {formatarDiaMes(aberto.prazo)}
          </FancyText>
        </View>
      </View>

      <View>
        {passos.map((passo, index) => (
          <View key={passo.titulo} style={styles.passo}>
            <View style={styles.trilho}>
              <View
                style={[
                  styles.bolinha,
                  passo.feito
                    ? { backgroundColor: palette.primary }
                    : { borderWidth: 2, borderColor: palette.primary },
                ]}
              />
              {index < passos.length - 1 && (
                <View style={[styles.linhaTrilho, { backgroundColor: palette.border }]} />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: index < passos.length - 1 ? 12 : 0 }}>
              <FancyText size='small' type='semiBold'>
                {passo.titulo}
              </FancyText>
              <FancyText size='extraSmall' color={palette.fonts.inactive2}>
                {passo.detalhe}
              </FancyText>
            </View>
          </View>
        ))}
      </View>

      {faltam > 0 ? (
        <FancyButton
          type='text'
          label={`Ver os ${faltam} que faltam`}
          onPress={() => setFaltantesVisivel(true)}
        />
      ) : (
        <FancyText size='small' color={palette.fonts.inactive2}>
          Todos já marcaram. Pode gerar a escala.
        </FancyText>
      )}

      {acoes}

      <FaltantesSheet
        visible={faltantesVisivel}
        onClose={() => setFaltantesVisivel(false)}
        ministerioId={ministerioId}
        lancamentoId={aberto.id}
      />
    </View>
  );
}

type FaltantesSheetProps = {
  visible: boolean;
  onClose: () => void;
  ministerioId: string;
  lancamentoId: string;
};

/** Quem ainda não marcou "Já lancei" no Lançamento. Usado aqui e no assistente de escala. */
export function FaltantesSheet({
  visible,
  onClose,
  ministerioId,
  lancamentoId,
}: FaltantesSheetProps) {
  const { palette } = useAppTheme();
  const { detalhe, isLoading } = useLancamentoDetalhe(
    visible ? ministerioId : undefined,
    lancamentoId,
  );

  return (
    <FancyBottomSheetModal visible={visible} onClose={onClose} title='Ainda não marcaram'>
      {isLoading || !detalhe ? (
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator size='large' />
        </View>
      ) : detalhe.faltantes.length === 0 ? (
        <FancyListEmpty
          label='Todos já marcaram'
          helperText='Pode gerar a escala com as indisponibilidades cadastradas.'
        />
      ) : (
        <FancyScrollView contentContainerStyle={{ gap: 10, paddingBottom: 15 }}>
          <FancyText size='small' color={palette.fonts.inactive2}>
            Eles vão receber os próximos lembretes automaticamente até o prazo.
          </FancyText>
          {detalhe.faltantes.map((f) => (
            <View key={f.voluntarioId} style={styles.linha}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12) },
                ]}
              >
                <FancyText size='extraSmall' type='semiBold' color={palette.primary}>
                  {iniciais(f.nome)}
                </FancyText>
              </View>
              <FancyText style={{ flex: 1 }}>{f.nome}</FancyText>
            </View>
          ))}
        </FancyScrollView>
      )}
    </FancyBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 15, gap: 12 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  passo: { flexDirection: 'row', gap: 10 },
  trilho: { alignItems: 'center', width: 14 },
  bolinha: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  linhaTrilho: { width: 2, flex: 1, marginTop: 2 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
