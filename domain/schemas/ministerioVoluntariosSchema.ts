import z from 'zod';
import { EscalaTemplateExperienciaEnum } from '../enums/EscalaTemplate/escala-template-experiencia.enum';
import { MinisterioVoluntarioStatusEnum } from '../enums/MinisterioVoluntario/ministerio-voluntario-status.enum';
import { MinisterioVoluntarioFuncaoStatusEnum } from '../enums/MinisterioVoluntarioFuncao/ministerio-voluntario-funcao-status.enum';

export const minVoluntarioFuncaoSchema = z.object({
  id: z.string('Campo obrigatório'),
  nome: z.string().optional(),
  experiencia: z.enum(EscalaTemplateExperienciaEnum, 'Campo obrigatório'),
  status: z.enum(MinisterioVoluntarioFuncaoStatusEnum).optional(),
});

// Schema do formulário transiente de adicionar/editar função (FormModal). Ao adicionar,
// o campo `id` aceita várias funções de uma vez (array); ao editar uma função já
// associada, continua sendo uma única string — igual a minVoluntarioFuncaoSchema.
export const minVoluntarioFuncaoModalSchema = z.object({
  id: z.union([z.string('Campo obrigatório'), z.array(z.string()).min(1, 'Campo obrigatório')]),
  nome: z.string().optional(),
  experiencia: z.enum(EscalaTemplateExperienciaEnum, 'Campo obrigatório'),
  status: z.enum(MinisterioVoluntarioFuncaoStatusEnum).optional(),
});

export const minVoluntarioSchema = z.object({
  voluntarioId: z.uuid('Campo obrigatório'),
  voluntarioFoto: z.string().optional(),
  voluntarioNome: z.string().optional(),
  voluntarioEmail: z.string().optional(),
  voluntarioStatus: z.enum(MinisterioVoluntarioStatusEnum).optional(),
  funcoes: z.array(minVoluntarioFuncaoSchema).optional(),
});

export type MinVoluntarioFormData = z.infer<typeof minVoluntarioSchema>;
export type MinVoluntarioFuncaoFormData = z.infer<typeof minVoluntarioFuncaoSchema>;
export type MinVoluntarioFuncaoModalFormData = z.infer<typeof minVoluntarioFuncaoModalSchema>;
