import { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Share, ScrollView, RefreshControl, Clipboard } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';
import { useLocalSearchParams } from 'expo-router';

// Components
import FancyText from '../../../../../components/FancyText';
import FancyButton from '../../../../../components/buttons/FancyButton';
import FancyFab from '../../../../../components/buttons/FancyFab';
import DefaultIcons from '../../../../../components/FancyIcons';
import FancyLoading from '../../../../../components/FancyLoading';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import FancyTabs, { TabItem } from '../../../../../components/tabs/FancyTabs';
import { FancyAlert } from '../../../../../components/modal/FancyAlert';
import FancyListEmpty from '../../../../../components/list/FancyListEmpty';
import FancyModal from '../../../../../components/modal/FancyModal';

// New Components
import SummaryCards from '../../../../../components/pages/admin/solicitacoes/SummaryCards';
import SolicitacaoCard from '../../../../../components/pages/admin/solicitacoes/SolicitacaoCard';
import ConviteTicketCard from '../../../../../components/pages/admin/solicitacoes/ConviteTicketCard';
import NovoConviteModal from '../../../../../components/pages/admin/solicitacoes/NovoConviteModal';
import ConviteGeradoModal from '../../../../../components/pages/admin/solicitacoes/ConviteGeradoModal';

// Domain
import { usePallete } from '../../../../../hooks/usePallete';
import { useAuth } from '../../../../../contexts/AuthContext';
import { IgrejaRepository } from '../../../../../domain/services/IgrejaRepository';
import {
  ResponseIgrejaConviteDto,
  ConviteStatusType,
} from '../../../../../domain/dtos/Igreja/response-igreja-convite.dto';
import { ResponseIgrejaSolicitacaoDto } from '../../../../../domain/dtos/Igreja/response-igreja-solicitacao.dto';
import { CreateIgrejaConviteDto } from '../../../../../domain/dtos/Igreja/create-igreja-convite.dto';
import { IgrejaVoluntarioRoleEnum } from '../../../../../domain/enums/Igreja/voluntario-role.enum';
import { APP_TZ } from '../../../../../utils/date_utils';
import { useAnalytics } from '../../../../../core/analytics/AnalyticsContext';
import { AnalyticsEvent, buildConviteEnviadoProps } from '../../../../../core/analytics/events';

// Helper para determinar status do convite
function getConviteStatus(convite: ResponseIgrejaConviteDto): ConviteStatusType {
  if (convite.revokedAt || !convite.ativo) return 'REVOGADO';
  if (convite.maxUses && convite.usesCount >= convite.maxUses) return 'ESGOTADO';
  if (convite.expiresAt && new Date(convite.expiresAt) < new Date()) return 'EXPIRADO';
  return 'ATIVO';
}

