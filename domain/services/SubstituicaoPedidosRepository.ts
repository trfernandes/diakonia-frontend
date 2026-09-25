import { SubstituicaoPedidosApi } from '../api/SubstituicaoPedidosApi';
import { CreateSubstituicaoPedidoDto } from '../dtos/SubstituicaoPedido/substituicao-pedido.create';
import { ResponseSubstituicaoPedidoDto } from '../dtos/SubstituicaoPedido/substituicao-pedido.response';

import { BaseRepository } from './BaseRepository';

class SubstituicaoPedidosRepositoryClass extends BaseRepository<
  ResponseSubstituicaoPedidoDto,
  CreateSubstituicaoPedidoDto,
  never
> {
  constructor() {
    super(SubstituicaoPedidosApi);
  }

  meusPedidos() {
    return SubstituicaoPedidosApi.meusPedidos();
  }

  pendentesParaLider() {
    return SubstituicaoPedidosApi.pendentesParaLider();
  }

  tentativas(pedidoId: string) {
    return SubstituicaoPedidosApi.tentativas(pedidoId);
  }

  fila(pedidoId: string) {
    return SubstituicaoPedidosApi.fila(pedidoId);
  }

  gatewayLider(pedidoId: string, acao: 'aprovar' | 'vetar') {
    return SubstituicaoPedidosApi.gatewayLider(pedidoId, acao);
  }

  aceitar(pedidoId: string, dataOferecidaEmTroca?: string) {
    return SubstituicaoPedidosApi.aceitar(pedidoId, dataOferecidaEmTroca);
  }

  recusar(pedidoId: string) {
    return SubstituicaoPedidosApi.recusar(pedidoId);
  }

  responderTroca(pedidoId: string, acao: 'confirmar-troca' | 'recusar-troca') {
    return SubstituicaoPedidosApi.responderTroca(pedidoId, acao);
  }

  cancelar(pedidoId: string, motivoCancelamento?: string) {
    return SubstituicaoPedidosApi.cancelar(pedidoId, motivoCancelamento);
  }

  indicarVoluntario(pedidoId: string, candidatoMinisterioVoluntarioId: string) {
    return SubstituicaoPedidosApi.indicarVoluntario(pedidoId, candidatoMinisterioVoluntarioId);
  }

  buscarNovamente(pedidoId: string) {
    return SubstituicaoPedidosApi.buscarNovamente(pedidoId);
  }

  removerFuncao(pedidoId: string) {
    return SubstituicaoPedidosApi.removerFuncao(pedidoId);
  }
}

export const SubstituicaoPedidosRepository = new SubstituicaoPedidosRepositoryClass();
