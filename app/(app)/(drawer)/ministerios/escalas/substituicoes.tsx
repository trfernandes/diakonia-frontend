import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import FancySegmentedControl from '../../../../../components/fields/FancySegmentedControl';
import FancyText from '../../../../../components/FancyText';
import FancyLoading from '../../../../../components/FancyLoading';
import FancyList from '../../../../../components/list/FancyList';
import { FancyListEmptyProps } from '../../../../../components/list/FancyListEmpty';
import { usePallete } from '../../../../../hooks/usePallete';
import { useSubstituicaoPedidosCrud } from '../../../../../hooks/useSubstituicaoPedidosCrud';
import { SubstituicaoPedidoStatusEnum } from '../../../../../domain/enums/SubstituicaoPedido/substituicao-pedido-status.enum';
import { PedidoComPendencia } from '../../../../../domain/dtos/SubstituicaoPedido/substituicao-pedido.response';
import LiderPedidoCard from '../../../../../components/pages/ministerios/escalas/substituicoes/LiderPedidoCard';
import IndicarVoluntarioModal from '../../../../../components/pages/common/IndicarVoluntarioModal';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';

type TabValue = 'pendentes' | 'respondidas' | 'todas';

type ListItem =
  | { type: 'header'; key: string; label: string }
  | { type: 'card'; key: string; data: PedidoComPendencia };

const EMPTY_STATE_PROPS: Record<TabValue, FancyListEmptyProps> = {
  pendentes: {
    label: 'Tudo em dia!',
    helperText: 'Não há pedidos de substituição pendentes no ministério.',
    icon: { library: 'MaterialCommunityIcons', name: 'check-circle-outline', size: 55 },
    muted: false,
  },
  respondidas: {
    label: 'Sem histórico ainda',
    helperText: 'Pedidos resolvidos ou cancelados aparecerão aqui.',
    icon: { library: 'MaterialCommunityIcons', name: 'clipboard-check-outline', size: 55 },
    muted: false,
  },
  todas: {
    label: 'Sem pedidos de substituição',
    helperText: 'Pedidos de substituição do ministério aparecerão aqui.',
    icon: { library: 'MaterialCommunityIcons', name: 'clipboard-list-outline', size: 55 },
    muted: false,
  },
};

