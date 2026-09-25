import axios from 'axios';

// Item de escala já publicada que impede marcar indisponibilidade no dia (E2E 2.3).
export type ItemEscalaAfetado = {
  escalaItemId: string;
  data: string;
  ministerio: string;
  funcao?: string;
  nomeEvento?: string;
};

// Backend responde 409 com { error: { code: 'ESCALADO_EM_ESCALA_PUBLICADA', itensAfetados } }
// (HttpExceptionFilter espalha o corpo da exceção dentro de `error`).
export function extrairItensEscalaPublicada(error: unknown): ItemEscalaAfetado[] | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
  const body: any = error.response.data;
  const payload = body?.error ?? body;
  if (payload?.code !== 'ESCALADO_EM_ESCALA_PUBLICADA') return null;
  return Array.isArray(payload.itensAfetados) ? payload.itensAfetados : [];
}

// Pessoa marcada que impede publicar escala em rascunho (E2E 2.3 rascunho + 2.2b).
export type ProblemaPublicacao = {
  escalaItemId: string;
  voluntarioNome: string;
  data: string;
  tipo: 'INDISPONIVEL' | 'CONFLITO_HORARIO';
  detalhe: string;
};

// Backend responde 409 com { error: { code: 'PUBLICACAO_BLOQUEADA', problemas } }.
export function extrairProblemasPublicacao(error: unknown): ProblemaPublicacao[] | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
  const body: any = error.response.data;
  const payload = body?.error ?? body;
  if (payload?.code !== 'PUBLICACAO_BLOQUEADA') return null;
  return Array.isArray(payload.problemas) ? payload.problemas : [];
}

// Agrupa problemas por item de escala (uma pessoa pode ter indisponibilidade + conflito).
export function agruparProblemasPorItem(
  problemas: ProblemaPublicacao[],
): Map<string, ProblemaPublicacao[]> {
  const mapa = new Map<string, ProblemaPublicacao[]>();
  for (const problema of problemas) {
    const lista = mapa.get(problema.escalaItemId) ?? [];
    lista.push(problema);
    mapa.set(problema.escalaItemId, lista);
  }
  return mapa;
}
