import apiClient from './api-client';

type ApiEnvelope<T> = { data: T };

export type LancamentoOrigem = 'MANUAL' | 'AUTOMATICO';

export type LancamentoResumo = {
  id: string;
  ministerioId: string;
  periodoInicio: string;
  periodoFim: string;
  prazo: string;
  origem: LancamentoOrigem;
  aberto: boolean;
  criadoEm: string;
  total: number;
  jaLancei: number;
};

export type LancamentoFaltante = { voluntarioId: string; nome: string };

export type LancamentoDetalhe = LancamentoResumo & { faltantes: LancamentoFaltante[] };

export type ProximoEnvio = {
  mesAlvo: string;
  envio: string;
  prazo: string;
  periodoInicio: string;
  periodoFim: string;
  status: 'envia' | 'pulado' | 'coberto';
  coberturaLancamentoId?: string;
  coberturaOrigem?: LancamentoOrigem;
};

export type LancamentoConfig = {
  ativo: boolean;
  diaEnvio: number | null;
  diaPrazo: number | null;
  mesesPulados: string[];
  proximos: ProximoEnvio[];
};

export type CriarLancamentoDto = { periodoInicio: string; periodoFim: string; prazo: string };
export type CriarLancamentoResponse = { lancamentoId: string; mesesAutomaticoPulados: string[] };
export type SalvarConfigDto = { ativo: boolean; diaEnvio?: number; diaPrazo?: number };

export type MeuLancamento = {
  lancamentoId: string;
  ministerioId: string;
  ministerioNome: string;
  igrejaId: string;
  periodoInicio: string;
  periodoFim: string;
  prazo: string;
  jaLancei: boolean;
  marcadoEm: string | null;
};

class LancamentosIndisponibilidadeApiClass {
  private base(ministerioId: string) {
    return `/ministerios/${ministerioId}/lancamentos-indisponibilidade`;
  }

  async listar(ministerioId: string): Promise<LancamentoResumo[]> {
    const response = await apiClient.get<ApiEnvelope<LancamentoResumo[]>>(this.base(ministerioId));
    return response.data.data;
  }

  async detalhe(ministerioId: string, lancamentoId: string): Promise<LancamentoDetalhe> {
    const response = await apiClient.get<ApiEnvelope<LancamentoDetalhe>>(
      `${this.base(ministerioId)}/${lancamentoId}`,
    );
    return response.data.data;
  }

  async resumo(ministerioId: string, inicio: string, fim: string): Promise<LancamentoResumo[]> {
    const response = await apiClient.get<ApiEnvelope<LancamentoResumo[]>>(
      `${this.base(ministerioId)}/resumo`,
      { params: { inicio, fim } },
    );
    return response.data.data;
  }

  async criar(ministerioId: string, dto: CriarLancamentoDto): Promise<CriarLancamentoResponse> {
    const response = await apiClient.post<ApiEnvelope<CriarLancamentoResponse>>(
      this.base(ministerioId),
      dto,
    );
    return response.data.data;
  }

  async cancelar(ministerioId: string, lancamentoId: string): Promise<void> {
    await apiClient.post(`${this.base(ministerioId)}/${lancamentoId}/cancelar`);
  }

  async config(ministerioId: string): Promise<LancamentoConfig> {
    const response = await apiClient.get<ApiEnvelope<LancamentoConfig>>(
      `${this.base(ministerioId)}/config`,
    );
    return response.data.data;
  }

  async salvarConfig(ministerioId: string, dto: SalvarConfigDto): Promise<LancamentoConfig> {
    const response = await apiClient.put<ApiEnvelope<LancamentoConfig>>(
      `${this.base(ministerioId)}/config`,
      dto,
    );
    return response.data.data;
  }

  async pularMes(ministerioId: string, mes: string): Promise<LancamentoConfig> {
    const response = await apiClient.post<ApiEnvelope<LancamentoConfig>>(
      `${this.base(ministerioId)}/config/pular`,
      { mes },
    );
    return response.data.data;
  }

  async despularMes(ministerioId: string, mes: string): Promise<LancamentoConfig> {
    const response = await apiClient.delete<ApiEnvelope<LancamentoConfig>>(
      `${this.base(ministerioId)}/config/pular/${mes}`,
    );
    return response.data.data;
  }

  async meus(): Promise<MeuLancamento[]> {
    const response = await apiClient.get<ApiEnvelope<MeuLancamento[]>>(
      '/me/lancamentos-indisponibilidade',
    );
    return response.data.data;
  }

  async marcarJaLancei(lancamentoId: string): Promise<{ marcadoEm: string }> {
    const response = await apiClient.post<ApiEnvelope<{ marcadoEm: string }>>(
      `/me/lancamentos-indisponibilidade/${lancamentoId}/ja-lancei`,
    );
    return response.data.data;
  }

  async desfazerJaLancei(lancamentoId: string): Promise<void> {
    await apiClient.delete(`/me/lancamentos-indisponibilidade/${lancamentoId}/ja-lancei`);
  }
}

export const LancamentosIndisponibilidadeApi = new LancamentosIndisponibilidadeApiClass();
