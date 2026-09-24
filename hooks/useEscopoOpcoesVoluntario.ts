import { useMemo } from 'react';
import { useMinisterioVoluntariosCrud } from './useMinisterioVoluntariosCrud';
import { Conjunction, DynamicQuery, Operator, ValueType } from '../domain/utils/query_utils';
import { MinisterioVoluntarioStatusEnum } from '../domain/enums/MinisterioVoluntario/ministerio-voluntario-status.enum';
import { useAuth } from '../contexts/AuthContext';

type OpcaoMinisterio = { id: string; nome: string };
type OpcaoFuncao = { id: string; nome: string; ministerioId: string };

/**
 * Opções do seletor "Onde vale" (ADR-0012): só ministérios em que o voluntário
 * está ativo e só funções que ele exerce — mesma regra que o backend valida
 * (EscopoIndisponibilidadeService). Listar os ministérios da igreja inteira
 * deixava escolher algo que o backend recusa com 400.
 */
export function useEscopoOpcoesVoluntario(voluntarioId: string | undefined) {
  const { igrejaAtiva } = useAuth();
  const igrejaId = igrejaAtiva?.id;

  const params = useMemo<DynamicQuery | undefined>(() => {
    if (!voluntarioId) return undefined;
    return {
      where: {
        conditions: [
          {
            path: 'voluntarioId',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: voluntarioId },
          },
          {
            path: 'status',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: MinisterioVoluntarioStatusEnum.Ativo },
          },
        ],
        conjunction: Conjunction.AND,
      },
      relations: ['ministerio', 'funcoes', 'funcoes.funcao'],
    } as DynamicQuery;
  }, [voluntarioId]);

  const { data, isLoading } = useMinisterioVoluntariosCrud({
    autoFetch: !!params,
    initialParams: params,
    muteMessages: true,
  });

  return useMemo(() => {
    const ministerios: OpcaoMinisterio[] = [];
    const funcoes: OpcaoFuncao[] = [];
    for (const mv of data ?? []) {
      if (!mv.ministerio) continue;
      if (igrejaId && mv.ministerio.igrejaId !== igrejaId) continue;
      ministerios.push({ id: mv.ministerio.id, nome: mv.ministerio.nome });
      for (const f of mv.funcoes ?? []) {
        if (!f.funcao) continue;
        funcoes.push({ id: f.funcao.id, nome: f.funcao.nome, ministerioId: mv.ministerio.id });
      }
    }
    return { ministerios, funcoes, isLoading };
  }, [data, igrejaId, isLoading]);
}
