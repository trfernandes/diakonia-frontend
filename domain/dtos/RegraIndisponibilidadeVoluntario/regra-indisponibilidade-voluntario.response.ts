export type RegraIndisponibilidadeTipo = 'DIAS_SEMANA' | 'PERIODO' | 'LIMITE_MENSAL';

/** Ministério/função como o backend devolve na relação populada (ADR-0012). */
export type ResponseEscopoMinisterioDto = { id: string; nome: string };
export type ResponseEscopoFuncaoDto = { id: string; nome: string; ministerioId?: string };

export type ResponseRegraIndisponibilidadeVoluntarioDto = {
  id: string;
  tipo: RegraIndisponibilidadeTipo;
  diasSemana: number[] | null;
  dataInicio: string | null;
  dataFim: string | null;
  recorrente: boolean;
  limiteMensal: number | null;
  motivo: string | null;
  voluntarioId: string;
  igrejaId: string;
  autorId?: string;
  ministeriosInteiros?: ResponseEscopoMinisterioDto[] | null;
  funcoes?: ResponseEscopoFuncaoDto[] | null;
  createdAt: string;
  updatedAt: string;
};
