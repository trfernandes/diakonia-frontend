import { ResponseIgrejaDto } from '../Igreja/response-igreja.dto';
import { ResponseVoluntarioDto } from '../Voluntario/voluntario.response';
import type {
  ResponseEscopoMinisterioDto,
  ResponseEscopoFuncaoDto,
} from '../RegraIndisponibilidadeVoluntario/regra-indisponibilidade-voluntario.response';

export type ResponseIndisponibilidadeVoluntarioDto = {
  id: string;
  igrejaId: string;
  igreja?: ResponseIgrejaDto;
  data: string;
  motivo?: string;
  autorId?: string;
  ministeriosInteiros?: ResponseEscopoMinisterioDto[] | null;
  funcoes?: ResponseEscopoFuncaoDto[] | null;
  voluntario?: ResponseVoluntarioDto;
  voluntarioId: string;
  createdAt: string;
  updatedAt: string;
};
