import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import Toast from 'react-native-toast-message';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import FancyBottomSheetModal from '../../modal/FancyBottomSheetModal';
import FancyVerticalSpacer from '../../FancyVerticalSpacer';
import FancyButton from '../../buttons/FancyButton';
import FancyBottomSheetSelect from '../../fields/FancyBottomSheetSelect';
import DefaultIcons from '../../FancyIcons';
import FancyListEmpty from '../../list/FancyListEmpty';
import FancyLoading from '../../FancyLoading';
import FancyText from '../../FancyText';
import FancyTextInput from '../../fields/FancyTextInput';
import EventoSetlistEditorSheet from './EventoSetlistEditorSheet';
import FancyActionSheet from '../../actions/FancyActionSheet';
import { FancyAlert } from '../../modal/FancyAlert';
import { ModalStack } from '../../modal/GlobalModalHost';
import SetListItem from './SetListItem';
import FancyChips from '../../FancyChips';
import FancyImage from '../../images/FancyImage';
import { getApiErrorMessage } from '../../../domain/api/api-error';
import {
  EventoSetlistItemOrigemEnum,
  ResponseEventoSetlistItemDto,
} from '../../../domain/dtos/Evento/evento-setlist-item.response';
import { EscalaItemStatusEnumLabel } from '../../../domain/enums/Escala/escala-item-status.enum';
import { useAuth } from '../../../contexts/AuthContext';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { useEventoSetlist } from '../../../hooks/useEventoSetlist';
import { useEventoEquipe } from '../../../hooks/useEventoEquipe';
import { useEventoSetlistObservacoes } from '../../../hooks/useEventoSetlistObservacoes';
import { useEventoSetlistResponsavel } from '../../../hooks/useEventoSetlistResponsavel';
import { useRepertorioMusicas } from '../../../hooks/useRepertorio';
import { ColorUtils } from '../../../utils/color_utils';
import { SETLIST_CLEAR_ENABLED } from '../../../utils/featureFlags';
import DateUtils from '../../../utils/date_utils';
import { DefaultIconsNames } from '../../../constants/icons';
import { EXTRA_SMALL_SIZE_FONT } from '../../../constants/font';

const BUSY_MODAL_ID = 'evento-setlist-busy';

type Props = {
  eventoId: string;
  dataOcorrencia: Date;
  ministerioId?: string;
  mode?: 'lider' | 'responsavel' | 'leitura';
  responsavelSetlistNome?: string | null;
  detailsRoutePath?: '/ministerios/agenda/setlist/[itemId]' | '/pessoal/escalas/setlist/[itemId]';
};

