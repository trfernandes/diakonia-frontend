import { RegraIndisponibilidadeTipo } from './regra-indisponibilidade-voluntario.response';

export type CreateRegraIndisponibilidadeVoluntarioDto = {
  tipo: RegraIndisponibilidadeTipo;
  diasSemana?: number[];
  dataInicio?: string;
  dataFim?: string;
  recorrente?: boolean;
  limiteMensal?: number;
  motivo?: string;
  voluntarioId: string;
  igrejaId: string;
  ministeriosInteirosIds?: string[];
  funcoesIds?: string[];
};
