import { TemplatePadraoEscopoEnum } from '../../enums/Evento/template-padrao-escopo.enum';

export type UpdateEventoEnsaioDto = {
  ministerioId: string;
  dataOcorrencia: string;
  escopo: TemplatePadraoEscopoEnum;
  horarioEnsaio: string;
  observacao?: string;
};

export type RemoveEventoEnsaioDto = {
  ministerioId: string;
  escopo: TemplatePadraoEscopoEnum;
  dataOcorrencia: string;
};

export type ResponseEventoEnsaioDto = {
  eventoId: string;
  ministerioId: string;
  dataOcorrencia: string;
  escopo: TemplatePadraoEscopoEnum;
  horarioEnsaio: string | null;
  horarioEnsaioOrigem: string | null;
  observacao: string | null;
};
