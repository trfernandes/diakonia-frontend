import FancyPageView from '../../../../../components/containers/FancyPageView';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FancyLoading from '../../../../../components/FancyLoading';
import FancyText from '../../../../../components/FancyText';
import DefaultIcons from '../../../../../components/FancyIcons';
import { ActivityIndicator } from 'react-native';
import { usePallete } from '../../../../../hooks/usePallete';
import { ColorUtils } from '../../../../../utils/color_utils';
import Header from '../../../../../components/pages/ministerios/escalas/details/Header';
import EscalaHorizontalPager from '../../../../../components/pages/ministerios/escalas/details/EscalaHorizontalPager';
import { useEscalaItensCrud } from '../../../../../hooks/useEscalaItensCrud';
import { SubstituicaoConfirmDialog } from '../../../../../components/pages/ministerios/escalas/details/SubstituirVoluntarioModal';
import { DynamicQuery, Operator, ValueType } from '../../../../../domain/utils/query_utils';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import { useEscalasCrud } from '../../../../../hooks/useEscalaCrud';
import { EscalaItemStatusEnum } from '../../../../../domain/enums/Escala/escala-item-status.enum';
import { EscalaStatusEnum } from '../../../../../domain/enums/Escala/escala-status.enum';
import { EscalaOrigemEnum } from '../../../../../domain/enums/Escala/escala-origem.enum';
import FancyScreenErrorHandler from '../../../../../components/error/FancyScreenErrorHandler';
import FancyListEmpty from '../../../../../components/list/FancyListEmpty';
import { EscalaRepository } from '../../../../../domain/services/EscalaRepository';
import { useAuth } from '../../../../../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import EscalaParametrizacaoModal from '../../../../../components/pages/ministerios/escalas/details/EscalaParametrizacaoModal';
import AdicionarItemManualModal, {
  AdicionarItemManualConfirmDialog,
} from '../../../../../components/pages/ministerios/escalas/details/AdicionarItemManualModal';
import { AdicionarFuncaoConfirmDialog } from '../../../../../components/pages/ministerios/escalas/details/AdicionarFuncaoModal';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import { EscalaTemplateExperienciaEnum } from '../../../../../domain/enums/EscalaTemplate/escala-template-experiencia.enum';
import { EscalaParametrizacaoType } from '../../../../../domain/dtos/Escala/escala.response';
import { useEventoSetlistResponsavel } from '../../../../../hooks/useEventoSetlistResponsavel';
import { TemplatePadraoEscopoEnum } from '../../../../../domain/enums/Evento/template-padrao-escopo.enum';
import { getApiErrorMessage } from '../../../../../domain/api/api-error';
import { canManageEventoOcorrencia } from '../../../../../utils/ministerio_permissoes';
import { combineOccurrenceWithEventTime } from '../../../../../utils/evento-datetime';
import { useLoading } from '../../../../../contexts/LoadingContext';
import { UpdateEscalaItemDto } from '../../../../../domain/dtos/Escala/escala-item.update';
import { useAnalytics } from '../../../../../core/analytics/AnalyticsContext';
import { AnalyticsEvent, buildEscalaPublicadaProps } from '../../../../../core/analytics/events';
import ResolverConflitosModal from '../../../../../components/pages/ministerios/escalas/details/ResolverConflitosModal';
import {
  ConflitoMultiMinisteriosType,
  PublicarEscalaAcaoEnum,
  ResolverConflitoAcaoEnum,
  ResponseConflitosMultiMinisteriosDto,
} from '../../../../../domain/dtos/Escala/escala-conflito.dto';

export type EscalaItemDataType = {
  dataOcorrencia: string;
  evento: EscalaItemEventoDataType['evento'];
  equipe: EscalaItemEquipeType[];
  escalaItemId: string;
  responsavelSetlistVoluntarioId?: string | null;
  dataHoraInicioOcorrencia?: Date | null;
  dataHoraTerminoOcorrencia?: Date | null;
  localOcorrencia?: string | null;
};

