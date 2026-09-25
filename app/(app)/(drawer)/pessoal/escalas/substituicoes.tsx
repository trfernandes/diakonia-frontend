import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import FancySegmentedControl from '../../../../../components/fields/FancySegmentedControl';
import FancyText from '../../../../../components/FancyText';
import FancyLoading from '../../../../../components/FancyLoading';
import FancyList from '../../../../../components/list/FancyList';
import FancyListEmpty, { FancyListEmptyProps } from '../../../../../components/list/FancyListEmpty';
import FancyButton from '../../../../../components/buttons/FancyButton';
import { useAuth } from '../../../../../contexts/AuthContext';
import { usePallete } from '../../../../../hooks/usePallete';
import { useSubstituicaoPedidosCrud } from '../../../../../hooks/useSubstituicaoPedidosCrud';
import { SubstituicaoPedidoStatusEnum } from '../../../../../domain/enums/SubstituicaoPedido/substituicao-pedido-status.enum';
import { PedidoComPendencia } from '../../../../../domain/dtos/SubstituicaoPedido/substituicao-pedido.response';
import PedidoCard from '../../../../../components/pages/pessoal/escalas/substituicoes/PedidoCard';
import AceitarConviteModalPage from '../../../../../components/pages/pessoal/escalas/substituicoes/AceitarConviteModalPage';
import IndicarVoluntarioModal from '../../../../../components/pages/common/IndicarVoluntarioModal';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import { markPedidoIdsAsSeen } from '../../../../../domain/utils/substituicoesSeenStorage';

type TabValue = 'pendentes' | 'respondidas' | 'todas';

type ListItem =
  | { type: 'header'; key: string; label: string }
  | { type: 'card'; key: string; data: PedidoComPendencia };

const EMPTY_STATE_PROPS: Record<TabValue, FancyListEmptyProps> = {
  pendentes: {
    label: 'Tudo em dia!',
    helperText: 'Você não tem pedidos de substituição pendentes no momento.',
    icon: { library: 'MaterialCommunityIcons', name: 'check-circle-outline', size: 55 },
    muted: false,
  },
  respondidas: {
    label: 'Sem histórico ainda',
    helperText: 'Pedidos já resolvidos ou cancelados aparecerão aqui.',
    icon: { library: 'MaterialCommunityIcons', name: 'clipboard-check-outline', size: 55 },
    muted: false,
  },
  todas: {
    label: 'Sem pedidos de substituição',
    helperText: 'Toque em "Solicitar substituição" numa escala pra começar.',
    icon: { library: 'MaterialCommunityIcons', name: 'clipboard-list-outline', size: 55 },
    muted: false,
  },
};

