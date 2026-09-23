/**
 * Funções puras para gerenciar escopo de indisponibilidade (ministérios e funções).
 * Usadas em regra recorrente, indisponibilidade avulsa e tela do líder.
 */

type MinisterioInfo = {
  id: string;
  nome: string;
};

type FuncaoInfo = {
  id: string;
  nome: string;
  ministerioId: string;
};

/**
 * Gera resumo textual do escopo de indisponibilidade.
 * Retorna "Todos os ministérios" se ambos vazios, ou descrição dos ministérios/funções selecionados.
 */
export function resumoEscopoIndisponibilidade(
  ministeriosInteirosIds: string[] | null | undefined,
  funcoesIds: string[] | null | undefined,
  ministerios: MinisterioInfo[],
  funcoes: FuncaoInfo[],
): string {
  const mIds = ministeriosInteirosIds?.filter((id) => id) ?? [];
  const fIds = funcoesIds?.filter((id) => id) ?? [];

  if (mIds.length === 0 && fIds.length === 0) {
    return 'Todos os ministérios';
  }

  const ministerioPorId = new Map(ministerios.map((m) => [m.id, m]));
  const funcaoPorId = new Map(funcoes.map((f) => [f.id, f]));

  // Agrupa funções por ministério
  const funcoesAgrupadasPorMinisterio = new Map<string, { nome: string; funcoes: string[] }>();

  for (const funcaoId of fIds) {
    const funcao = funcaoPorId.get(funcaoId);
    if (funcao) {
      const ministId = funcao.ministerioId;
      const ministInfo = ministerioPorId.get(ministId);
      if (ministInfo) {
        if (!funcoesAgrupadasPorMinisterio.has(ministId)) {
          funcoesAgrupadasPorMinisterio.set(ministId, {
            nome: ministInfo.nome,
            funcoes: [],
          });
        }
        funcoesAgrupadasPorMinisterio.get(ministId)!.funcoes.push(funcao.nome);
      }
    }
  }

  const partes: string[] = [];

  // Ministérios inteiros
  for (const ministId of mIds) {
    const minist = ministerioPorId.get(ministId);
    if (minist) {
      // Se esse ministério também tem funções específicas, mostra as funções
      if (funcoesAgrupadasPorMinisterio.has(ministId)) {
        const info = funcoesAgrupadasPorMinisterio.get(ministId)!;
        partes.push(`${info.nome}: ${info.funcoes.join(', ')}`);
        funcoesAgrupadasPorMinisterio.delete(ministId);
      } else {
        partes.push(minist.nome);
      }
    }
  }

  // Funções de ministérios não inteiros
  for (const [ministId, info] of funcoesAgrupadasPorMinisterio.entries()) {
    partes.push(`${info.nome}: ${info.funcoes.join(', ')}`);
  }

  if (partes.length === 0) {
    return 'Todos os ministérios';
  }

  return partes.join(', ');
}

/**
 * Retorna true se há ao menos um ministério inteiro OU uma função selecionada.
 */
export function temEscopoSelecionado(
  ministeriosInteirosIds: string[] | null | undefined,
  funcoesIds: string[] | null | undefined,
): boolean {
  const mIds = ministeriosInteirosIds?.filter((id) => id) ?? [];
  const fIds = funcoesIds?.filter((id) => id) ?? [];
  return mIds.length > 0 || fIds.length > 0;
}

/**
 * Agrupa funções por ministério para renderização em árvore.
 */
export function agruparFuncoesPorMinisterio(
  funcoes: FuncaoInfo[],
  ministerios: MinisterioInfo[],
): Array<{
  ministerioId: string;
  ministerioNome: string;
  funcoes: Array<{ id: string; nome: string }>;
}> {
  const ministerioPorId = new Map(ministerios.map((m) => [m.id, m]));
  const agrupadoMap = new Map<
    string,
    {
      ministerioId: string;
      ministerioNome: string;
      funcoes: Map<string, string>;
    }
  >();

  for (const funcao of funcoes) {
    const minist = ministerioPorId.get(funcao.ministerioId);
    if (minist) {
      if (!agrupadoMap.has(funcao.ministerioId)) {
        agrupadoMap.set(funcao.ministerioId, {
          ministerioId: funcao.ministerioId,
          ministerioNome: minist.nome,
          funcoes: new Map(),
        });
      }
      agrupadoMap.get(funcao.ministerioId)!.funcoes.set(funcao.id, funcao.nome);
    }
  }

  return Array.from(agrupadoMap.values())
    .sort((a, b) => a.ministerioNome.localeCompare(b.ministerioNome))
    .map((ag) => ({
      ministerioId: ag.ministerioId,
      ministerioNome: ag.ministerioNome,
      funcoes: Array.from(ag.funcoes.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, nome]) => ({ id, nome })),
    }));
}
