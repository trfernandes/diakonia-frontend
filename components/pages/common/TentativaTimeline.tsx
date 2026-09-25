import React from 'react';
import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FancyText from '../../FancyText';
import DefaultIcons from '../../FancyIcons';
import { usePallete } from '../../../hooks/usePallete';
import { ColorUtils } from '../../../utils/color_utils';
import { ThemePalette } from '../../../constants/colors';
import { ResponseTentativaDto } from '../../../domain/dtos/SubstituicaoPedido/tentativa.response';
import {
  TentativaStatusEnum,
  TentativaStatusEnumLabel,
} from '../../../domain/enums/SubstituicaoPedido/tentativa-status.enum';
import { useTentativasDoPedido } from '../../../hooks/useSubstituicaoPedidosCrud';

function getTentativaVisual(status: TentativaStatusEnum | null | undefined, palette: ThemePalette) {
  switch (status) {
    case TentativaStatusEnum.Aceita:
      return { color: palette.confirm, icon: 'check-circle' };
    case TentativaStatusEnum.Recusada:
      return { color: palette.error, icon: 'cancel' };
    case TentativaStatusEnum.ExpiradaPrazo:
      return { color: palette.fonts.inactive, icon: 'schedule' };
    case TentativaStatusEnum.VetadaPeloLider:
      return { color: palette.error, icon: 'block' };
    case TentativaStatusEnum.AguardandoGateLider:
    case TentativaStatusEnum.AguardandoConfirmacaoSolicitante:
      return { color: palette.warning, icon: 'hourglass-empty' };
    case TentativaStatusEnum.Convidada:
    default:
      return { color: palette.secondary, icon: 'send' };
  }
}

function firstAndLast(full?: string) {
  if (!full?.trim()) return '—';
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

type Props = {
  pedidoId: string;
};

export default function TentativaTimeline({ pedidoId }: Props) {
  const palette = usePallete();
  const { data: tentativas, isLoading } = useTentativasDoPedido(pedidoId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <FancyText size='small' color={palette.fonts.inactive}>
          Carregando histórico...
        </FancyText>
      </View>
    );
  }

  if (!tentativas || tentativas.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <FancyText size='small' color={palette.fonts.inactive}>
          Nenhuma tentativa registrada ainda.
        </FancyText>
      </View>
    );
  }

  const ordenadas = [...tentativas].sort(
    (a, b) => new Date(a.dataSolicitacao).getTime() - new Date(b.dataSolicitacao).getTime(),
  );

  return (
    <View style={styles.container}>
      {ordenadas.map((tentativa, index) => {
        const visual = getTentativaVisual(tentativa.tentativaStatus, palette);
        const label = tentativa.tentativaStatus
          ? TentativaStatusEnumLabel[tentativa.tentativaStatus]
          : '—';
        const nome = firstAndLast(tentativa.substituto?.voluntario?.nome);
        const dataLabel = format(new Date(tentativa.dataSolicitacao), "dd/MM 'às' HH'h'mm", {
          locale: ptBR,
        });
        const isLast = index === ordenadas.length - 1;

        return (
          <View key={tentativa.id} style={styles.row}>
            <View style={styles.timelineCol}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: visual.color,
                    borderColor: ColorUtils.withAlpha(visual.color, 0.3),
                  },
                ]}
              >
                <DefaultIcons.Custom
                  library='MaterialIcons'
                  name={visual.icon}
                  size={11}
                  color={palette.fonts.light}
                />
              </View>
              {!isLast ? (
                <View style={[styles.line, { backgroundColor: palette.borderCard }]} />
              ) : null}
            </View>
            <View style={styles.textCol}>
              <FancyText size='small' type='bold' color={palette.fonts.dark}>
                {nome}
              </FancyText>
              <FancyText size='extraSmall' type='semiBold' color={visual.color}>
                {label}
              </FancyText>
              <FancyText size='extraSmall' type='normal' color={palette.fonts.inactive}>
                {dataLabel}
              </FancyText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  loadingWrap: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  timelineCol: {
    alignItems: 'center',
    width: 22,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
  },
  textCol: {
    flex: 1,
    paddingBottom: 12,
    gap: 1,
  },
});