export default function SubstituicoesScreen() {
  const { user } = useAuth();
  const palette = usePallete();
  const [tab, setTab] = useState<TabValue>('pendentes');
  const [actingId, setActingId] = useState<string | null>(null);
  const [indicarPedido, setIndicarPedido] = useState<PedidoComPendencia | null>(null);
  const [aceitarPedido, setAceitarPedido] = useState<PedidoComPendencia | null>(null);

  const {
    meusPedidos,
    isLoadingMeusPedidos,
    isErrorMeusPedidos,
    isRefetchingMeusPedidos,
    refetchMeusPedidos,
    aceitar,
    recusar,
    cancelar,
    indicarVoluntario,
    buscarNovamente,
    removerFuncao,
    responderTroca,
  } = useSubstituicaoPedidosCrud();

  const userId = user?.user?.id;

  const pendentes = useMemo(
    () => meusPedidos.filter((p) => p.pedido.status === SubstituicaoPedidoStatusEnum.Aberto),
    [meusPedidos],
  );
  const semCandidato = useMemo(
    () => meusPedidos.filter((p) => p.pedido.status === SubstituicaoPedidoStatusEnum.SemCandidato),
    [meusPedidos],
  );
  const respondidas = useMemo(
    () =>
      meusPedidos.filter(
        (p) =>
          p.pedido.status === SubstituicaoPedidoStatusEnum.Resolvido ||
          p.pedido.status === SubstituicaoPedidoStatusEnum.Cancelado,
      ),
    [meusPedidos],
  );

  const listData = useMemo<ListItem[]>(() => {
    if (tab === 'respondidas') {
      return respondidas.map((p) => ({ type: 'card', key: p.pedido.id, data: p }));
    }
    if (tab === 'todas') {
      return meusPedidos.map((p) => ({ type: 'card', key: p.pedido.id, data: p }));
    }

    const suaVez = [...pendentes, ...semCandidato].filter((p) => p.aguardandoAcaoDoUsuario);
    const aguardando = [...pendentes, ...semCandidato].filter((p) => !p.aguardandoAcaoDoUsuario);

    const items: ListItem[] = [];
    if (suaVez.length > 0) {
      items.push({ type: 'header', key: 'header-sua-vez', label: 'Sua vez' });
      suaVez.forEach((p) => items.push({ type: 'card', key: p.pedido.id, data: p }));
    }
    if (aguardando.length > 0) {
      items.push({ type: 'header', key: 'header-aguardando', label: 'Aguardando' });
      aguardando.forEach((p) => items.push({ type: 'card', key: p.pedido.id, data: p }));
    }
    return items;
  }, [tab, pendentes, semCandidato, respondidas, meusPedidos]);

  const pendentesCount = pendentes.length + semCandidato.length;

  useFocusEffect(
    useCallback(() => {
      const aguardandoIds = [...pendentes, ...semCandidato]
        .filter((p) => p.aguardandoAcaoDoUsuario)
        .map((p) => p.pedido.id);
      markPedidoIdsAsSeen(aguardandoIds);
    }, [pendentes, semCandidato]),
  );

  const runAction = useCallback(async (pedidoId: string, action: () => Promise<unknown>) => {
    setActingId(pedidoId);
    try {
      await action();
    } finally {
      setActingId(null);
    }
  }, []);

  const handleCancelar = useCallback(
    (pedidoId: string) => {
      FancyAlert.alert('Cancelar pedido', 'Isso cancela toda a busca por substituto. Confirma?', [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar pedido',
          style: 'destructive',
          onPress: () => runAction(pedidoId, () => cancelar({ pedidoId })),
        },
      ]);
    },
    [cancelar, runAction],
  );

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

  const isLoading = isLoadingMeusPedidos;

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
      ) : isErrorMeusPedidos && meusPedidos.length === 0 ? (
        // Falha de rede não pode parecer "nenhum pedido" (E2E 2.8).
        <View style={styles.errorWrap}>
          <FancyListEmpty
            label='Não conseguimos carregar os pedidos'
            helperText='Nenhum pedido foi perdido. Confira sua internet e toque em "Tentar de novo".'
            icon={{ library: 'MaterialCommunityIcons', name: 'wifi-alert', size: 55 }}
            muted={false}
          />
          <FancyButton
            type='contained'
            label='Tentar de novo'
            onPress={() => refetchMeusPedidos()}
            isLoading={isRefetchingMeusPedidos}
            disabled={isRefetchingMeusPedidos}
          />
        </View>
      ) : (
        <FancyList
          containerStyle={styles.listContainer}
          data={listData}
          keyExtractor={(item) => item.key}
          onRefresh={refetchMeusPedidos}
          refreshing={isRefetchingMeusPedidos}
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
            const isSolicitante =
              p.papel === 'solicitante' || p.pedido.solicitante?.voluntario?.id === userId;
            return (
              <PedidoCard
                item={p}
                isSolicitante={isSolicitante}
                isSuaVez={p.aguardandoAcaoDoUsuario}
                isActing={actingId === p.pedido.id}
                onAceitar={() => setAceitarPedido(p)}
                onRecusar={() => runAction(p.pedido.id, () => recusar(p.pedido.id))}
                onCancelar={() => handleCancelar(p.pedido.id)}
                onIndicarVoluntario={() => setIndicarPedido(p)}
                onBuscarNovamente={() => runAction(p.pedido.id, () => buscarNovamente(p.pedido.id))}
                onRemoverFuncao={() => handleRemoverFuncao(p.pedido.id)}
                onConfirmarTroca={() =>
                  runAction(p.pedido.id, () =>
                    responderTroca({ pedidoId: p.pedido.id, confirmar: true }),
                  )
                }
                onRecusarTroca={() =>
                  runAction(p.pedido.id, () =>
                    responderTroca({ pedidoId: p.pedido.id, confirmar: false }),
                  )
                }
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

      {aceitarPedido ? (
        <AceitarConviteModalPage
          visible={!!aceitarPedido}
          onClose={() => setAceitarPedido(null)}
          isSubmitting={actingId === aceitarPedido.pedido.id}
          onConfirm={async (dataOferecidaEmTroca) => {
            await runAction(aceitarPedido.pedido.id, () =>
              aceitar({ pedidoId: aceitarPedido.pedido.id, dataOferecidaEmTroca }),
            );
            setAceitarPedido(null);
          }}
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
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  sectionHeader: {
    paddingTop: 4,
    paddingBottom: 2,
  },
});
