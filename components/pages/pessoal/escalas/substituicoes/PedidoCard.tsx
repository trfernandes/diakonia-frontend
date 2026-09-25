import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FancyText from '../../../../FancyText';
import DefaultIcons from '../../../../FancyIcons';
import FancyButton from '../../../../buttons/FancyButton';
import FancyChips from '../../../../FancyChips';
import FancySeparator from '../../../../FancySeparator';
import { usePallete } from '../../../../../hooks/usePallete';
import { ColorUtils } from '../../../../../utils/color_utils';
import { ThemePalette } from '../../../../../constants/colors';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import { PedidoComPendencia } from '../../../../../domain/dtos/SubstituicaoPedido/substituicao-pedido.response';
import {
  SubstituicaoPedidoStatusEnum,
  SubstituicaoPedidoStatusEnumLabel,
} from '../../../../../domain/enums/SubstituicaoPedido/substituicao-pedido-status.enum';
import { TentativaStatusEnum } from '../../../../../domain/enums/SubstituicaoPedido/tentativa-status.enum';
import TentativaTimeline from '../../../common/TentativaTimeline';

function getStatusVisual(status: SubstituicaoPedidoStatusEnum, palette: ThemePalette) {
  switch (status) {
    case SubstituicaoPedidoStatusEnum.Aberto:
      return { color: palette.warning, icon: 'schedule' };
    case SubstituicaoPedidoStatusEnum.Resolvido:
      return { color: palette.confirm, icon: 'check-circle' };
    case SubstituicaoPedidoStatusEnum.Cancelado:
      return { color: palette.fonts.inactive, icon: 'cancel' };
    case SubstituicaoPedidoStatusEnum.SemCandidato:
      return { color: palette.error, icon: 'person-off' };
  }
}

type Props = {
  item: PedidoComPendencia;
  isSolicitante: boolean;
  isSuaVez: boolean;
  isActing: boolean;
  onAceitar: () => void;
  onRecusar: () => void;
  onCancelar: () => void;
  onIndicarVoluntario: () => void;
  onBuscarNovamente: () => void;
  onRemoverFuncao: () => void;
  onConfirmarTroca: () => void;
  onRecusarTroca: () => void;
};

