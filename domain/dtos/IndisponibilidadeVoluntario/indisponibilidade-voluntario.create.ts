export type CreateIndisponibilidadeVoluntarioDto = {
  data: string;
  voluntarioId: string;
  igrejaId: string;
  motivo?: string;
  ministeriosInteirosIds?: string[] | null;
  funcoesIds?: string[] | null;
};