export type EscalaItemEventoDataType = {
  dataOcorrencia: string;
  evento: {
    id: string;
    nome: string;
    cor?: string;
    local?: string;
    dataInicio?: Date;
    dataTermino?: Date;
  };
  voluntario?: {
    minVoluntarioId: string;
    voluntarioId: string;
    nome: string;
    fotoUrl?: string;
    fotoThumbUrl?: string;
  };
  funcao?: { id: string; nome: string };
  status: EscalaItemStatusEnum;
};

export type EscalaItemEquipeType = {
  idEscalaItem: string;
  voluntario?: EscalaItemEventoDataType['voluntario'];
  // Pessoa avulsa (não cadastrada): nome livre digitado pelo líder — presente só quando
  // `voluntario` é null por escolha do líder, não persiste/reaproveita entre escalas.
  nomeAvulso?: string | null;
  // Função avulsa (não cadastrada): mesmo padrão de nomeAvulso, aplicado à função —
  // presente só quando `funcao` é null por escolha do líder.
  nomeFuncaoAvulsa?: string | null;
  funcao?: {
    id: string;
    nome: string;
    experiencia?: EscalaTemplateExperienciaEnum;
    expMinima?: EscalaTemplateExperienciaEnum;
  };
  status: EscalaItemEventoDataType['status'];
};

function getOccurrenceStartTimestamp(grupo: EscalaItemDataType) {
  if (grupo.dataHoraInicioOcorrencia) return grupo.dataHoraInicioOcorrencia.getTime();
  return combineOccurrenceWithEventTime(grupo.dataOcorrencia, grupo.evento.dataInicio).getTime();
}

