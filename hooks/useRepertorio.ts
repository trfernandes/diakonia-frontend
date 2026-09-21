import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { RepertorioRepository } from '../domain/services/RepertorioRepository';
import { DynamicQuery } from '../domain/utils/query_utils';
import { CreateRepertorioEtiquetaDto } from '../domain/dtos/Repertorio/repertorio-etiqueta.create';
import { UpdateRepertorioEtiquetaDto } from '../domain/dtos/Repertorio/repertorio-etiqueta.update';
import { CreateRepertorioMusicaDto } from '../domain/dtos/Repertorio/repertorio-musica.create';
import { UpdateRepertorioMusicaDto } from '../domain/dtos/Repertorio/repertorio-musica.update';

export function useRepertorioEtiquetas(ministerioId?: string, query?: DynamicQuery) {
  const { igrejaAtiva } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['repertorio-etiquetas', igrejaAtiva?.id, ministerioId, query];
  const queryResult = useQuery({
    queryKey,
    enabled: !!igrejaAtiva && !!ministerioId,
    queryFn: () => RepertorioRepository.searchEtiquetas(igrejaAtiva!.id, ministerioId!, query),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['repertorio-etiquetas', igrejaAtiva?.id, ministerioId],
    });
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateRepertorioEtiquetaDto) =>
      RepertorioRepository.createEtiqueta(igrejaAtiva!.id, ministerioId!, dto),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRepertorioEtiquetaDto }) =>
      RepertorioRepository.updateEtiqueta(igrejaAtiva!.id, ministerioId!, id, dto),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      RepertorioRepository.removeEtiqueta(igrejaAtiva!.id, ministerioId!, id),
    onSuccess: invalidate,
  });

  return {
    ...queryResult,
    criarEtiqueta: createMutation.mutateAsync,
    atualizarEtiqueta: updateMutation.mutateAsync,
    removerEtiqueta: deleteMutation.mutateAsync,
    isMutatingEtiqueta:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

export function useRepertorioMusicas(ministerioId?: string, query?: DynamicQuery) {
  const { igrejaAtiva } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['repertorio-musicas', igrejaAtiva?.id, ministerioId, query];
  const queryResult = useQuery({
    queryKey,
    enabled: !!igrejaAtiva && !!ministerioId,
    queryFn: () => RepertorioRepository.searchMusicas(igrejaAtiva!.id, ministerioId!, query),
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['repertorio-musicas', igrejaAtiva?.id, ministerioId],
    });
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateRepertorioMusicaDto) =>
      RepertorioRepository.createMusica(igrejaAtiva!.id, ministerioId!, dto),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRepertorioMusicaDto }) =>
      RepertorioRepository.updateMusica(igrejaAtiva!.id, ministerioId!, id, dto),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      RepertorioRepository.removeMusica(igrejaAtiva!.id, ministerioId!, id),
    onSuccess: invalidate,
  });

  return {
    ...queryResult,
    criarMusica: createMutation.mutateAsync,
    atualizarMusica: updateMutation.mutateAsync,
    removerMusica: deleteMutation.mutateAsync,
    isMutatingMusica:
      createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

export function useYoutubeVersionSearch(query?: string, enabled = true, limit = 6) {
  const { igrejaAtiva } = useAuth();

  const normalizedQuery = query?.trim() ?? '';

  return useQuery({
    queryKey: ['youtube-version-search', igrejaAtiva?.id, normalizedQuery, limit],
    enabled: !!igrejaAtiva && enabled && normalizedQuery.length >= 2,
    queryFn: () =>
      RepertorioRepository.searchYoutubeVersions(igrejaAtiva!.id, normalizedQuery, limit),
    // A chave de API do YouTube é compartilhada por todas as igrejas — retentar
    // automaticamente (padrão do react-query: 3x com backoff) contra um 429 de rate
    // limit só multiplica chamadas durante a janela de bloqueio e piora o problema.
    retry: false,
  });
}
