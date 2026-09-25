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
