export enum EscalaTemplateComparacaoExperienciaEnum {
  MaiorIgual = '0',
  Igual = '1',
}

export const EscalaTemplateComparacaoExperienciaLabel: Record<
  EscalaTemplateComparacaoExperienciaEnum,
  string
> = {
  [EscalaTemplateComparacaoExperienciaEnum.MaiorIgual]: 'Maior ou igual',
  [EscalaTemplateComparacaoExperienciaEnum.Igual]: 'Igual',
};
