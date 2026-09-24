import { ExternalUseCrudParams, useCrud } from './useCrud';

import { useMutation } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { IndisponibilidadesVoluntariosRepository } from '../domain/services/IndisponibilidadesVoluntariosRepository';
import { ResponseIndisponibilidadeVoluntarioDto } from '../domain/dtos/IndisponibilidadeVoluntario/indisponibilidade-voluntario.response';
import { CreateIndisponibilidadeVoluntarioDto } from '../domain/dtos/IndisponibilidadeVoluntario/indisponibilidade-voluntario.create';
import { UpdateIndisponibilidadeVoluntarioDto } from '../domain/dtos/IndisponibilidadeVoluntario/indisponibilidade-voluntario.update';
import { UpsertIndisponibilidadesVoluntarioDto } from '../domain/dtos/IndisponibilidadeVoluntario/upsert-indisponibilidades-voluntario.dto';
import { useAuth } from '../contexts/AuthContext';

export function useIndisponibilidadesVoluntariosCrud({
  autoFetch = false,
  initialParams,
  muteMessages = false,
}: ExternalUseCrudParams = {}) {
  const { igrejaAtiva } = useAuth();
  const igrejaId = igrejaAtiva?.id;

  const crud = useCrud<
    ResponseIndisponibilidadeVoluntarioDto,
    any,
    CreateIndisponibilidadeVoluntarioDto,
    UpdateIndisponibilidadeVoluntarioDto
  >({
    queryKey: 'indisponibilidades-voluntarios',
    autoFetch,
    initialParams,
    muteMessages,
    enabled: !!igrejaId,
    fetchAll: () => IndisponibilidadesVoluntariosRepository.getAll(),
    search: (query) =>
      IndisponibilidadesVoluntariosRepository.search(igrejaId ? { ...query, igrejaId } : query),
    add: (data) => {
      return IndisponibilidadesVoluntariosRepository.add(data);
    },
    update: (id, data) => {
      return IndisponibilidadesVoluntariosRepository.update(id, data, igrejaId);
    },
    remove: (id) => IndisponibilidadesVoluntariosRepository.remove(id),
    messages: {
      successDelete: 'Indisponibilidade removida com sucesso.',
      successCreate: 'Indisponibilidade criada com sucesso.',
      errorDelete: 'Erro ao remover a indisponibilidade.',
      errorCreate: 'Erro ao criar a indisponibilidade.',
      errorUpdate: 'Erro ao atualizar a indisponibilidade.',
    },
  });

  const upsertMany = useMutation({
    mutationFn: (payload: UpsertIndisponibilidadesVoluntarioDto) =>
      IndisponibilidadesVoluntariosRepository.upsertMany(payload),
    onSuccess: async () => {
      if (!muteMessages) {
        Toast.show({
          type: 'success',
          text1: 'Item atualizado com sucesso!',
        });
      }
      await crud.queryClient.invalidateQueries({ queryKey: [crud.queryKey] });
    },
    onError: (error) => {
      if (!muteMessages) {
        Toast.show({
          type: 'error',
          text1: 'Erro ao atualizar item.',
        });
      }
      console.log(error);
    },
  });

  const removeWithIgreja = useMutation({
    mutationFn: ({ id, igrejaId }: { id: string; igrejaId: string }) =>
      IndisponibilidadesVoluntariosRepository.remove(id, igrejaId),
    onSuccess: async () => {
      if (!muteMessages) {
        Toast.show({
          type: 'success',
          text1: 'Indisponibilidade removida com sucesso.',
        });
      }
      await crud.queryClient.invalidateQueries({ queryKey: [crud.queryKey] });
    },
    onError: (error) => {
      if (!muteMessages) {
        Toast.show({
          type: 'error',
          text1: 'Erro ao remover a indisponibilidade.',
        });
      }
      console.log(error);
    },
  });

  return {
    ...crud,
    upsertMany: upsertMany.mutateAsync,
    removeWithIgreja: removeWithIgreja.mutateAsync,
    isLoadingMutation: crud.isLoadingMutation || upsertMany.isPending || removeWithIgreja.isPending,
  };
}
