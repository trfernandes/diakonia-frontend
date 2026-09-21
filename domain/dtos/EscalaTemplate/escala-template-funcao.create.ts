import { EscalaTemplateExperienciaEnum } from '../../enums/EscalaTemplate/escala-template-experiencia.enum';
import { EscalaTemplateComparacaoExperienciaEnum } from '../../enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';

export type CreateEscalaTemplateFuncaoDto = {
  funcaoIds: string[];
  quantidade: number;
  experiencia: EscalaTemplateExperienciaEnum;
  comparacaoExperiencia?: EscalaTemplateComparacaoExperienciaEnum;
};