export default function PedidoCard({
  item,
  isSolicitante,
  isSuaVez,
  isActing,
  onAceitar,
  onRecusar,
  onCancelar,
  onIndicarVoluntario,
  onBuscarNovamente,
  onRemoverFuncao,
  onConfirmarTroca,
  onRecusarTroca,
}: Props) {
  const palette = usePallete();
  const [expanded, setExpanded] = useState(false);
  const { pedido } = item;

  const visual = getStatusVisual(pedido.status, palette);
  const statusLabel = SubstituicaoPedidoStatusEnumLabel[pedido.status];

  const dataOcorrencia = pedido.escalaItem?.dataOcorrencia
    ? DateUtilsApi.dateOnlyFromApi(pedido.escalaItem.dataOcorrencia as string)
    : null;
  const dataFormatada = dataOcorrencia
    ? format(dataOcorrencia, "EEE, dd 'de' MMM", { locale: ptBR })
    : '—';
  const horaCurta = dataOcorrencia ? format(dataOcorrencia, "HH'h'mm", { locale: ptBR }) : '';

  const eventoNome = pedido.escalaItem?.evento?.nome ?? '—';
  const eventoCor = pedido.escalaItem?.evento?.cor ?? palette.fonts.inactive;
  const funcaoNome = pedido.escalaItem?.funcao?.nome;

  const isNaoTerminal =
    pedido.status === SubstituicaoPedidoStatusEnum.Aberto ||
    pedido.status === SubstituicaoPedidoStatusEnum.SemCandidato;
  const podeCancelar = isSolicitante && isNaoTerminal;
  const podeResponder =
    !isSolicitante && isSuaVez && pedido.status === SubstituicaoPedidoStatusEnum.Aberto;
  const semCandidato = isSolicitante && pedido.status === SubstituicaoPedidoStatusEnum.SemCandidato;

  // Troca (ADR-0013): candidato topou cobrir o dia do solicitante se ele cobrir um dia dele.
  const trocaPendente = isSolicitante
    ? pedido.tentativas?.find(
        (t) => t.tentativaStatus === TentativaStatusEnum.AguardandoConfirmacaoSolicitante,
      )
    : undefined;
  const nomeTroca = trocaPendente?.substituto?.voluntario?.nome?.trim().split(/\s+/)[0] ?? 'Alguém';
  const dataTroca = trocaPendente?.dataOferecidaEmTroca
    ? format(DateUtilsApi.dateOnlyFromApi(trocaPendente.dataOferecidaEmTroca), "EEE, dd 'de' MMM", {
        locale: ptBR,
      })
    : '—';

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: palette.backgroundColor,
            borderColor: isSuaVez ? palette.warning : palette.borderCard,
            borderWidth: isSuaVez ? 1.5 : 1,
            ...palette.shadows[100],
          },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <FancyChips
              label={statusLabel}
              color={visual.color}
              size='small'
              outlined
              icon={{ library: 'MaterialIcons', name: visual.icon, size: 12 }}
            />
            {funcaoNome ? (
              <FancyChips
                label={funcaoNome}
                color={palette.secondary}
                size='small'
                outlined
                icon={{ library: 'MaterialIcons', name: 'work-outline', size: 12 }}
              />
            ) : null}
          </View>

          <View style={styles.blockEvento}>
            <View style={styles.eventoTituloRow}>
              <View style={[styles.eventoColorDot, { backgroundColor: eventoCor }]} />
              <FancyText
                type='bold'
                size='medium'
                color={palette.fonts.dark}
                numberOfLines={2}
                style={styles.eventoTitulo}
              >
                {eventoNome}
              </FancyText>
            </View>
            <View style={styles.metaRow}>
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='calendar-clock-outline'
                size={13}
                color={palette.fonts.inactive}
              />
              <FancyText size='small' type='medium' color={palette.fonts.inactive}>
                {dataFormatada}
                {horaCurta ? ` · ${horaCurta}` : ''}
              </FancyText>
            </View>
          </View>

          {podeResponder ? (
            <>
              <FancySeparator />
              <View style={styles.actionsRow}>
                <FancyButton
                  type='outlined'
                  label='Recusar'
                  onPress={onRecusar}
                  isLoading={isActing}
                  disabled={isActing}
                  containerStyle={styles.actionBtn}
                />
                <FancyButton
                  type='contained'
                  label='Aceitar'
                  onPress={onAceitar}
                  isLoading={isActing}
                  disabled={isActing}
                  containerStyle={styles.actionBtn}
                />
              </View>
            </>
          ) : null}

          {trocaPendente ? (
            <>
              <FancySeparator />
              <View
                style={[
                  styles.trocaBox,
                  {
                    backgroundColor: ColorUtils.withAlpha(palette.warning, 0.1),
                    borderColor: ColorUtils.withAlpha(palette.warning, 0.4),
                  },
                ]}
              >
                <View style={styles.metaRow}>
                  <DefaultIcons.Custom
                    library='MaterialIcons'
                    name='swap-horiz'
                    size={16}
                    color={palette.warning}
                  />
                  <FancyText size='small' type='bold' color={palette.warning}>
                    AGUARDANDO VOCÊ
                  </FancyText>
                </View>
                <FancyText size='small' type='medium' color={palette.fonts.dark}>
                  {nomeTroca} topa te substituir se você cobrir o dia dele.
                </FancyText>
                <View style={styles.trocaLinha}>
                  <FancyText size='small' type='semiBold' color={palette.error}>
                    Você sai
                  </FancyText>
                  <FancyText
                    size='small'
                    type='medium'
                    color={palette.fonts.dark}
                    style={styles.flex}
                  >
                    {eventoNome} · {dataFormatada}
                  </FancyText>
                </View>
                <View style={styles.trocaLinha}>
                  <FancyText size='small' type='semiBold' color={palette.confirm}>
                    Você entra
                  </FancyText>
                  <FancyText
                    size='small'
                    type='medium'
                    color={palette.fonts.dark}
                    style={styles.flex}
                  >
                    {dataTroca}
                    {funcaoNome ? ` · ${funcaoNome}` : ''}
                  </FancyText>
                </View>
                <FancyText size='extraSmall' type='normal' color={palette.fonts.inactive}>
                  Ao confirmar, as duas escalas mudam na hora. Se recusar, seguimos buscando outra
                  pessoa.
                </FancyText>
              </View>
              <View style={styles.actionsRow}>
                <FancyButton
                  type='outlined'
                  label='Recusar'
                  onPress={onRecusarTroca}
                  isLoading={isActing}
                  disabled={isActing}
                  containerStyle={styles.actionBtn}
                />
                <FancyButton
                  type='contained'
                  label='Confirmar troca'
                  onPress={onConfirmarTroca}
                  isLoading={isActing}
                  disabled={isActing}
                  containerStyle={styles.actionBtn}
                />
              </View>
            </>
          ) : null}

          {semCandidato ? (
            <>
              <FancySeparator />
              <FancyText size='small' type='medium' color={palette.fonts.inactive}>
                Ninguém aceitou ainda. O que você quer fazer?
              </FancyText>
              <View style={styles.exitsCol}>
                <FancyButton
                  type='outlined'
                  label='Indicar voluntário'
                  onPress={onIndicarVoluntario}
                  disabled={isActing}
                />
                <FancyButton
                  type='outlined'
                  label='Buscar novamente'
                  onPress={onBuscarNovamente}
                  isLoading={isActing}
                  disabled={isActing}
                />
                <FancyButton
                  type='text'
                  label='Remover função da escala'
                  onPress={onRemoverFuncao}
                  isLoading={isActing}
                  disabled={isActing}
                />
              </View>
            </>
          ) : null}

          <Pressable
            onPress={() => setExpanded((v) => !v)}
            style={styles.expandRow}
            accessibilityRole='button'
          >
            <FancyText size='small' type='semiBold' color={palette.primary}>
              {expanded ? 'Ocultar histórico' : 'Ver histórico'}
            </FancyText>
            <DefaultIcons.Custom
              library='MaterialIcons'
              name={expanded ? 'expand-less' : 'expand-more'}
              size={16}
              color={palette.primary}
            />
          </Pressable>

          {expanded ? (
            <>
              <FancySeparator />
              <TentativaTimeline pedidoId={pedido.id} />
            </>
          ) : null}

          {podeCancelar ? (
            <>
              <FancySeparator />
              <FancyButton
                type='text'
                label='Cancelar pedido'
                onPress={onCancelar}
                isLoading={isActing}
                disabled={isActing}
                icon={{ library: 'MaterialIcons', name: 'close', size: 16, color: palette.error }}
                labelStyle={{ color: palette.error }}
              />
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: { marginBottom: 12 },
  card: { borderRadius: 14, overflow: 'hidden' },
  content: { flex: 1, padding: 12, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  blockEvento: { gap: 4 },
  eventoTituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventoColorDot: { width: 10, height: 10, borderRadius: 5 },
  eventoTitulo: { flex: 1, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1 },
  exitsCol: { gap: 8 },
  trocaBox: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  trocaLinha: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
});