export default function MinisterioSubstituicoesScreen() {
  const { ministerioId } = useLocalSearchParams<{ ministerioId: string }>();
  const palette = usePallete();
  const [tab, setTab] = useState<TabValue>('pendentes');
  const [actingId, setActingId] = useState<string | null>(null);
  const [indicarPedido, setIndicarPedido] = useState<PedidoComPendencia | null>(null);

  const {
    pendentesParaLider,
    isLoadingPendentesParaLider,
    isRefetchingPendentesParaLider,
    refetchPendentesParaLider,
    gatewayLider,
    indicarVoluntario,
    buscarNovamente,
    removerFuncao,
  } = useSubstituicaoPedidosCrud();

  // Escopo por ministério preservado no client-side pra manter a entrada do drawer
  // por ministério — `pendentesParaLider` traz todos os ministérios que o usuário lidera.
  // Ministério da vaga vem da função (escalaItem.funcao), não do voluntário.
  const doMinisterio = useMemo(
    () =>
      pendentesParaLider.filter((p) => p.pedido.escalaItem?.funcao?.ministerioId === ministerioId),
    [pendentesParaLider, ministerioId],
  );

  const pendentes = useMemo(
    () => doMinisterio.filter((p) => p.pedido.status === SubstituicaoPedidoStatusEnum.Aberto),
    [doMinisterio],
  );
  const semCandidato = useMemo(
    () => doMinisterio.filter((p) => p.pedido.status === SubstituicaoPedidoStatusEnum.SemCandidato),
    [doMinisterio],
  );
  const respondidas = useMemo(
    () =>
      doMinisterio.filter(
        (p) =>
          p.pedido.status === SubstituicaoPedidoStatusEnum.Resolvido ||
          p.pedido.status === SubstituicaoPedidoStatusEnum.Cancelado,
      ),
    [doMinisterio],
  );

  const listData = useMemo<ListItem[]>(() => {
    if (tab === 'respondidas') {
      return respondidas.map((p) => ({ type: 'card', key: p.pedido.id, data: p }));
    }
    if (tab === 'todas') {
      return doMinisterio.map((p) => ({ type: 'card', key: p.pedido.id, data: p }));
    }

    const ativos = [...pendentes, ...semCandidato];
    const aguardandoVoce = ativos.filter((p) => p.aguardandoAcaoDoUsuario);
    const emAndamento = ativos.filter((p) => !p.aguardandoAcaoDoUsuario);

    const items: ListItem[] = [];
    if (aguardandoVoce.length > 0) {
      items.push({ type: 'header', key: 'header-aguardando-voce', label: 'Aguardando você' });
      aguardandoVoce.forEach((p) => items.push({ type: 'card', key: p.pedido.id, data: p }));
    }
    if (emAndamento.length > 0) {
      items.push({ type: 'header', key: 'header-em-andamento', label: 'Em andamento' });
      emAndamento.forEach((p) => items.push({ type: 'card', key: p.pedido.id, data: p }));
    }
    return items;
  }, [tab, pendentes, semCandidato, respondidas, doMinisterio]);

  const pendentesCount = pendentes.length + semCandidato.length;

  const runAction = useCallback(async (pedidoId: string, action: () => Promise<unknown>) => {
    setActingId(pedidoId);
    try {
      await action();
    } finally {
      setActingId(null);
    }
  }, []);

  const handleRemoverFuncao = useCallback(
    (pedidoId: string) => {
      FancyAlert.alert('Remover função da escala', 'A função ficará vaga nessa escala. Confirma?', [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => runAction(pedidoId, () => removerFuncao(pedidoId)),
        },
      ]);
    },
    [removerFuncao, runAction],
  );

  const isLoading = isLoadingPendentesParaLider;

  return (
    <FancyPageView style={styles.page}>
      <FancySegmentedControl<TabValue>
        options={[
          {
            label: pendentesCount > 0 ? `Pendentes (${pendentesCount})` : 'Pendentes',
            value: 'pendentes',
          },
          { label: 'Respondidas', value: 'respondidas' },
          { label: 'Todas', value: 'todas' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <FancyLoading />
      ) : (
        <FancyList
          containerStyle={styles.listContainer}
          data={listData}
          keyExtractor={(item) => item.key}
          onRefresh={refetchPendentesParaLider}
          refreshing={isRefetchingPendentesParaLider}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={styles.sectionHeader}>
                  <FancyText size='small' type='bold' color={palette.fonts.inactive}>
                    {item.label.toUpperCase()}
                  </FancyText>
                </View>
              );
            }
            const p = item.data;
            return (
              <LiderPedidoCard
                item={p}
                isAguardandoGate={p.aguardandoAcaoDoUsuario}
                isActing={actingId === p.pedido.id}
                onAprovar={() =>
                  runAction(p.pedido.id, () =>
                    gatewayLider({ pedidoId: p.pedido.id, acao: 'aprovar' }),
                  )
                }
                onVetar={() =>
                  runAction(p.pedido.id, () =>
                    gatewayLider({ pedidoId: p.pedido.id, acao: 'vetar' }),
                  )
                }
                onIndicarVoluntario={() => setIndicarPedido(p)}
                onBuscarNovamente={() => runAction(p.pedido.id, () => buscarNovamente(p.pedido.id))}
                onRemoverFuncao={() => handleRemoverFuncao(p.pedido.id)}
              />
            );
          }}
          listEmptyProps={EMPTY_STATE_PROPS[tab]}
        />
      )}

      {indicarPedido ? (
        <IndicarVoluntarioModal
          visible={!!indicarPedido}
          onClose={() => setIndicarPedido(null)}
          pedido={indicarPedido.pedido}
          onConfirm={(candidatoMinisterioVoluntarioId) =>
            runAction(indicarPedido.pedido.id, () =>
              indicarVoluntario({
                pedidoId: indicarPedido.pedido.id,
                candidatoMinisterioVoluntarioId,
              }),
            )
          }
        />
      ) : null}
    </FancyPageView>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  listContainer: {
    flex: 1,
    marginTop: 16,
  },
  sectionHeader: {
    paddingTop: 4,
    paddingBottom: 2,
  },
});
