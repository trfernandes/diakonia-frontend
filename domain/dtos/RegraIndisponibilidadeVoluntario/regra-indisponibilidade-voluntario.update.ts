import { RegraIndisponibilidadeTipo } from './regra-indisponibilidade-voluntario.response';

export type UpdateRegraIndisponibilidadeVoluntarioDto = {
  tipo?: RegraIndisponibilidadeTipo;
  diasSemana?: number[];
  dataInicio?: string;
  dataFim?: string;
  recorrente?: boolean;
  limiteMensal?: number;
  motivo?: string;
  ministeriosInteirosIds?: string[];
  funcoesIds?: string[];
};
