export enum EscalaTemplateComparacaoExperienciaEnum {
  MaiorIgual = '0',
  Igual = '1',
  MenorIgual = '2',
}

export const EscalaTemplateComparacaoExperienciaLabel: Record<
  EscalaTemplateComparacaoExperienciaEnum,
  string
> = {
  [EscalaTemplateComparacaoExperienciaEnum.MaiorIgual]: 'Maior ou igual',
  [EscalaTemplateComparacaoExperienciaEnum.Igual]: 'Igual',
  [EscalaTemplateComparacaoExperienciaEnum.MenorIgual]: 'Menor ou igual',
};
