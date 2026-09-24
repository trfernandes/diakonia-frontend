import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LancamentosIndisponibilidadeRepository as Repo } from '../domain/services/LancamentosIndisponibilidadeRepository';
import { CriarLancamentoDto, SalvarConfigDto } from '../domain/api/LancamentosIndisponibilidadeApi';

const KEY = 'lancamentos-indisponibilidade';

/** Lançamentos abertos do voluntário logado (card em Pessoal > Indisponibilidade). */
export function useMeusLancamentos() {
  const queryClient = useQueryClient();
  const queryKey = [KEY, 'me'];

  const query = useQuery({ queryKey, queryFn: () => Repo.meus() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const marcar = useMutation({
    mutationFn: (lancamentoId: string) => Repo.marcarJaLancei(lancamentoId),
    onSuccess: invalidate,
  });
  const desfazer = useMutation({
    mutationFn: (lancamentoId: string) => Repo.desfazerJaLancei(lancamentoId),
    onSuccess: invalidate,
  });

  return {
    lancamentos: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    marcarJaLancei: marcar.mutateAsync,
    desfazerJaLancei: desfazer.mutateAsync,
    isMutating: marcar.isPending || desfazer.isPending,
  };
}

/** Lançamentos do ministério (visão do líder). */
export function useLancamentosDoMinisterio(ministerioId?: string) {
  const queryClient = useQueryClient();
  const queryKey = [KEY, 'ministerio', ministerioId];

  const query = useQuery({
    queryKey,
    enabled: Boolean(ministerioId),
    queryFn: () => Repo.listar(ministerioId!),
  });

  const invalidateTudo = () => queryClient.invalidateQueries({ queryKey: [KEY] });

  const criar = useMutation({
    mutationFn: (dto: CriarLancamentoDto) => Repo.criar(ministerioId!, dto),
    onSuccess: invalidateTudo,
  });
  const cancelar = useMutation({
    mutationFn: (lancamentoId: string) => Repo.cancelar(ministerioId!, lancamentoId),
    onSuccess: invalidateTudo,
  });

  return {
    lancamentos: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    criarLancamento: criar.mutateAsync,
    isCriando: criar.isPending,
    cancelarLancamento: cancelar.mutateAsync,
    isCancelando: cancelar.isPending,
  };
}

export function useLancamentoDetalhe(ministerioId?: string, lancamentoId?: string) {
  const query = useQuery({
    queryKey: [KEY, 'detalhe', ministerioId, lancamentoId],
    enabled: Boolean(ministerioId && lancamentoId),
    queryFn: () => Repo.detalhe(ministerioId!, lancamentoId!),
  });
  return { detalhe: query.data, isLoading: query.isLoading, isError: query.isError };
}

/** Lançamentos que cruzam o período da escala (assistente). */
export function useResumoLancamentos(ministerioId?: string, inicio?: string, fim?: string) {
  const query = useQuery({
    queryKey: [KEY, 'resumo', ministerioId, inicio, fim],
    enabled: Boolean(ministerioId && inicio && fim),
    // Auxiliar sem acesso de líder recebe 403: card só some, sem ficar tentando de novo.
    retry: false,
    queryFn: () => Repo.resumo(ministerioId!, inicio!, fim!),
  });
  return { resumo: query.data ?? [], isLoading: query.isLoading };
}

export function useLancamentoConfig(ministerioId?: string) {
  const queryClient = useQueryClient();
  const queryKey = [KEY, 'config', ministerioId];

  const query = useQuery({
    queryKey,
    enabled: Boolean(ministerioId),
    queryFn: () => Repo.config(ministerioId!),
  });

  const atualizarCache = (config: Awaited<ReturnType<typeof Repo.config>>) =>
    queryClient.setQueryData(queryKey, config);

  const salvar = useMutation({
    mutationFn: (dto: SalvarConfigDto) => Repo.salvarConfig(ministerioId!, dto),
    onSuccess: atualizarCache,
  });
  const pular = useMutation({
    mutationFn: (mes: string) => Repo.pularMes(ministerioId!, mes),
    onSuccess: atualizarCache,
  });
  const despular = useMutation({
    mutationFn: (mes: string) => Repo.despularMes(ministerioId!, mes),
    onSuccess: atualizarCache,
  });

  return {
    config: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    salvarConfig: salvar.mutateAsync,
    isSalvando: salvar.isPending,
    pularMes: pular.mutateAsync,
    despularMes: despular.mutateAsync,
    isAlterandoMes: pular.isPending || despular.isPending,
  };
}