export default function MinisterioEscalasDetailsPage() {
  const { ministerioId, escalaId, viewMode } = useLocalSearchParams<{
    ministerioId: string;
    escalaId: string;
    viewMode?: 'view' | 'edit';
  }>();
  const { igrejaAtiva } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isParametrizacaoOpen, setIsParametrizacaoOpen] = useState(false);
  const [isAdicionarItemManualOpen, setIsAdicionarItemManualOpen] = useState(false);
  const [auditoria, setAuditoria] = useState<any>(null);
  const [isAuditoriaOpen, setIsAuditoriaOpen] = useState(false);
  const [conflitos, setConflitos] = useState<ResponseConflitosMultiMinisteriosDto | null>(null);
  const [isConflitosModalOpen, setIsConflitosModalOpen] = useState(false);
  const palette = usePallete();
  const prevStatusRef = useRef<EscalaStatusEnum | undefined>(undefined);
  const { salvarResponsavelSetlist, isSavingResponsavelSetlist } = useEventoSetlistResponsavel();
  const { showLoading, hideLoading } = useLoading();
  const canEditSetlistOwner =
    canManageEventoOcorrencia(igrejaAtiva, ministerioId) && viewMode !== 'view';

  const initialParams = useMemo<DynamicQuery>(
    () => ({
      where: {
        conditions: [
          {
            path: 'id',
            operator: Operator.EQUALS,
            value: { type: ValueType.LITERAL, value: escalaId },
          },
        ],
      },
      relations: [
        'itens',
        'itens.evento',
        'itens.voluntario',
        'itens.voluntario.voluntario',
        'itens.voluntario.funcoes',
        'itens.funcao',
      ],
    }),
    [escalaId],
  );

  const posthog = useAnalytics();

  const {
    data: escalaData,
    isLoading,
    isError,
    regenerate: regenerateEscala,
    isRegenerating,
    remove: removeEscala,
    refetch: refetchEscala,
  } = useEscalasCrud({
    autoFetch: true,
    initialParams,
  });

  const {
    update: updateEscalaItem,
    remove: removeEscalaItem,
    add: addEscalaItem,
    isError: isErrorEscalaItens,
  } = useEscalaItensCrud({
    autoFetch: false,
    muteMessages: true,
  });

  const startRef = useRef<number>(0);

  // Marca o início
  if (!startRef.current) startRef.current = performance.now();

  // Polling enquanto status = Gerando
  useEffect(() => {
    if (escalaData?.[0]?.status !== EscalaStatusEnum.Gerando) return;
    const interval = setInterval(() => {
      refetchEscala();
    }, 4000);
    return () => clearInterval(interval);
  }, [escalaData?.[0]?.status]);

  // Detectar transição Gerando → Gerada para toast + auditoria
  useEffect(() => {
    const escala = escalaData?.[0];
    if (!escala) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = escala.status;
    if (prev === EscalaStatusEnum.Gerando && escala.status === EscalaStatusEnum.Gerada) {
      Toast.show({ type: 'success', text1: 'Escala gerada com sucesso!' });
      EscalaRepository.getAuditoria(escalaId)
        .then(setAuditoria)
        .catch(() => {});
    }
  }, [escalaData?.[0]?.status]);

  //   const {
  //     data: escalaItensData,
  //     update: updateEscalaItem,
  //     isError: isErrorEscalaItens,
  //     isLoading: isLoadingEscalaItens,
  //     isLoadingMutation: isLoadingMutationEscalaItens,
  //   } = useEscalaItensCrud({
  //     autoFetch: true,
  //     initialParams: {
  //       where: {
  //         conditions: [
  //           {
  //             path: 'escala.id',
  //             operator: Operator.EQUALS,
  //             value: { type: ValueType.LITERAL, value: escalaId },
  //           },
  //         ],
  //       },
  //       relations: ['evento', 'voluntario', 'voluntario.voluntario', 'funcao', 'itens'],
  //     },
  //   });

  //   const { update: updateEscala, remove: removeEscala } = useEscalasCrud({
  //     autoFetch: false,
  //   });

  const eventosData = useMemo(() => {
    const start = performance.now();
    const escalaItens = escalaData?.[0]?.itens ?? [];
    if (escalaItens.length === 0) return [];

    const mapa = new Map<string, EscalaItemDataType>();
    const cacheEventos = new Map<string, EscalaItemDataType['evento']>();

    // 🔹 Função auxiliar para mapear e cachear eventos
    const mapEvento = (e: any): EscalaItemDataType['evento'] => {
      if (!cacheEventos.has(e?.id)) {
        cacheEventos.set(e?.id, {
          id: e?.id!,
          nome: e.nome,
          cor: e.cor,
          local: e.local,
          dataInicio: e.dataInicio,
          dataTermino: e.dataTermino,
        });
      }
      return cacheEventos.get(e?.id)!;
    };

    // 🔹 Lookup de expMinima por eventoId-funcaoId via parametrizacao
    const expMinimaLookup = new Map<string, EscalaTemplateExperienciaEnum>();
    const rawParam = (escalaData?.[0] as any)?.parametrizacao;
    if (rawParam) {
      const param: EscalaParametrizacaoType =
        typeof rawParam === 'string' ? JSON.parse(rawParam) : rawParam;
      for (const ev of param.eventos ?? []) {
        for (const f of ev.equipe?.funcoes ?? []) {
          if (f.expMinima != null) {
            expMinimaLookup.set(`${ev.id}-${f.id}`, f.expMinima as EscalaTemplateExperienciaEnum);
          }
        }
      }
    }

    // 🔹 Agrupamento otimizado
    for (let i = 0; i < escalaItens.length; i++) {
      const item = escalaItens[i];
      const chave = `${item.dataOcorrencia}-${item.evento?.id}`;

      let grupo = mapa.get(chave);
      if (!grupo) {
        grupo = {
          dataOcorrencia: item.dataOcorrencia,
          evento: mapEvento(item.evento),
          equipe: [],
          escalaItemId: item.id!,
          responsavelSetlistVoluntarioId: item.responsavelSetlistVoluntarioId ?? null,
          dataHoraInicioOcorrencia: item.dataHoraInicioOcorrencia
            ? new Date(item.dataHoraInicioOcorrencia)
            : null,
          dataHoraTerminoOcorrencia: item.dataHoraTerminoOcorrencia
            ? new Date(item.dataHoraTerminoOcorrencia)
            : null,
          localOcorrencia: item.localOcorrencia ?? null,
        } as EscalaItemDataType;
        mapa.set(chave, grupo);
      }

      if (!grupo.responsavelSetlistVoluntarioId && item.responsavelSetlistVoluntarioId) {
        grupo.responsavelSetlistVoluntarioId = item.responsavelSetlistVoluntarioId;
      }

      const expDoVoluntario = item.voluntario?.funcoes?.find(
        (f: any) => f.funcaoId === item.funcao?.id,
      )?.experiencia as EscalaTemplateExperienciaEnum | undefined;

      const expMinima = expMinimaLookup.get(`${item.evento?.id}-${item.funcao?.id}`);

      if (!item.funcao?.id && !item.nomeFuncaoAvulsa) continue;

      grupo.equipe.push({
        idEscalaItem: item?.id!,
        voluntario: item.voluntario
          ? {
              minVoluntarioId: item.voluntario?.id!,
              voluntarioId: item.voluntario?.voluntario?.id!,
              nome: item.voluntario?.voluntario?.nome!,
              fotoUrl: item.voluntario?.voluntario?.fotoUrl,
              fotoThumbUrl: item.voluntario?.voluntario?.fotoThumbUrl,
            }
          : undefined,
        nomeAvulso: item.nomeAvulso ?? null,
        nomeFuncaoAvulsa: item.nomeFuncaoAvulsa ?? null,
        funcao: item.funcao?.id
          ? {
              id: item.funcao.id,
              nome: item.funcao.nome!,
              experiencia: expDoVoluntario,
              expMinima,
            }
          : undefined,
        status: item.status,
      });
    }

    // 🔹 Ordenação otimizada
    const gruposOrdenados = Array.from(mapa.values()) as (EscalaItemDataType & {
      _t: number;
    })[];
    for (const g of gruposOrdenados) g._t = getOccurrenceStartTimestamp(g);

    gruposOrdenados.sort((a, b) => {
      if (a._t !== b._t) return a._t - b._t;
      return a.evento.nome < b.evento.nome ? -1 : a.evento.nome > b.evento.nome ? 1 : 0;
    });

    // 🔹 Ordenar equipe internamente
    for (const grupo of gruposOrdenados) {
      grupo.equipe.sort((a, b) => {
        const funcaoA = a.funcao?.nome ?? '';
        const funcaoB = b.funcao?.nome ?? '';

        if (funcaoA < funcaoB) return -1;
        if (funcaoA > funcaoB) return 1;

        const voluntarioA = a.voluntario?.minVoluntarioId ?? '';
        const voluntarioB = b.voluntario?.minVoluntarioId ?? '';
        return voluntarioA.localeCompare(voluntarioB);
      });
    }

    const end = performance.now();
    console.log(`⏱️ Tempo de processamento dos resultados: ${end - start} ms`);

    return gruposOrdenados;
  }, [escalaData?.[0]?.itens]);

  const handleSubstituirVoluntario = useCallback(
    async (data: SubstituicaoConfirmDialog): Promise<boolean> => {
      showLoading('Substituindo voluntário...');
      try {
        await updateEscalaItem?.({
          id: data.idEscalaItem,
          data: data.nomeAvulso
            ? ({
                voluntarioId: null,
                nomeAvulso: data.nomeAvulso,
                status: EscalaItemStatusEnum.Pendente,
              } satisfies UpdateEscalaItemDto)
            : {
                voluntarioId: data.idSubstituto,
                status: EscalaItemStatusEnum.Pendente,
              },
        });
        await refetchEscala();
        Toast.show({
          type: 'success',
          text1: 'Voluntário substituído com sucesso.',
        });
        return true;
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível substituir o voluntário.',
        });
        return false;
      } finally {
        hideLoading();
      }
    },
    [updateEscalaItem, refetchEscala, showLoading, hideLoading],
  );

  const handleAdicionarVoluntario = useCallback(
    async (data: {
      idEscalaItem: string;
      idVoluntario?: string;
      nomeAvulso?: string;
    }): Promise<boolean> => {
      try {
        await updateEscalaItem?.({
          id: data.idEscalaItem,
          data: data.nomeAvulso
            ? ({
                nomeAvulso: data.nomeAvulso,
                status: EscalaItemStatusEnum.Pendente,
              } satisfies UpdateEscalaItemDto)
            : {
                voluntarioId: data.idVoluntario,
                status: EscalaItemStatusEnum.Pendente,
              },
        });
        await refetchEscala();
        Toast.show({
          type: 'success',
          text1: 'Voluntário adicionado à função.',
        });
        return true;
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível adicionar o voluntário.',
          text2: getApiErrorMessage(error, 'Tente novamente em instantes.'),
        });
        return false;
      }
    },
    [updateEscalaItem, refetchEscala],
  );

  const handleRemoverVoluntario = useCallback(
    async (idEscalaItem: string): Promise<boolean> => {
      try {
        await updateEscalaItem?.({
          id: idEscalaItem,
          data: {
            voluntarioId: null as any,
            nomeAvulso: null,
            status: EscalaItemStatusEnum.Pendente,
          } as any,
        });
        await refetchEscala();
        Toast.show({
          type: 'success',
          text1: 'Voluntário removido da função.',
        });
        return true;
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível remover o voluntário.',
        });
        return false;
      }
    },
    [updateEscalaItem, refetchEscala],
  );

  const handleDeleteEvento = useCallback(
    async (eventoId: string, dataOcorrencia: string): Promise<boolean> => {
      try {
        if (!igrejaAtiva?.id) return false;
        await EscalaRepository.deleteItensByEvento(escalaId, igrejaAtiva.id, {
          eventoId,
          dataOcorrencia,
        });
        await refetchEscala();
        Toast.show({
          type: 'success',
          text1: 'Evento removido com sucesso.',
        });
        return true;
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível remover o evento.',
        });
        return false;
      }
    },
    [escalaId, refetchEscala, igrejaAtiva?.id],
  );

  const handleUpdateResponsavelSetlist = useCallback(
    async ({
      eventoId,
      dataOcorrencia,
      responsavelVoluntarioId,
    }: {
      eventoId: string;
      dataOcorrencia: string;
      responsavelVoluntarioId: string | null;
    }): Promise<boolean> => {
      try {
        showLoading('Salvando...');
        await salvarResponsavelSetlist({
          eventoId,
          data: {
            ministerioId,
            dataOcorrencia,
            escopo: TemplatePadraoEscopoEnum.OCORRENCIA,
            responsavelVoluntarioId,
          },
        });
        await refetchEscala();
        Toast.show({
          type: 'success',
          text1: 'Responsável do setlist atualizado',
        });
        return true;
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Erro ao salvar responsável do setlist',
          text2: getApiErrorMessage(error, 'Não foi possível salvar o responsável do setlist.'),
        });
        return false;
      } finally {
        hideLoading();
      }
    },
    [refetchEscala, salvarResponsavelSetlist, showLoading, hideLoading],
  );

  const handleAdicionarFuncao = useCallback(
    async (data: AdicionarFuncaoConfirmDialog): Promise<boolean> => {
      try {
        await addEscalaItem?.({
          escalaId: escalaId,
          eventoId: data.eventoId,
          dataOcorrencia: data.dataOcorrencia,
          funcaoId: data.funcaoId,
          nomeFuncaoAvulsa: data.nomeFuncaoAvulsa,
        });
        await refetchEscala();
        Toast.show({
          type: 'success',
          text1: 'Função adicionada à escala.',
        });
        return true;
      } catch {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível adicionar a função.',
        });
        return false;
      }
    },
    [addEscalaItem, escalaId, refetchEscala],
  );

  const handleAdicionarItemManual = useCallback(
    async (data: AdicionarItemManualConfirmDialog): Promise<void> => {
      try {
        for (const atribuicao of data.atribuicoes) {
          await addEscalaItem?.({
            escalaId: escalaId,
            eventoId: data.eventoId,
            dataOcorrencia: data.dataOcorrencia,
            funcaoId: atribuicao.funcaoId,
            voluntarioId: atribuicao.voluntarioId,
          });
        }
        await refetchEscala();
        setIsAdicionarItemManualOpen(false);
        Toast.show({
          type: 'success',
          text1:
            data.atribuicoes.length > 1
              ? 'Itens adicionados à escala.'
              : 'Item adicionado à escala.',
        });
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível adicionar o item.',
          text2: getApiErrorMessage(error, 'Tente novamente em instantes.'),
        });
      }
    },
    [addEscalaItem, escalaId, refetchEscala],
  );

  const handleExcluirFuncao = useCallback(
    async (funcaoId: string, eventoId: string, dataOcorrencia: string): Promise<void> => {
      try {
        // Buscar todos os itens da escala com esta função, evento e data
        const itensToRemove = escalaData?.[0]?.itens?.filter(
          (item) =>
            item.funcao?.id === funcaoId &&
            item.evento?.id === eventoId &&
            item.dataOcorrencia === dataOcorrencia,
        );

        if (itensToRemove && itensToRemove.length > 0) {
          // Remover todos os itens dessa função
          await Promise.all(itensToRemove.map((item) => removeEscalaItem?.(item.id!)));
          await refetchEscala();
          Toast.show({
            type: 'success',
            text1: 'Função removida da escala.',
          });
        }
      } catch (error) {
        console.error('Erro ao excluir função:', error);
        Toast.show({
          type: 'error',
          text1: 'Não foi possível excluir a função.',
        });
      }
    },
    [escalaData, removeEscalaItem, refetchEscala],
  );

  const handleExcluirFuncaoAvulsa = useCallback(
    async (idEscalaItem: string): Promise<void> => {
      try {
        await removeEscalaItem?.(idEscalaItem);
        await refetchEscala();
        Toast.show({
          type: 'success',
          text1: 'Função removida da escala.',
        });
      } catch (error) {
        console.error('Erro ao excluir função avulsa:', error);
        Toast.show({
          type: 'error',
          text1: 'Não foi possível excluir a função.',
        });
      }
    },
    [removeEscalaItem, refetchEscala],
  );

  const tentarPublicar = useCallback(async () => {
    if (!igrejaAtiva?.id) return;
    try {
      setIsPublishing(true);
      const resultado = await EscalaRepository.publicar(escalaId, {
        igrejaId: igrejaAtiva.id,
        acao: PublicarEscalaAcaoEnum.Publicar,
      });
      const conflitosResultado = resultado as ResponseConflitosMultiMinisteriosDto;
      if (conflitosResultado?.temConflito) {
        setConflitos(conflitosResultado);
        setIsConflitosModalOpen(true);
        return;
      }
      posthog.capture(
        AnalyticsEvent.EscalaPublicada,
        buildEscalaPublicadaProps({
          escalaId,
          qtdItens: escalaData?.[0]?.itens?.length ?? 0,
        }),
      );
      await refetchEscala();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Não foi possível publicar.',
        text2: getApiErrorMessage(error, 'Tente novamente em instantes.'),
      });
    } finally {
      setIsPublishing(false);
    }
  }, [escalaId, igrejaAtiva?.id, refetchEscala, escalaData, posthog]);

  const handlePublishPress = useCallback(() => {
    FancyAlert.alert('Publicação de escala', 'Deseja realmente publicar esta escala?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: tentarPublicar,
      },
    ]);
  }, [tentarPublicar]);

  const handleResolverConflitoSimples = useCallback(
    async (
      acao: 'trocar_voluntario' | 'deixar_vago' | 'perguntar_voluntario',
      conflito: ConflitoMultiMinisteriosType,
      extra?: { voluntarioSubstitutoId?: string; ministerioBId?: string },
    ) => {
      if (!igrejaAtiva?.id) return;
      try {
        await EscalaRepository.resolverConflito(escalaId, {
          acao: acao as unknown as ResolverConflitoAcaoEnum,
          escalaItemIdConflito: conflito.escalaItemId,
          ...extra,
        });
        // Após resolver 1 conflito, tenta detectar/publicar de novo — pode haver outros restantes.
        const resultado = await EscalaRepository.publicar(escalaId, {
          igrejaId: igrejaAtiva.id,
          acao: PublicarEscalaAcaoEnum.Publicar,
        });
        const conflitosResultado = resultado as ResponseConflitosMultiMinisteriosDto;
        if (conflitosResultado?.temConflito) {
          setConflitos(conflitosResultado);
        } else {
          setConflitos(null);
          setIsConflitosModalOpen(false);
          await refetchEscala();
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Não foi possível resolver o conflito.',
          text2: getApiErrorMessage(error, 'Tente novamente em instantes.'),
        });
      }
    },
    [escalaId, igrejaAtiva?.id, refetchEscala],
  );

  const handleGeneratePress = useCallback(() => {
    const escala = escalaData?.[0];
    if (!escala) return;

    if (isRegenerating || isPublishing) {
      return;
    }

    if (escala.status !== EscalaStatusEnum.Gerada && escala.status !== EscalaStatusEnum.Erro) {
      return;
    }

    FancyAlert.alert(
      'Recalcular Escala',
      'Isso vai recalcular a escala com os dados atuais e substituir os itens existentes. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Recalcular',
          style: 'destructive',
          onPress: async () => {
            try {
              await regenerateEscala?.(escalaId);
              await refetchEscala();
              // Não toastar sucesso aqui — o polling detecta a transição Gerando → Gerada
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Não foi possível recalcular.',
                text2: getApiErrorMessage(error, 'Tente novamente em instantes.'),
              });
            }
          },
        },
      ],
    );
  }, [escalaData, escalaId, isPublishing, isRegenerating, regenerateEscala, refetchEscala]);

  const handleDeletePress = useCallback(() => {
    FancyAlert.alert('Exclusão de escala', 'Deseja realmente excluir esta escala?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: async () => {
          await removeEscala(escalaId);
          router.back();
        },
      },
    ]);
  }, [escalaId, removeEscala, router]);

  if (isError || isErrorEscalaItens) {
    console.log('Erro ao carregar dados da escala:', isError ? 'isError' : 'isErrorEscalaItens');
    return (
      <FancyScreenErrorHandler
        error={{ name: 'Erro', message: 'Erro ao carregar os dados da escala.' }}
      />
    );
  }

  if (isLoading || !escalaData?.[0]) {
    return <FancyLoading />;
  }

  const escalaStatus = escalaData?.[0]?.status;
  const isGerando = escalaStatus === EscalaStatusEnum.Gerando;
  const isErro = escalaStatus === EscalaStatusEnum.Erro;
  const isBlockingScreen = isRegenerating || isPublishing;
  const blockingLabel = isPublishing ? 'Publicando escala...' : 'Recalculando escala...';

  return (
    <View style={styles.pageWrapper}>
      <FancyPageView style={styles.container}>
        <Header
          escala={escalaData?.[0]}
          viewMode={viewMode}
          isRegenerating={isRegenerating}
          isPublishing={isPublishing}
          isScreenBlocked={isBlockingScreen}
          onInsightsPress={() =>
            router.push({
              pathname: '/(app)/(drawer)/ministerios/escalas/insights',
              params: { ministerioId, escalaId },
            })
          }
          onPublishPress={handlePublishPress}
          onGeneratePress={handleGeneratePress}
          onDeletePress={handleDeletePress}
          onParametrizacaoPress={() => setIsParametrizacaoOpen(true)}
        />

        {isGerando && (
          <View style={styles.statusBanner}>
            <ActivityIndicator size='small' color={palette.secondary} />
            <FancyText size='small' type='medium' color={palette.secondary}>
              Gerando itens da escala...
            </FancyText>
          </View>
        )}

        {isErro && (
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: ColorUtils.withAlpha(palette.error, 0.08) },
            ]}
          >
            <DefaultIcons.Custom
              library='MaterialCommunityIcons'
              name='alert-circle-outline'
              size={18}
              color={palette.error}
            />
            <FancyText size='small' type='medium' color={palette.error} style={{ flex: 1 }}>
              Falha na geração da escala.
            </FancyText>
            <FancyText
              size='small'
              type='semiBold'
              color={palette.error}
              onPress={handleGeneratePress}
            >
              Tentar novamente
            </FancyText>
          </View>
        )}

        {auditoria && !isGerando && (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: ColorUtils.withAlpha(palette.primary, 0.06),
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 6,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='chart-bar'
                size={16}
                color={palette.primary}
              />
              <FancyText size='small' type='semiBold' color={palette.primary} style={{ flex: 1 }}>
                Relatório de geração
              </FancyText>
              <FancyText
                size='small'
                type='medium'
                color={palette.primary}
                onPress={() => setIsAuditoriaOpen((v) => !v)}
              >
                {isAuditoriaOpen ? 'Fechar' : 'Ver'}
              </FancyText>
            </View>
            {isAuditoriaOpen && (
              <FancyText size='extraSmall' type='medium' color={palette.fonts.inactive}>
                {Array.isArray(auditoria)
                  ? `${auditoria.length} slot(s) processados`
                  : 'Dados de auditoria disponíveis'}
              </FancyText>
            )}
          </View>
        )}

        {!isGerando && eventosData.length === 0 && (
          <FancyListEmpty
            label='Nenhum evento adicionado'
            helperText='A escala ainda não possui eventos.'
            icon={{ library: 'MaterialCommunityIcons', name: 'calendar-text-outline', size: 68 }}
            actionLabel={
              escalaData[0].origem === EscalaOrigemEnum.Manual &&
              (!viewMode || viewMode === 'edit') &&
              !isBlockingScreen
                ? 'Adicionar evento'
                : undefined
            }
            actionIcon={{ library: 'MaterialIcons', name: 'playlist-add', size: 20 }}
            onActionPress={
              escalaData[0].origem === EscalaOrigemEnum.Manual &&
              (!viewMode || viewMode === 'edit') &&
              !isBlockingScreen
                ? () => setIsAdicionarItemManualOpen(true)
                : undefined
            }
          />
        )}

        {!isGerando && eventosData.length > 0 && (
          <EscalaHorizontalPager
            eventosData={eventosData}
            viewMode={viewMode}
            ministerioId={ministerioId}
            escalaId={escalaId}
            canEditSetlistOwner={canEditSetlistOwner}
            isUpdatingSetlistOwner={isSavingResponsavelSetlist}
            onUpdateResponsavelSetlist={handleUpdateResponsavelSetlist}
            onChangeVoluntario={handleSubstituirVoluntario}
            onAddVoluntario={handleAdicionarVoluntario}
            onRemoveVoluntario={handleRemoverVoluntario}
            onDeleteEvento={handleDeleteEvento}
            onAdicionarFuncao={handleAdicionarFuncao}
            onExcluirFuncao={handleExcluirFuncao}
            onExcluirFuncaoAvulsa={handleExcluirFuncaoAvulsa}
            onAdicionarEvento={
              escalaData[0].origem === EscalaOrigemEnum.Manual &&
              (!viewMode || viewMode === 'edit') &&
              !isBlockingScreen
                ? () => setIsAdicionarItemManualOpen(true)
                : undefined
            }
          />
        )}
      </FancyPageView>

      {isBlockingScreen && (
        <View
          style={[
            styles.blockingOverlay,
            { backgroundColor: ColorUtils.withAlpha(palette.fonts.dark, 0.12) },
          ]}
          pointerEvents='auto'
        >
          <View
            style={[
              styles.blockingOverlayContent,
              { backgroundColor: ColorUtils.withAlpha(palette.backgroundColor, 0.96) },
            ]}
          >
            <FancyLoading label={blockingLabel} containerStyle={{ flex: 0 }} />
          </View>
        </View>
      )}

      <EscalaParametrizacaoModal
        visible={isParametrizacaoOpen}
        escalaId={escalaId}
        onClose={() => setIsParametrizacaoOpen(false)}
      />

      {escalaData?.[0] && (
        <AdicionarItemManualModal
          visible={isAdicionarItemManualOpen}
          onClose={() => setIsAdicionarItemManualOpen(false)}
          ministerioId={ministerioId}
          dataInicio={DateUtilsApi.dateOnlyFromApi(escalaData[0].dataInicio)}
          dataTermino={DateUtilsApi.dateOnlyFromApi(escalaData[0].dataTermino)}
          itensAtuais={escalaData[0].itens}
          onConfirm={handleAdicionarItemManual}
        />
      )}

      <ResolverConflitosModal
        visible={isConflitosModalOpen}
        conflitos={conflitos}
        ministerioId={ministerioId}
        onResolverConflitoSimples={handleResolverConflitoSimples}
        onClose={() => {
          setIsConflitosModalOpen(false);
          setConflitos(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    position: 'relative',
  },
  container: { flex: 1 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  blockingOverlayContent: {
    minWidth: 180,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 12,
  },
});
