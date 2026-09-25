import apiClient from './api-client';
import { BaseApi } from './BaseApi';
import { CreateSubstituicaoPedidoDto } from '../dtos/SubstituicaoPedido/substituicao-pedido.create';
import {
  PedidoComPendencia,
  ResponseSubstituicaoPedidoDto,
} from '../dtos/SubstituicaoPedido/substituicao-pedido.response';
import { ResponseTentativaDto } from '../dtos/SubstituicaoPedido/tentativa.response';
import { CandidatoComScore } from '../dtos/SubstituicaoPedido/candidato-com-score';

type ApiEnvelope<T> = { data: T };

class SubstituicaoPedidosApiClass extends BaseApi<
  ResponseSubstituicaoPedidoDto,
  CreateSubstituicaoPedidoDto,
  never
> {
  constructor() {
    super('escalas/substituicoes-pedidos');
  }

  async meusPedidos(): Promise<PedidoComPendencia[]> {
    try {
      const response = await apiClient.get<ApiEnvelope<PedidoComPendencia[]>>(
        `/${this.resourceName}/meus-pedidos`,
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('meusPedidos', error);
      throw error;
    }
  }

  async pendentesParaLider(): Promise<PedidoComPendencia[]> {
    try {
      const response = await apiClient.get<ApiEnvelope<PedidoComPendencia[]>>(
        `/${this.resourceName}/lider/pendentes`,
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('pendentesParaLider', error);
      throw error;
    }
  }

  async tentativas(pedidoId: string): Promise<ResponseTentativaDto[]> {
    try {
      const response = await apiClient.get<ApiEnvelope<ResponseTentativaDto[]>>(
        `/${this.resourceName}/${pedidoId}/tentativas`,
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('tentativas', error, { pedidoId });
      throw error;
    }
  }

  async fila(pedidoId: string): Promise<CandidatoComScore[]> {
    try {
      const response = await apiClient.get<ApiEnvelope<CandidatoComScore[]>>(
        `/${this.resourceName}/${pedidoId}/fila`,
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('fila', error, { pedidoId });
      throw error;
    }
  }

  async gatewayLider(
    pedidoId: string,
    acao: 'aprovar' | 'vetar',
  ): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/gateway-lider`,
        { acao },
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('gatewayLider', error, { pedidoId, acao });
      throw error;
    }
  }

  async aceitar(
    pedidoId: string,
    dataOferecidaEmTroca?: string,
  ): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/aceitar`,
        dataOferecidaEmTroca ? { dataOferecidaEmTroca } : {},
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('aceitar', error, { pedidoId });
      throw error;
    }
  }

  async recusar(pedidoId: string): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/recusar`,
        {},
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('recusar', error, { pedidoId });
      throw error;
    }
  }

  async cancelar(
    pedidoId: string,
    motivoCancelamento?: string,
  ): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/cancelar`,
        motivoCancelamento ? { motivoCancelamento } : {},
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('cancelar', error, { pedidoId });
      throw error;
    }
  }

  async indicarVoluntario(
    pedidoId: string,
    candidatoMinisterioVoluntarioId: string,
  ): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/indicar-voluntario`,
        { candidatoMinisterioVoluntarioId },
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('indicarVoluntario', error, { pedidoId, candidatoMinisterioVoluntarioId });
      throw error;
    }
  }

  async buscarNovamente(pedidoId: string): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/buscar-novamente`,
        {},
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('buscarNovamente', error, { pedidoId });
      throw error;
    }
  }

  // Troca (ADR-0013): solicitante confirma ou recusa a data que o candidato ofereceu.
  async responderTroca(
    pedidoId: string,
    acao: 'confirmar-troca' | 'recusar-troca',
  ): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/${acao}`,
        {},
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('responderTroca', error, { pedidoId, acao });
      throw error;
    }
  }

  async removerFuncao(pedidoId: string): Promise<ResponseSubstituicaoPedidoDto> {
    try {
      const response = await apiClient.put<ApiEnvelope<ResponseSubstituicaoPedidoDto>>(
        `/${this.resourceName}/${pedidoId}/remover-funcao`,
        {},
      );
      return response.data.data;
    } catch (error) {
      this.logAxiosError('removerFuncao', error, { pedidoId });
      throw error;
    }
  }
}

export const SubstituicaoPedidosApi = new SubstituicaoPedidosApiClass();
