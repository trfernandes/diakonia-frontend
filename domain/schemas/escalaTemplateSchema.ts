import z from 'zod';
import { EscalaTemplateExperienciaEnum } from '../enums/EscalaTemplate/escala-template-experiencia.enum';
import { EscalaTemplateComparacaoExperienciaEnum } from '../enums/EscalaTemplate/escala-template-comparacao-experiencia.enum';
import { EscalaTemplateTipoEnum } from '../enums/EscalaTemplate/escala-template-tipo.enum';

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export const escalaTemplateTipoSchema = z.union(
  [z.literal(EscalaTemplateTipoEnum.Fixo), z.literal(EscalaTemplateTipoEnum.Funcoes)],
  {
    message: 'Selecione um tipo válido',
  },
);

export const escalaTemplateExperienciaSchema = z.union(
  [
    z.literal(EscalaTemplateExperienciaEnum.Iniciante),
    z.literal(EscalaTemplateExperienciaEnum.Intermediario),
    z.literal(EscalaTemplateExperienciaEnum.Avancado),
  ],
  { message: 'Selecione um nível de experiência válido' },
);

const uuidField = z.string().regex(UUID_REGEX, { message: 'Identificador inválido' });

export const escalaTemplateVoluntarioSchema = z.object({
  id: uuidField.optional(),
  voluntarioId: z.uuid({ error: 'Campo obrigatório' }),
  funcaoId: z.uuid({ error: 'Campo obrigatório' }),
});

export const escalaTemplateFuncaoSchema = z.object({
  id: uuidField.optional(),
  funcaoIds: z
    .array(z.uuid({ error: 'Campo obrigatório' }))
    .min(1, { message: 'Selecione ao menos uma função' }),
  funcoesAceitas: z.array(z.object({ id: z.string(), nome: z.string() })).optional(),
  experiencia: z.enum(EscalaTemplateExperienciaEnum),
  comparacaoExperiencia: z.enum(EscalaTemplateComparacaoExperienciaEnum).optional(),
  quantidade: z.coerce
    .number<number>('Campo obrigatório')
    .min(1, { message: 'A quantidade deve ser no mínimo 1' }),
  apenasJaEscalado: z.boolean().optional(),
});

export const escalaTemplateSchema = z
  .object({
    id: uuidField.optional(),
    ministerioId: z.uuid({ error: 'Campo obrigatório' }),
    nome: z
      .string({ message: 'Nome obrigatório' })
      .trim()
      .min(1, { message: 'Nome obrigatório' })
      .max(100, { message: 'O nome deve ter no máximo 100 caracteres' }),
    tipo: escalaTemplateTipoSchema,
    voluntarios: z.array(escalaTemplateVoluntarioSchema).optional(),
    funcoes: z.array(escalaTemplateFuncaoSchema).optional(),
    respSetListVoluntariosId: z.uuid().optional(),
    respSetListFuncoesId: z.uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === EscalaTemplateTipoEnum.Funcoes) {
      const funcoes = data.funcoes ?? [];

      if (funcoes.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['funcoes'],
          message: 'Adicione pelo menos uma função para templates por funções',
        });
      } else if (funcoes.length > 0 && funcoes.every((f) => f.apenasJaEscalado)) {
        ctx.addIssue({
          code: 'custom',
          path: ['funcoes'],
          message:
            'Pelo menos uma função não pode ter a restrição "só quem já está na escala" — sem isso, nenhuma vaga consegue ser preenchida na geração automática.',
        });
      }
    } else if (data.tipo === EscalaTemplateTipoEnum.Fixo) {
      const voluntarios = data.voluntarios ?? [];

      if (voluntarios.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['voluntarios'],
          message: 'Adicione pelo menos um voluntário para templates fixos',
        });
      }
    }
  });

export type EscalaTemplateFormData = z.infer<typeof escalaTemplateSchema>;
export type EscalaTemplateVoluntarioFormData = z.infer<typeof escalaTemplateVoluntarioSchema>;
export type EscalaTemplateFuncaoFormData = z.infer<typeof escalaTemplateFuncaoSchema>;