// Helper para formatar data
function formatDateTime(dateStr: string): string {
  const utcDate = dateStr.endsWith('Z') ? dateStr : dateStr + 'Z';
  return formatInTimeZone(new Date(utcDate), APP_TZ, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

export default function SolicitacoesConvitesPage() {
  const palette = usePallete();
  const { igrejaAtiva } = useAuth();
  const queryClient = useQueryClient();
  const posthog = useAnalytics();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTabIndex = params.tab === 'convites' ? 1 : 0;

  // Estados
  const [tabIndex, setTabIndex] = useState(initialTabIndex);
  const [showNovoConviteModal, setShowNovoConviteModal] = useState(false);
  const [conviteGerado, setConviteGerado] = useState<ResponseIgrejaConviteDto | null>(null);

  useEffect(() => {
    setTabIndex(initialTabIndex);
  }, [initialTabIndex]);

  // Verificar permissões
  const roleUpper = igrejaAtiva?.role?.toString().toUpperCase();
  const isAdmin = roleUpper === IgrejaVoluntarioRoleEnum.ADMIN || roleUpper === 'OWNER';
  const isLider = roleUpper === IgrejaVoluntarioRoleEnum.LIDER;
  const hasPermission = isAdmin || isLider;

  // ========== QUERIES ==========

  // Query para solicitações
  const {
    data: solicitacoes = [],
    isLoading: isLoadingSolicitacoes,
    refetch: refetchSolicitacoes,
    isRefetching: isRefetchingSolicitacoes,
  } = useQuery({
    queryKey: ['igreja-solicitacoes', igrejaAtiva?.id],
    queryFn: () => IgrejaRepository.listarSolicitacoes(igrejaAtiva!.id),
    enabled: !!igrejaAtiva?.id && hasPermission,
    select: (data) => {
      const statusOrder: Record<ResponseIgrejaSolicitacaoDto['status'], number> = {
        PENDING: 0,
        APPROVED: 1,
        DENIED: 1,
        CANCELED: 2,
      };
      return [...data].sort((a, b) => {
        const groupA = statusOrder[a.status];
        const groupB = statusOrder[b.status];
        if (groupA !== groupB) return groupA - groupB;
        const dateA = a.status === 'PENDING' ? a.createdAt : a.respondedAt || a.createdAt;
        const dateB = b.status === 'PENDING' ? b.createdAt : b.respondedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    },
  });

  // Query para convites
  const {
    data: convites = [],
    isLoading: isLoadingConvites,
    refetch: refetchConvites,
    isRefetching: isRefetchingConvites,
  } = useQuery({
    queryKey: ['igreja-convites', igrejaAtiva?.id],
    queryFn: () => IgrejaRepository.listarConvites(igrejaAtiva!.id, 'TODOS'),
    enabled: !!igrejaAtiva?.id && hasPermission,
    select: (data) => {
      return data.sort((a, b) => {
        const statusA = getConviteStatus(a);
        const statusB = getConviteStatus(b);
        const isAtivoA = statusA === 'ATIVO';
        const isAtivoB = statusB === 'ATIVO';
        if (isAtivoA && !isAtivoB) return -1;
        if (!isAtivoA && isAtivoB) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    },
  });

  // ========== MUTATIONS ==========

  const aprovarMutation = useMutation({
    mutationFn: ({ solicitacaoId }: { solicitacaoId: string }) =>
      IgrejaRepository.aprovarSolicitacao(igrejaAtiva!.id, solicitacaoId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Solicitação aprovada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['igreja-solicitacoes', igrejaAtiva?.id] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Erro ao aprovar solicitação' });
    },
  });

  const rejeitarMutation = useMutation({
    mutationFn: ({ solicitacaoId }: { solicitacaoId: string }) =>
      IgrejaRepository.negarSolicitacao(igrejaAtiva!.id, solicitacaoId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Solicitação negada' });
      queryClient.invalidateQueries({ queryKey: ['igreja-solicitacoes', igrejaAtiva?.id] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Erro ao negar solicitação' });
    },
  });

  const criarConviteMutation = useMutation({
    mutationFn: (dto: CreateIgrejaConviteDto) =>
      IgrejaRepository.criarConvite(igrejaAtiva!.id, dto),
    onSuccess: (novoConvite) => {
      posthog.capture(
        AnalyticsEvent.ConviteEnviado,
        buildConviteEnviadoProps({
          igrejaId: igrejaAtiva!.id,
          conviteId: novoConvite.id,
          autoApprove: novoConvite.autoApprove,
        }),
      );
      setConviteGerado(novoConvite);
      setShowNovoConviteModal(false);
      queryClient.invalidateQueries({ queryKey: ['igreja-convites', igrejaAtiva?.id] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Erro ao gerar convite' });
    },
  });

  const revogarConviteMutation = useMutation({
    mutationFn: (conviteId: string) => IgrejaRepository.revogarConvite(conviteId),
    onSuccess: () => {
      Toast.show({ type: 'success', text1: 'Convite revogado' });
      queryClient.invalidateQueries({ queryKey: ['igreja-convites', igrejaAtiva?.id] });
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Erro ao revogar convite' });
    },
  });

  // ========== HANDLERS ==========

  const handleAprovar = (solicitacao: ResponseIgrejaSolicitacaoDto) => {
    FancyAlert.alert(
      'Aprovar solicitação?',
      `Deseja aprovar "${solicitacao.voluntario?.nome || 'este voluntário'}" como membro da igreja?`,
      [
        { text: 'Cancelar', style: 'destructive' },
        {
          text: 'Aprovar',
          onPress: () => aprovarMutation.mutate({ solicitacaoId: solicitacao.id }),
        },
      ],
    );
  };

  const handleRejeitar = (solicitacao: ResponseIgrejaSolicitacaoDto) => {
    FancyAlert.alert(
      'Rejeitar solicitação?',
      `Deseja rejeitar a solicitação de "${solicitacao.voluntario?.nome || 'este voluntário'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: () => rejeitarMutation.mutate({ solicitacaoId: solicitacao.id }),
        },
      ],
    );
  };

  const handleShare = async (convite: ResponseIgrejaConviteDto) => {
    const message = `Oi! Use este convite para entrar na nossa igreja no Diakonia:\n\n${convite.inviteLink}\n\nSe não abrir automaticamente, cole este código no app: ${convite.token}`;
    try {
      await Share.share({ message });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erro ao compartilhar' });
    }
  };

  const handleRevogar = (convite: ResponseIgrejaConviteDto) => {
    FancyAlert.alert(
      'Revogar convite?',
      `O convite "${convite.descricao || convite.token.substring(0, 8) + '...'}" não poderá mais ser usado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: () => revogarConviteMutation.mutate(convite.id),
        },
      ],
    );
  };

  const handleCopiarToken = (token: string) => {
    Clipboard.setString(token);
    Toast.show({ type: 'success', text1: 'Código copiado!' });
  };

  const handleCopiarLink = (link: string) => {
    Clipboard.setString(link);
    Toast.show({ type: 'success', text1: 'Link copiado!' });
  };

  // ========== COMPUTED ==========

  const pendentesCount = solicitacoes.filter((s) => s.status === 'PENDING').length;
  const convitesAtivos = convites.filter((c) => getConviteStatus(c) === 'ATIVO');
  const totalAceitos = solicitacoes.filter((s) => s.status === 'APPROVED').length;

  // ========== RENDERS ==========

  const renderEmptySolicitacoes = () => (
    <FancyListEmpty
      icon={{ library: 'MaterialCommunityIcons', name: 'account-clock-outline', size: 55 }}
      label='Nenhuma solicitação pendente'
    />
  );

  const renderEmptyConvites = () => (
    <FancyListEmpty
      icon={{ library: 'MaterialCommunityIcons', name: 'ticket-confirmation-outline', size: 55 }}
      label='Nenhum convite criado'
    />
  );

  const renderSolicitacoesTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetchingSolicitacoes}
          onRefresh={() => refetchSolicitacoes()}
          colors={[palette.primary]}
          tintColor={palette.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {solicitacoes.length === 0 ? (
        renderEmptySolicitacoes()
      ) : (
        <View style={styles.listContainer}>
          {solicitacoes.map((item) => (
            <SolicitacaoCard
              key={item.id}
              solicitacao={item}
              onAprovar={() => handleAprovar(item)}
              onRejeitar={() => handleRejeitar(item)}
              formatDateTime={formatDateTime}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderConvitesTab = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={isRefetchingConvites}
          onRefresh={() => refetchConvites()}
          colors={[palette.primary]}
          tintColor={palette.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {convites.length === 0 ? (
        renderEmptyConvites()
      ) : (
        <View style={styles.listContainer}>
          {convites.map((item) => (
            <ConviteTicketCard
              key={item.id}
              convite={item}
              status={getConviteStatus(item)}
              onCompartilhar={() => handleShare(item)}
              onRevogar={() => handleRevogar(item)}
              onCopiarToken={() => handleCopiarToken(item.token)}
              formatDateTime={formatDateTime}
              isRevogando={revogarConviteMutation.isPending}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );

  const tabItems = useMemo<TabItem[]>(
    () => [
      {
        title: `Solicitações (${pendentesCount})`,
        content: renderSolicitacoesTab(),
        icon: { library: 'MaterialCommunityIcons', name: 'account-clock-outline', size: 16 },
      },
      {
        title: `Convites (${convitesAtivos.length})`,
        content: renderConvitesTab(),
        icon: { library: 'MaterialCommunityIcons', name: 'ticket-confirmation-outline', size: 16 },
      },
    ],
    [
      solicitacoes,
      convites,
      isRefetchingSolicitacoes,
      isRefetchingConvites,
      aprovarMutation.isPending,
      rejeitarMutation.isPending,
      revogarConviteMutation.isPending,
    ],
  );

  // ========== LOADING / ERROR STATES ==========

  if (
    (isLoadingSolicitacoes || isLoadingConvites) &&
    solicitacoes.length === 0 &&
    convites.length === 0
  ) {
    return <FancyLoading />;
  }

  if (!igrejaAtiva?.id) {
    return (
      <FancyPageView style={styles.centerContainer}>
        <DefaultIcons.Custom
          library='MaterialCommunityIcons'
          name='church'
          size={64}
          color={palette.fonts.inactive}
        />
        <FancyText size='medium' color={palette.fonts.inactive} style={styles.emptyText}>
          Selecione uma igreja para gerenciar solicitações e convites.
        </FancyText>
      </FancyPageView>
    );
  }

  if (!hasPermission) {
    return (
      <FancyPageView style={styles.centerContainer}>
        <DefaultIcons.Custom
          library='MaterialIcons'
          name='lock'
          size={64}
          color={palette.fonts.inactive}
        />
        <FancyText size='medium' color={palette.fonts.inactive} style={styles.emptyText}>
          Você não tem permissão para acessar esta área.
        </FancyText>
      </FancyPageView>
    );
  }

  return (
    <FancyPageView>
      <View style={styles.container}>
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <SummaryCards
            pendentes={pendentesCount}
            convitesAtivos={convitesAtivos.length}
            totalAceitos={totalAceitos}
          />
        </View>

        {/* Tabs */}
        <FancyTabs items={tabItems} initialIndex={initialTabIndex} onTabChange={setTabIndex} />
      </View>

      {/* FAB para criar convite (só na aba de convites) */}
      {tabIndex === 1 && <FancyFab onPress={() => setShowNovoConviteModal(true)} />}

      {/* Modal: Novo Convite */}
      <NovoConviteModal
        visible={showNovoConviteModal}
        onClose={() => setShowNovoConviteModal(false)}
        onCriar={(dto) => criarConviteMutation.mutate(dto)}
        isLoading={criarConviteMutation.isPending}
      />

      {/* Modal: Convite Gerado */}
      <ConviteGeradoModal
        convite={conviteGerado}
        onClose={() => setConviteGerado(null)}
        onCompartilhar={() => conviteGerado && handleShare(conviteGerado)}
        onCopiarToken={() => conviteGerado && handleCopiarToken(conviteGerado.token)}
        onCopiarLink={() => conviteGerado && handleCopiarLink(conviteGerado.inviteLink)}
      />

      {/* Modal: Loading bloqueante ao aprovar/rejeitar solicitação */}
      <FancyModal
        modalProps={{ visible: aprovarMutation.isPending || rejeitarMutation.isPending }}
        closeOnBackdropPress={false}
        center={
          <View style={styles.loadingModalContent}>
            <FancyLoading
              label={aprovarMutation.isPending ? 'Aprovando...' : 'Rejeitando...'}
              containerStyle={styles.loadingModalIndicator}
            />
          </View>
        }
      />
    </FancyPageView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  tabsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabsHeader: {
    paddingVertical: 0,
    marginBottom: 4,
  },
  tabContentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 100,
  },
  listContainer: {
    gap: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingModalContent: {
    width: '100%',
    paddingVertical: 24,
  },
  loadingModalIndicator: {
    flex: 0,
  },
});
