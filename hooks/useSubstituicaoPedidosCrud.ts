import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { SubstituicaoPedidosRepository } from '../domain/services/SubstituicaoPedidosRepository';
import { CreateSubstituicaoPedidoDto } from '../domain/dtos/SubstituicaoPedido/substituicao-pedido.create';
import { getApiErrorMessage } from '../domain/api/api-error';
import { useAuth } from '../contexts/AuthContext';

const MEUS_PEDIDOS_KEY = ['substituicao-pedidos', 'meus-pedidos'];
const LIDER_PENDENTES_KEY = ['substituicao-pedidos', 'lider-pendentes'];

// Camada de dados do ADR-0009 (Pedido/Tentativa). A maioria dos endpoints são
// ações (não CRUD simples), então não usa `useCrud` — mutations diretas via
// react-query, todas invalidando as duas listas (um Pedido pode aparecer nas
// duas visões, ex: solicitante que também é líder de outro ministério).
export function useSubstituicaoPedidosCrud() {
  const { igrejaAtiva } = useAuth();
  const enabled = !!igrejaAtiva?.id;
  const queryClient = useQueryClient();

  const meusPedidosQuery = useQuery({
    queryKey: MEUS_PEDIDOS_KEY,
    queryFn: () => SubstituicaoPedidosRepository.meusPedidos(),
    enabled,
  });

  const liderPendentesQuery = useQuery({
    queryKey: LIDER_PENDENTES_KEY,
    queryFn: () => SubstituicaoPedidosRepository.pendentesParaLider(),
    enabled,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: MEUS_PEDIDOS_KEY });
    queryClient.invalidateQueries({ queryKey: LIDER_PENDENTES_KEY });
  };

  const handleError = (fallback: string) => (err: unknown) => {
    Toast.show({ type: 'error', text1: getApiErrorMessage(err, fallback), position: 'top' });
  };

  const criarPedido = useMutation({
    mutationFn: (data: CreateSubstituicaoPedidoDto) => SubstituicaoPedidosRepository.add(data),
    onSuccess: () => {
      invalidateAll();
      Toast.show({
        type: 'success',
        text1: 'Solicitação enviada!',
        text2: 'Vamos buscar um substituto para você.',
        position: 'top',
      });
    },
    onError: handleError('Erro ao solicitar substituição.'),
  });

  const gatewayLider = useMutation({
    mutationFn: ({ pedidoId, acao }: { pedidoId: string; acao: 'aprovar' | 'vetar' }) =>
      SubstituicaoPedidosRepository.gatewayLider(pedidoId, acao),
    onSuccess: (_, { acao }) => {
      invalidateAll();
      Toast.show({
        type: 'success',
        text1: acao === 'aprovar' ? 'Convite aprovado!' : 'Candidato vetado.',
        position: 'top',
      });
    },
    onError: handleError('Erro ao processar aprovação.'),
  });

  const aceitar = useMutation({
    mutationFn: ({
      pedidoId,
      dataOferecidaEmTroca,
    }: {
      pedidoId: string;
      dataOferecidaEmTroca?: string;
    }) => SubstituicaoPedidosRepository.aceitar(pedidoId, dataOferecidaEmTroca),
    onSuccess: () => {
      invalidateAll();
      Toast.show({ type: 'success', text1: 'Substituição aceita!', position: 'top' });
    },
    onError: handleError('Erro ao aceitar substituição.'),
  });

  const recusar = useMutation({
    mutationFn: (pedidoId: string) => SubstituicaoPedidosRepository.recusar(pedidoId),
    onSuccess: () => {
      invalidateAll();
      Toast.show({ type: 'success', text1: 'Substituição recusada.', position: 'top' });
    },
    onError: handleError('Erro ao recusar substituição.'),
  });

  const responderTroca = useMutation({
    mutationFn: ({ pedidoId, confirmar }: { pedidoId: string; confirmar: boolean }) =>
      SubstituicaoPedidosRepository.responderTroca(
        pedidoId,
        confirmar ? 'confirmar-troca' : 'recusar-troca',
      ),
    onSuccess: (_, { confirmar }) => {
      invalidateAll();
      Toast.show({
        type: 'success',
        text1: confirmar ? 'Troca confirmada!' : 'Troca recusada.',
        text2: confirmar
          ? 'As duas escalas já foram atualizadas.'
          : 'Vamos seguir buscando outro substituto.',
        position: 'top',
      });
    },
    onError: handleError('Erro ao responder a troca.'),
  });

  const cancelar = useMutation({
    mutationFn: ({
      pedidoId,
      motivoCancelamento,
    }: {
      pedidoId: string;
      motivoCancelamento?: string;
    }) => SubstituicaoPedidosRepository.cancelar(pedidoId, motivoCancelamento),
    onSuccess: () => {
      invalidateAll();
      Toast.show({ type: 'success', text1: 'Pedido cancelado.', position: 'top' });
    },
    onError: handleError('Erro ao cancelar pedido.'),
  });

  const indicarVoluntario = useMutation({
    mutationFn: ({
      pedidoId,
      candidatoMinisterioVoluntarioId,
    }: {
      pedidoId: string;
      candidatoMinisterioVoluntarioId: string;
    }) =>
      SubstituicaoPedidosRepository.indicarVoluntario(pedidoId, candidatoMinisterioVoluntarioId),
    onSuccess: () => {
      invalidateAll();
      Toast.show({ type: 'success', text1: 'Voluntário indicado!', position: 'top' });
    },
    onError: handleError('Erro ao indicar voluntário.'),
  });

  const buscarNovamente = useMutation({
    mutationFn: (pedidoId: string) => SubstituicaoPedidosRepository.buscarNovamente(pedidoId),
    onSuccess: () => {
      invalidateAll();
      Toast.show({ type: 'success', text1: 'Buscando candidatos novamente...', position: 'top' });
    },
    onError: handleError('Erro ao buscar novamente.'),
  });

  const removerFuncao = useMutation({
    mutationFn: (pedidoId: string) => SubstituicaoPedidosRepository.removerFuncao(pedidoId),
    onSuccess: () => {
      invalidateAll();
      Toast.show({ type: 'success', text1: 'Função removida da escala.', position: 'top' });
    },
    onError: handleError('Erro ao remover função.'),
  });

  return {
    meusPedidos: meusPedidosQuery.data ?? [],
    isLoadingMeusPedidos: meusPedidosQuery.isLoading,
    // Sem isso a tela confundia falha de rede com "nenhum pedido" (E2E 2.8).
    isErrorMeusPedidos: meusPedidosQuery.isError,
    isRefetchingMeusPedidos: meusPedidosQuery.isRefetching,
    refetchMeusPedidos: meusPedidosQuery.refetch,

    pendentesParaLider: liderPendentesQuery.data ?? [],
    isLoadingPendentesParaLider: liderPendentesQuery.isLoading,
    isErrorPendentesParaLider: liderPendentesQuery.isError,
    isRefetchingPendentesParaLider: liderPendentesQuery.isRefetching,
    refetchPendentesParaLider: liderPendentesQuery.refetch,

    criarPedido: criarPedido.mutateAsync,
    isCriandoPedido: criarPedido.isPending,

    gatewayLider: gatewayLider.mutateAsync,
    isProcessandoGateway: gatewayLider.isPending,

    aceitar: aceitar.mutateAsync,
    isAceitando: aceitar.isPending,

    recusar: recusar.mutateAsync,
    isRecusando: recusar.isPending,

    responderTroca: responderTroca.mutateAsync,
    isRespondendoTroca: responderTroca.isPending,

    cancelar: cancelar.mutateAsync,
    isCancelando: cancelar.isPending,

    indicarVoluntario: indicarVoluntario.mutateAsync,
    isIndicando: indicarVoluntario.isPending,

    buscarNovamente: buscarNovamente.mutateAsync,
    isBuscandoNovamente: buscarNovamente.isPending,

    removerFuncao: removerFuncao.mutateAsync,
    isRemovendoFuncao: removerFuncao.isPending,
  };
}

// Timeline (Tentativas) de um Pedido específico — busca sob demanda, quando o
// card expande inline (decisão de design: sem navegação pra outra tela).
export function useTentativasDoPedido(pedidoId: string | null) {
  return useQuery({
    queryKey: ['substituicao-pedidos', 'tentativas', pedidoId],
    queryFn: () => SubstituicaoPedidosRepository.tentativas(pedidoId!),
    enabled: !!pedidoId,
  });
}

// Fila de candidatos (read-only) — líder revisa antes de aprovar/vetar.
export function useFilaDoPedido(pedidoId: string | null) {
  return useQuery({
    queryKey: ['substituicao-pedidos', 'fila', pedidoId],
    queryFn: () => SubstituicaoPedidosRepository.fila(pedidoId!),
    enabled: !!pedidoId,
  });
}