export default function EventoSetlistTab({
  eventoId,
  dataOcorrencia,
  ministerioId,
  mode = 'leitura',
  responsavelSetlistNome,
  detailsRoutePath = '/ministerios/agenda/setlist/[itemId]',
}: Props) {
  const { palette } = useAppTheme();
  const { user } = useAuth();
  const dataOcorrenciaIso = dataOcorrencia.toISOString();
  const isEditable = mode !== 'leitura';
  const canManageResponsavel = mode === 'lider';
  const canAddMusic = mode === 'lider' || mode === 'responsavel';
  const [orientacoesExpanded, setOrientacoesExpanded] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const {
    data,
    isLoading,
    publicado,
    publicadoEm,
    criarSetlistItem,
    atualizarSetlistItem,
    removerSetlistItem,
    reordenarSetlist,
    limparSetlist,
    publicarSetlist,
    isReorderingSetlist,
    isClearingSetlist,
    isPublishingSetlist,
    isFetching: isFetchingSetlist,
  } = useEventoSetlist(eventoId, dataOcorrenciaIso, ministerioId);
  const { data: repertorioData = [] } = useRepertorioMusicas(ministerioId);
  const {
    data: observacoesData,
    salvarObservacoes,
    isSavingObservacoes,
  } = useEventoSetlistObservacoes(eventoId, dataOcorrenciaIso, ministerioId);
  const { data: equipeData, refetch: refetchEquipe } = useEventoEquipe(
    eventoId,
    dataOcorrenciaIso,
    ministerioId,
  );
  const { salvarResponsavelSetlist, isSavingResponsavelSetlist } = useEventoSetlistResponsavel();

  const [editorVisible, setEditorVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResponseEventoSetlistItemDto | null>(null);
  const [observacoesVisible, setObservacoesVisible] = useState(false);
  const [observacoesDraft, setObservacoesDraft] = useState('');
  const [observacoesTouched, setObservacoesTouched] = useState(false);
  const [responsavelVisible, setResponsavelVisible] = useState(false);
  const [letraCifraItem, setLetraCifraItem] = useState<ResponseEventoSetlistItemDto | null>(null);
  const [letraCifraTab, setLetraCifraTab] = useState<'letra' | 'cifra'>('letra');
  const [responsavelSelecionadoId, setResponsavelSelecionadoId] = useState('');
  const [isSalvandoResponsavel, setIsSalvandoResponsavel] = useState(false);
  const [orderedItems, setOrderedItems] = useState<ResponseEventoSetlistItemDto[]>([]);
  const [actionsItem, setActionsItem] = useState<ResponseEventoSetlistItemDto | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});

  const repertorio = useMemo(
    () => (repertorioData ?? []).filter((item) => item.ativo !== false),
    [repertorioData],
  );

  const items = useMemo(() => (data ?? []).slice().sort((a, b) => a.ordem - b.ordem), [data]);

  const statusCaption =
    publicado && publicadoEm ? DateUtils.timeAgoText(new Date(publicadoEm)) : null;

  useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Troca de ocorrência/evento não remonta este componente (sem `key` no pai) — sem isso,
  // reorderMode/orderedItems de uma ocorrência sobrevivem pra próxima e um "Salvar" nessa
  // janela envia ids de itens que não existem na ocorrência nova.
  useEffect(() => {
    setReorderMode(false);
  }, [eventoId, ministerioId, dataOcorrenciaIso]);

  const isBusy = isReorderingSetlist || isClearingSetlist || !!deletingItemId;

  useEffect(() => {
    if (!isBusy) {
      ModalStack.pop(BUSY_MODAL_ID);
      return;
    }

    ModalStack.push(
      BUSY_MODAL_ID,
      <View
        style={[styles.blockingOverlay, { backgroundColor: palette.overlays.backdrop }]}
        pointerEvents='auto'
      >
        <View
          style={[
            styles.blockingOverlayContent,
            {
              backgroundColor: palette.backgroundColor4,
              borderColor: palette.borderCard,
              ...palette.shadows[200],
            },
          ]}
        >
          <FancyLoading
            label={
              deletingItemId
                ? 'Removendo música...'
                : isClearingSetlist
                  ? 'Limpando setlist...'
                  : 'Atualizando setlist...'
            }
            containerStyle={{ flex: 0, backgroundColor: 'transparent', paddingHorizontal: 0 }}
          />
        </View>
      </View>,
    );

    return () => ModalStack.pop(BUSY_MODAL_ID);
  }, [isBusy, deletingItemId, isClearingSetlist, palette]);

  const integrantesEquipeOptions = useMemo(() => {
    const seen = new Set<string>();
    return (
      equipeData?.grupos.flatMap((grupo) =>
        grupo.integrantes
          .filter((integrante) => integrante.voluntario?.id)
          .map((integrante) => integrante.voluntario!)
          .filter((voluntario) => {
            if (seen.has(voluntario.id)) return false;
            seen.add(voluntario.id);
            return true;
          })
          .map((voluntario) => ({
            title: voluntario.nome,
            value: voluntario.id,
            left:
              voluntario.fotoThumbUrl || voluntario.fotoUrl
                ? {
                    type: 'image' as const,
                    source: voluntario.fotoThumbUrl || voluntario.fotoUrl || '',
                  }
                : {
                    type: 'icon' as const,
                    icon: {
                      library: 'MaterialCommunityIcons' as const,
                      name: 'account-circle-outline',
                      size: 20,
                      color: palette.fonts.inactive,
                    },
                  },
          })),
      ) ?? []
    );
  }, [equipeData?.grupos, palette.fonts.inactive]);

  const responsavelAtualId =
    equipeData?.responsavelSetlistVoluntario?.id ||
    equipeData?.responsavelSetlistVoluntarioId ||
    '';
  const responsavelAtualNome =
    equipeData?.responsavelSetlistVoluntario?.nome || responsavelSetlistNome || null;
  const responsavelAtualFoto =
    equipeData?.responsavelSetlistVoluntario?.fotoThumbUrl ||
    equipeData?.responsavelSetlistVoluntario?.fotoUrl ||
    null;
  const isCurrentUserResponsavel = !!responsavelAtualId && responsavelAtualId === user?.user?.id;
  const responsavelStatusRaw = useMemo(() => {
    if (!responsavelAtualId) return null;
    return (
      equipeData?.grupos
        .flatMap((grupo) => grupo.integrantes)
        .find((integrante) => integrante.voluntarioId === responsavelAtualId)?.status || null
    );
  }, [equipeData?.grupos, responsavelAtualId]);
  const responsavelStatusVisible =
    responsavelStatusRaw === '1' || responsavelStatusRaw === '2' || responsavelStatusRaw === '3';
  const responsavelStatusLabel = responsavelStatusVisible
    ? EscalaItemStatusEnumLabel[responsavelStatusRaw as keyof typeof EscalaItemStatusEnumLabel]
    : null;
  const responsavelStatusColor = responsavelStatusRaw === '1' ? palette.confirm : palette.error;
  // Sem responsável definido: líder só pode incluir um responsável; nova música e
  // orientações ficam desabilitados até existir responsável.
  const hasResponsavel = !!responsavelAtualNome;
  const canEditOrientacoes = isEditable && hasResponsavel;
  const canAddMusicNow = canAddMusic && hasResponsavel;
  const responsavelDescricao = responsavelAtualNome
    ? isCurrentUserResponsavel
      ? 'Você define a seleção musical desta ocorrência.'
      : `${responsavelAtualNome} define a seleção musical desta ocorrência.`
    : canManageResponsavel
      ? 'Defina quem escolhe as músicas desta ocorrência.'
      : 'O líder ainda não definiu quem escolhe as músicas desta ocorrência.';

  const openItemEditor = (item?: ResponseEventoSetlistItemDto | null) => {
    setSelectedItem(item ?? null);
    setEditorVisible(true);
  };

  const openObservacoes = () => {
    setObservacoesDraft(observacoesData?.observacoes || '');
    setObservacoesTouched(false);
    setObservacoesVisible(true);
  };

  const openResponsavel = () => {
    setResponsavelSelecionadoId(responsavelAtualId);
    setResponsavelVisible(true);
  };

  const openItemDetails = (item: ResponseEventoSetlistItemDto) => {
    if (isEditable) {
      openItemEditor(item);
      return;
    }

    if (!ministerioId) return;

    router.push({
      pathname: detailsRoutePath,
      params: {
        itemId: item.id,
        eventoId,
        ministerioId,
        dataOcorrencia: dataOcorrenciaIso,
        modo: mode,
      },
    });
  };

  const observacoesDraftVazia = !observacoesDraft.trim();

  const handleSalvarObservacoes = async () => {
    if (!ministerioId) return;

    try {
      await salvarObservacoes({
        ministerioId,
        dataOcorrencia: dataOcorrenciaIso,
        observacoes: observacoesDraft.trim(),
      });
      setObservacoesVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Observações atualizadas',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao salvar observações',
        text2: getApiErrorMessage(error, 'Não foi possível salvar as observações do setlist.'),
      });
    }
  };

  const handleSalvarResponsavel = async (limparSetlistApos = false) => {
    if (!ministerioId || !responsavelSelecionadoId) return;

    setIsSalvandoResponsavel(true);
    try {
      await salvarResponsavelSetlist({
        eventoId,
        data: {
          ministerioId,
          dataOcorrencia: dataOcorrenciaIso,
          responsavelVoluntarioId: responsavelSelecionadoId,
          escopo: 'OCORRENCIA' as any,
        },
      });
      let limpezaFalhou = false;
      if (limparSetlistApos) {
        try {
          await limparSetlist();
        } catch (limpezaError) {
          limpezaFalhou = true;
          Toast.show({
            type: 'error',
            text1: 'Responsável salvo, mas o setlist não foi limpo',
            text2: getApiErrorMessage(limpezaError, 'Não foi possível limpar o setlist.'),
          });
        }
      }
      await refetchEquipe();
      setResponsavelVisible(false);
      if (!limpezaFalhou) {
        Toast.show({
          type: 'success',
          text1: 'Responsável do SetList atualizado',
          text2: limparSetlistApos ? 'Setlist limpo.' : undefined,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao salvar responsável',
        text2: getApiErrorMessage(error, 'Não foi possível atualizar o responsável do SetList.'),
      });
    } finally {
      setIsSalvandoResponsavel(false);
    }
  };

  // Troca de responsável com setlist já montado: perguntar se limpa tudo junto.
  const requestSalvarResponsavel = () => {
    const trocandoResponsavel =
      !!responsavelAtualId && responsavelSelecionadoId !== responsavelAtualId;
    if (SETLIST_CLEAR_ENABLED && trocandoResponsavel && items.length > 0) {
      FancyAlert.alert(
        'Trocar responsável',
        'Deseja limpar o setlist inteiro ao trocar o responsável?',
        [
          {
            text: 'Trocar e limpar',
            style: 'destructive',
            onPress: () => void handleSalvarResponsavel(true),
          },
          {
            text: 'Só trocar',
            style: 'default',
            onPress: () => void handleSalvarResponsavel(false),
          },
          { text: 'Cancelar', style: 'cancel' },
        ],
      );
      return;
    }
    void handleSalvarResponsavel(false);
  };

  const handleLimparSetlist = async () => {
    try {
      await limparSetlist();
      Toast.show({
        type: 'success',
        text1: 'Setlist limpo',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao limpar setlist',
        text2: getApiErrorMessage(error, 'Não foi possível limpar o setlist.'),
      });
    }
  };

  const confirmLimparSetlist = () => {
    FancyAlert.alert(
      'Limpar setlist inteiro?',
      'Todas as músicas serão removidas. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => void handleLimparSetlist(),
        },
      ],
    );
  };

  const handlePublicarSetlist = async () => {
    try {
      await publicarSetlist();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao publicar setlist',
        text2: getApiErrorMessage(error, 'Não foi possível publicar o setlist.'),
      });
    }
  };

  const confirmPublicarSetlist = () => {
    FancyAlert.alert(
      'Publicar setlist?',
      'Todos os voluntários da equipe vão poder ver o setlist e as orientações gerais.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Publicar',
          onPress: () => void handlePublicarSetlist(),
        },
      ],
    );
  };

  const persistReorder = async (nextItems: ResponseEventoSetlistItemDto[]) => {
    if (!ministerioId) return;

    const itemIds = nextItems.map((item) => item.id);
    // eslint-disable-next-line no-console
    console.log('[DEBUG-reorder]', { dataOcorrenciaIso, itemIds });

    try {
      await reordenarSetlist({
        ministerioId,
        dataOcorrencia: dataOcorrenciaIso,
        itemIds,
      });
    } catch (error) {
      setOrderedItems(items);
      const baseMessage = getApiErrorMessage(
        error,
        'Não foi possível salvar a nova ordem do setlist.',
      );
      // TODO(debug reorder): remover depois de confirmar a causa raiz do erro em produção.
      const debugSuffix = ` [DEBUG occ=${dataOcorrenciaIso} enviados=${itemIds.length} ids=${itemIds.join(',')}]`;
      Toast.show({
        type: 'error',
        text1: 'Erro ao reordenar setlist',
        text2: baseMessage + debugSuffix,
        visibilityTime: 12000,
      });
    }
  };

  const handleDragEnd = (nextItems: ResponseEventoSetlistItemDto[]) => {
    // Handoff entre a posição animada da lib e o novo `data` causa flicker de 1 frame
    // se o state for atualizado sincronamente. https://github.com/computerjazz/react-native-draggable-flatlist/issues/123
    requestAnimationFrame(() => setOrderedItems(nextItems));
  };

  const confirmReorder = async () => {
    if (isFetchingSetlist) return;
    await persistReorder(orderedItems);
    setReorderMode(false);
  };

  const cancelReorder = () => {
    setOrderedItems(items);
    setReorderMode(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeletingItemId(itemId);
    try {
      await removerSetlistItem(itemId);
      Toast.show({
        type: 'success',
        text1: 'Música removida do setlist',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Erro ao remover música',
        text2: getApiErrorMessage(error, 'Não foi possível remover esta música do setlist.'),
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  const openItemActions = (item: ResponseEventoSetlistItemDto) => {
    setActionsItem(item);
  };

  const closeItemActions = () => {
    setActionsItem(null);
  };

  const selectedItemIndex = useMemo(() => {
    if (!actionsItem) return -1;
    return orderedItems.findIndex((entry) => entry.id === actionsItem.id);
  }, [actionsItem, orderedItems]);

  const moveItemBySheet = async (direction: 'up' | 'down') => {
    if (!actionsItem || isFetchingSetlist) return;

    const currentIndex = orderedItems.findIndex((entry) => entry.id === actionsItem.id);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;

    const nextItems = [...orderedItems];
    const [movedItem] = nextItems.splice(currentIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);

    closeItemActions();
    setOrderedItems(nextItems);
    await persistReorder(nextItems);
  };

  const confirmDeleteItem = (item: ResponseEventoSetlistItemDto) => {
    FancyAlert.alert('Excluir música?', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          closeItemActions();
          void handleDeleteItem(item.id);
        },
      },
    ]);
  };

  const showObservacoesRow = !!(observacoesData?.observacoes || canEditOrientacoes);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View
        style={{
          backgroundColor: palette.backgroundColor4,
          borderColor: palette.borderCard,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 20,
          paddingHorizontal: 12,
        }}
      >
        <View style={[styles.infoRow, { paddingVertical: 10 }]}>
          {responsavelAtualNome && responsavelAtualFoto ? (
            <FancyImage
              source={{ uri: responsavelAtualFoto }}
              size={styles.infoAvatarCircle.width}
            />
          ) : (
            <View
              style={[
                styles.infoAvatarCircle,
                {
                  backgroundColor: ColorUtils.withAlpha(palette.primary, 0.1),
                },
              ]}
              accessibilityLabel='Responsável do SetList'
            >
              <MaterialCommunityIcons
                name={responsavelAtualNome ? 'account-music-outline' : 'account-question-outline'}
                size={17}
                color={responsavelAtualNome ? palette.primary : palette.icons.inactive}
              />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <FancyText
              size='extraSmall'
              type='semiBold'
              color={palette.fonts.dark}
              numberOfLines={1}
              style={{ opacity: 0.8 }}
            >
              Responsável
            </FancyText>
            <FancyText
              size='small'
              type='semiBold'
              numberOfLines={1}
              color={responsavelAtualNome ? palette.fonts.dark : palette.fonts.inactive}
            >
              {isCurrentUserResponsavel
                ? 'Você'
                : responsavelAtualNome || 'Sem responsável definido'}
            </FancyText>
          </View>
          {responsavelStatusLabel ? (
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: ColorUtils.withAlpha(responsavelStatusColor, 0.1),
                  borderColor: ColorUtils.withAlpha(responsavelStatusColor, 0.28),
                },
              ]}
            >
              <FancyText size='extraSmall' type='bold' color={responsavelStatusColor}>
                {responsavelStatusLabel}
              </FancyText>
            </View>
          ) : null}
          {canManageResponsavel ? (
            <Pressable
              onPress={openResponsavel}
              accessibilityRole='button'
              accessibilityLabel='Definir responsável do SetList'
              hitSlop={8}
              style={[
                styles.infoTrailingCircle,
                { backgroundColor: ColorUtils.withAlpha(palette.primary, 0.1) },
              ]}
            >
              <MaterialCommunityIcons
                name={responsavelAtualNome ? 'swap-horizontal' : 'account-plus-outline'}
                size={17}
                color={palette.primary}
              />
            </Pressable>
          ) : null}
        </View>

        {showObservacoesRow && (
          <>
            <View style={[styles.infoRowDivider, { backgroundColor: palette.border }]} />
            <View style={[styles.infoRow, { paddingVertical: 10, alignItems: 'flex-start' }]}>
              <Pressable
                style={styles.infoTextCol}
                onPress={() => setOrientacoesExpanded((prev) => !prev)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons
                    name='information-outline'
                    size={13}
                    color={palette.fonts.inactive}
                  />
                  <FancyText
                    size='extraSmall'
                    type='semiBold'
                    color={palette.fonts.inactive}
                    style={styles.infoLabel}
                  >
                    Orientações gerais
                  </FancyText>
                </View>
                <FancyText
                  size='small'
                  type='medium'
                  numberOfLines={orientacoesExpanded ? undefined : 3}
                  color={
                    observacoesData?.observacoes?.trim()
                      ? palette.fonts.dark
                      : palette.fonts.inactive
                  }
                  style={styles.infoValue}
                >
                  {observacoesData?.observacoes?.trim() || 'Nenhuma orientação'}
                </FancyText>
                {(observacoesData?.observacoes?.trim()?.length ?? 0) > 110 ? (
                  <FancyText size='extraSmall' type='semiBold' color={palette.fonts.link}>
                    {orientacoesExpanded ? 'ver menos' : 'ver mais'}
                  </FancyText>
                ) : null}
              </Pressable>
              {canEditOrientacoes ? (
                <Pressable
                  onPress={openObservacoes}
                  accessibilityRole='button'
                  accessibilityLabel='Editar orientações gerais'
                  hitSlop={8}
                  style={[
                    styles.infoTrailingCircle,
                    { backgroundColor: ColorUtils.withAlpha(palette.primary, 0.1) },
                  ]}
                >
                  <MaterialCommunityIcons name='pencil-outline' size={17} color={palette.primary} />
                </Pressable>
              ) : null}
            </View>
          </>
        )}

        {isEditable && (
          <>
            <View style={[styles.infoRowDivider, { backgroundColor: palette.border }]} />
            <View style={[styles.infoRow, { paddingVertical: 10 }]}>
              <View style={[styles.infoTrailingCircle, { backgroundColor: palette.warning }]}>
                <DefaultIcons.Custom
                  library='MaterialCommunityIcons'
                  name={publicado ? 'check-decagram-outline' : 'timer-sand'}
                  size={16}
                  color={palette.fonts.light}
                />
              </View>
              <View style={styles.infoTextCol}>
                <FancyText
                  size='extraSmall'
                  type='semiBold'
                  color={palette.warning}
                  style={styles.infoLabel}
                >
                  Status
                </FancyText>
                <FancyText
                  size='small'
                  type='medium'
                  color={palette.fonts.dark}
                  style={styles.infoValue}
                >
                  {publicado ? 'Publicado' : 'Rascunho'}
                </FancyText>
                {statusCaption ? (
                  <FancyText
                    size='extraSmall'
                    type='medium'
                    color={palette.fonts.inactive}
                    numberOfLines={1}
                  >
                    {statusCaption}
                  </FancyText>
                ) : null}
              </View>
              {!publicado && canAddMusic ? (
                <Pressable
                  onPress={confirmPublicarSetlist}
                  disabled={isPublishingSetlist}
                  accessibilityRole='button'
                  accessibilityLabel='Publicar setlist'
                  hitSlop={8}
                  style={[
                    styles.publishPill,
                    { backgroundColor: palette.warning, opacity: isPublishingSetlist ? 0.6 : 1 },
                  ]}
                >
                  {isPublishingSetlist ? (
                    <ActivityIndicator size='small' color={palette.fonts.light} />
                  ) : (
                    <FancyText size='extraSmall' type='semiBold' color={palette.fonts.light}>
                      Publicar
                    </FancyText>
                  )}
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderListActions = () =>
    canAddMusicNow ? (
      <>
        <View style={styles.listHeader}>
          {reorderMode ? (
            <FancyText size='small' type='semiBold' color={palette.primary}>
              Modo ordenação
            </FancyText>
          ) : (
            <FancyButton
              label='Nova música'
              type='contained'
              size={34}
              icon={{
                library: 'MaterialCommunityIcons',
                name: 'music-note-plus',
                size: 15,
                color: palette.fonts.light,
              }}
              containerStyle={styles.addMusicButton}
              onPress={() => openItemEditor(null)}
            />
          )}
          <View style={styles.listHeaderSpacer} />
          <Pressable
            onPress={() => setReorderMode(true)}
            disabled={reorderMode || orderedItems.length <= 1}
            accessibilityRole='button'
            accessibilityLabel='Reordenar músicas'
            hitSlop={8}
            style={[
              styles.iconOnlyButton,
              {
                backgroundColor: ColorUtils.withAlpha(palette.primary, 0.08),
                borderColor: ColorUtils.withAlpha(palette.primary, 0.24),
                opacity: reorderMode || orderedItems.length <= 1 ? 0.4 : 1,
              },
            ]}
          >
            <MaterialCommunityIcons name='swap-vertical' size={16} color={palette.primary} />
          </Pressable>
          {SETLIST_CLEAR_ENABLED && (
            <Pressable
              onPress={confirmLimparSetlist}
              disabled={reorderMode || orderedItems.length === 0}
              accessibilityRole='button'
              accessibilityLabel='Limpar setlist inteiro'
              hitSlop={8}
              style={[
                styles.iconOnlyButton,
                {
                  backgroundColor: ColorUtils.withAlpha(palette.error, 0.1),
                  borderColor: ColorUtils.withAlpha(palette.error, 0.24),
                  opacity: reorderMode || orderedItems.length === 0 ? 0.4 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons name='trash-can-outline' size={16} color={palette.error} />
            </Pressable>
          )}
        </View>
        <View style={[styles.listHeaderDivider, { backgroundColor: palette.borderCard }]} />
      </>
    ) : null;

  const renderItem = ({
    item,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<ResponseEventoSetlistItemDto>) => {
    const rawIndex = getIndex?.() ?? 0;
    const index = rawIndex + 1;
    const nextItem = orderedItems[rawIndex + 1];
    return (
      <SetListItem
        order={index}
        total={orderedItems.length}
        name={item.nome}
        artist={item.interprete}
        totalSecoes={item.totalSecoes}
        tom={item.tom}
        bpm={item.bpm}
        versaoUrl={item.versaoUrl}
        observacoes={item.observacoes}
        letraMarkdown={item.letraMarkdown}
        cifraMarkdown={item.cifraMarkdown}
        onPress={() => openItemDetails(item)}
        onActionsPress={isEditable ? () => openItemActions(item) : undefined}
        onLongPress={isEditable && reorderMode ? drag : undefined}
        onLetraCifraPress={() => {
          setLetraCifraTab(item.letraMarkdown?.trim() ? 'letra' : 'cifra');
          setLetraCifraItem(item);
        }}
        isEditable={isEditable}
        isActive={isActive}
        isLast={rawIndex === orderedItems.length - 1}
        reorderMode={reorderMode}
        cardHeight={itemHeights[item.id]}
        nextCardHeight={nextItem ? itemHeights[nextItem.id] : undefined}
        onMeasureHeight={(height) =>
          setItemHeights((prev) =>
            prev[item.id] === height ? prev : { ...prev, [item.id]: height },
          )
        }
      />
    );
  };

  if (isLoading) return <FancyLoading />;

  return (
    <>
      <View style={styles.container}>
        {renderHeader()}
        <FancyVerticalSpacer height={16} />
        <View
          style={[
            styles.railContainer,
            { borderColor: palette.borderCard, backgroundColor: palette.backgroundColor4 },
          ]}
        >
          {renderListActions()}
          <DraggableFlatList
            key={orderedItems.map((item) => item.id).join('|')}
            data={orderedItems}
            onDragEnd={({ data: nextItems }) => handleDragEnd(nextItems)}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            activationDistance={reorderMode ? 0 : 16}
            dragItemOverflow={false}
            containerStyle={styles.list}
            contentContainerStyle={[
              styles.listContent,
              orderedItems.length === 0 && styles.listContentEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              orderedItems.length > 0 ? (
                <View style={styles.listSectionHeader}>
                  <FancyText size='extraSmall' type='semiBold' color={palette.fonts.inactive}>
                    Repertório · {orderedItems.length}{' '}
                    {orderedItems.length === 1 ? 'música' : 'músicas'}
                  </FancyText>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <FancyListEmpty
                  label='Nenhuma música adicionada'
                  helperText={
                    canAddMusicNow
                      ? 'Adicione as músicas desta ocorrência para definir a sequência e acompanhar a duração total.'
                      : 'Quando o responsável montar o SetList, as músicas aparecerão aqui para consulta.'
                  }
                  helperTextStyle={{ lineHeight: 16 }}
                  icon={{
                    library: 'MaterialCommunityIcons',
                    name: 'playlist-music-outline',
                    size: 56,
                  }}
                  muted={false}
                />
              </View>
            }
          />
          {reorderMode && (
            <View style={styles.reorderFooter}>
              <FancyButton
                label='Cancelar'
                type='contained'
                icon={{ library: 'MaterialCommunityIcons', name: 'close', size: 16 }}
                containerStyle={[styles.reorderFooterBtn, { backgroundColor: palette.error }]}
                onPress={cancelReorder}
                disabled={isReorderingSetlist}
              />
              <FancyButton
                label='Confirmar'
                type='contained'
                icon={{ library: 'MaterialCommunityIcons', name: 'check', size: 16 }}
                containerStyle={styles.reorderFooterBtn}
                isLoading={isReorderingSetlist}
                onPress={() => void confirmReorder()}
              />
            </View>
          )}
        </View>
      </View>

      <EventoSetlistEditorSheet
        visible={editorVisible}
        item={selectedItem}
        repertorio={repertorio}
        nomesSetlist={items}
        canEdit={isEditable}
        eventoId={eventoId}
        dataOcorrenciaIso={dataOcorrenciaIso}
        ministerioId={ministerioId}
        onClose={() => setEditorVisible(false)}
        onSave={async (payload) => {
          const dto = {
            ministerioId: ministerioId || '',
            dataOcorrencia: dataOcorrenciaIso,
            tipoOrigem: payload.tipoOrigem,
            repertorioMusicaId: payload.repertorioMusicaId,
            nome: payload.nome,
            interprete: payload.interprete,
            versaoUrl: payload.versaoUrl,
            tom: payload.tom,
            bpm: payload.bpm,
            letraMarkdown: payload.letraMarkdown,
            cifraMarkdown: payload.cifraMarkdown,
            observacoes: payload.observacoes,
          };

          try {
            if (payload.itemId) {
              await atualizarSetlistItem({ itemId: payload.itemId, dto });
            } else {
              await criarSetlistItem(dto);
            }
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: 'Erro ao salvar música do setlist',
              text2: getApiErrorMessage(error, 'Não foi possível salvar a música.'),
            });
          }
        }}
      />

      <FancyBottomSheetModal
        visible={observacoesVisible}
        onClose={() => {
          if (!isSavingObservacoes) setObservacoesVisible(false);
        }}
        title='Orientações'
        closeDisabled={isSavingObservacoes}
        footer={
          <FancyButton
            label='Salvar'
            icon={{ ...DefaultIconsNames.save, size: 16 }}
            isLoading={isSavingObservacoes}
            loadingText='Salvando...'
            disabled={isSavingObservacoes}
            onPress={() => void handleSalvarObservacoes()}
          />
        }
      >
        <View style={styles.sheetContentWrapper}>
          <View style={styles.sheetContent}>
            <FancyText size='small' color={palette.fonts.inactive}>
              Use este espaço para orientações gerais da equipe, dinâmica do culto ou observações da
              ocorrência.
            </FancyText>
            <FancyTextInput
              label='Observações'
              value={observacoesDraft}
              readonly={isSavingObservacoes}
              disabled={isSavingObservacoes}
              errorMessage={
                observacoesTouched && observacoesDraftVazia
                  ? 'Orientações não podem ficar em branco'
                  : undefined
              }
              inputProps={{
                onChangeText: isSavingObservacoes
                  ? undefined
                  : (text: string) => {
                      setObservacoesTouched(true);
                      setObservacoesDraft(text);
                    },
                multiline: true,
                style: { minHeight: 140, textAlignVertical: 'top' },
                editable: !isSavingObservacoes,
              }}
            />
          </View>
          {isSavingObservacoes ? (
            <Pressable
              accessibilityLabel='Salvamento em andamento'
              style={styles.sheetBlockingOverlay}
              onPress={() => undefined}
            />
          ) : null}
        </View>
      </FancyBottomSheetModal>

      <FancyBottomSheetModal
        visible={responsavelVisible}
        onClose={() => {
          if (!isSalvandoResponsavel) setResponsavelVisible(false);
        }}
        title='Responsável do SetList'
        closeDisabled={isSalvandoResponsavel}
        footer={
          <FancyButton
            label='Salvar'
            icon={{ ...DefaultIconsNames.save, size: 16 }}
            isLoading={isSalvandoResponsavel}
            loadingText='Salvando...'
            disabled={!responsavelSelecionadoId || isSalvandoResponsavel}
            onPress={requestSalvarResponsavel}
          />
        }
      >
        <View style={styles.sheetContentWrapper}>
          <View style={styles.sheetContent}>
            <FancyText size='small' color={palette.fonts.inactive}>
              Escolha quem conduz o SetList desta ocorrência.
            </FancyText>
            <FancyBottomSheetSelect
              label='Voluntário'
              title='Selecionar responsável'
              value={responsavelSelecionadoId}
              onChange={(value) => setResponsavelSelecionadoId(String(value || ''))}
              listItems={integrantesEquipeOptions}
              disabled={isSalvandoResponsavel}
            />
          </View>
          {isSalvandoResponsavel ? (
            <Pressable
              accessibilityLabel='Salvamento em andamento'
              style={styles.sheetBlockingOverlay}
              onPress={() => undefined}
            />
          ) : null}
        </View>
      </FancyBottomSheetModal>

      <FancyBottomSheetModal
        visible={!!letraCifraItem}
        onClose={() => setLetraCifraItem(null)}
        title={letraCifraItem?.nome || 'Letra e cifra'}
      >
        <View style={styles.sheetContentWrapper}>
          <View style={styles.sheetContent}>
            <View style={styles.letraCifraToggle}>
              <Pressable
                onPress={() => setLetraCifraTab('letra')}
                style={[
                  styles.letraCifraToggleButton,
                  letraCifraTab === 'letra' && {
                    backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12),
                  },
                ]}
              >
                <FancyText
                  size='small'
                  type='semiBold'
                  color={letraCifraTab === 'letra' ? palette.primary : palette.fonts.inactive}
                >
                  Letra
                </FancyText>
              </Pressable>
              <Pressable
                onPress={() => setLetraCifraTab('cifra')}
                style={[
                  styles.letraCifraToggleButton,
                  letraCifraTab === 'cifra' && {
                    backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12),
                  },
                ]}
              >
                <FancyText
                  size='small'
                  type='semiBold'
                  color={letraCifraTab === 'cifra' ? palette.primary : palette.fonts.inactive}
                >
                  Cifra
                </FancyText>
              </Pressable>
            </View>
            <ScrollView style={styles.letraCifraScroll} nestedScrollEnabled>
              <FancyText
                size='small'
                color={palette.fonts.dark}
                style={letraCifraTab === 'cifra' ? styles.cifraMonoText : styles.letraText}
              >
                {(letraCifraTab === 'letra'
                  ? letraCifraItem?.letraMarkdown
                  : letraCifraItem?.cifraMarkdown
                )?.trim() || `Sem ${letraCifraTab === 'letra' ? 'letra' : 'cifra'} cadastrada.`}
              </FancyText>
            </ScrollView>
          </View>
        </View>
      </FancyBottomSheetModal>

      <FancyActionSheet
        visible={!!actionsItem}
        onClose={closeItemActions}
        title='Opções'
        actions={
          actionsItem
            ? [
                {
                  label: 'Editar',
                  icon: {
                    library: 'MaterialCommunityIcons' as const,
                    name: 'pencil-outline',
                    size: 18,
                  },
                  onPress: () => openItemEditor(actionsItem),
                },
                {
                  label: 'Mover para cima',
                  icon: { library: 'MaterialCommunityIcons' as const, name: 'arrow-up', size: 18 },
                  onPress: () => void moveItemBySheet('up'),
                  disabled: selectedItemIndex <= 0,
                },
                {
                  label: 'Mover para baixo',
                  icon: {
                    library: 'MaterialCommunityIcons' as const,
                    name: 'arrow-down',
                    size: 18,
                  },
                  onPress: () => void moveItemBySheet('down'),
                  disabled: selectedItemIndex < 0 || selectedItemIndex >= orderedItems.length - 1,
                },
                {
                  label: 'Excluir',
                  icon: {
                    library: 'MaterialCommunityIcons' as const,
                    name: 'trash-can-outline',
                    size: 18,
                  },
                  onPress: () => confirmDeleteItem(actionsItem),
                  destructive: true,
                },
              ]
            : []
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 18,
    gap: 6,
  },
  listContentEmpty: {
    paddingBottom: 10,
  },
  headerContainer: {
    paddingTop: 4,
    paddingBottom: 4,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  infoIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconPlain: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowDivider: {
    height: StyleSheet.hairlineWidth,
  },
  infoTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  infoLabel: {
    fontSize: EXTRA_SMALL_SIZE_FONT,
    lineHeight: Math.round(EXTRA_SMALL_SIZE_FONT * 1.3),
    letterSpacing: 0.16,
    includeFontPadding: false,
  },
  infoValue: {
    fontSize: EXTRA_SMALL_SIZE_FONT,
    lineHeight: Math.round(EXTRA_SMALL_SIZE_FONT * 1.3),
    includeFontPadding: false,
  },
  infoTrailingCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishPill: {
    alignSelf: 'center',
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    flexShrink: 1,
  },
  listSectionHeader: {
    marginBottom: -5,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  listHeaderDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -10,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    height: 22,
    borderRadius: 999,
    borderWidth: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeaderSpacer: {
    flex: 1,
  },
  iconOnlyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  reorderFooterBtn: {
    flex: 1,
  },
  railContainer: {
    flex: 1,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  addMusicButton: {
    minWidth: 0,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 50,
  },
  emptyState: {
    flexGrow: 1,
    minHeight: 188,
    justifyContent: 'flex-start',
    paddingTop: 18,
  },
  sheetContent: {
    gap: 14,
  },
  sheetContentWrapper: {
    position: 'relative',
  },
  sheetBlockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  letraCifraToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  letraCifraToggleButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  letraCifraScroll: {
    height: 420,
  },
  letraText: {
    lineHeight: 20,
  },
  cifraMonoText: {
    fontFamily: 'monospace',
    lineHeight: 22,
  },
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 50,
  },
  blockingOverlayContent: {
    minWidth: 190,
    maxWidth: 280,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
});
