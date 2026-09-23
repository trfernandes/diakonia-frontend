import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import FancyPageView from '../../../../../components/containers/FancyPageView';
import FancyFormScrollView from '../../../../../components/FancyFormScrollView';
import FancyButton from '../../../../../components/buttons/FancyButton';
import { DefaultIconsNames } from '../../../../../constants/icons';
import AssistenteParametrosStep from '../../../../../components/pages/ministerios/escalas/assistant/AssistenteParametrosStep';
import { EscalaFormData, EscalaSchema } from '../../../../../domain/schemas/escalaSchema';
import { useEscalasCrud } from '../../../../../hooks/useEscalaCrud';
import { useEscalaNomeValidator } from '../../../../../hooks/useEscalaNomeValidator';
import { useAuth } from '../../../../../contexts/AuthContext';
import { useLoading } from '../../../../../contexts/LoadingContext';
import { DateUtilsApi } from '../../../../../utils/date_utils';
import { TutorialBanner } from '../../../../../components/tutorial/TutorialBanner';
import { TutorialOverlay } from '../../../../../components/tutorial/TutorialOverlay';
import { TutorialTarget } from '../../../../../components/tutorial/TutorialTarget';
import { useScreenTutorial } from '../../../../../hooks/useScreenTutorial';
import {
  ESCALA_MANUAL_TOUR_ID,
  ESCALA_MANUAL_TOUR_STEPS,
  ESCALA_MANUAL_TOUR_TITLE,
} from '../../../../../components/tutorial/tours/escalasManualTour';
import { useAnalytics } from '../../../../../core/analytics/AnalyticsContext';
import { AnalyticsEvent, buildEscalaCriadaProps } from '../../../../../core/analytics/events';

const DUPLICATE_NAME_MESSAGE = 'Já existe uma escala com esse nome neste ministério.';

export default function EscalaManualPage() {
  const { ministerioId } = useLocalSearchParams<{ ministerioId: string }>();
  const { user, igrejaAtiva } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const { createManual, isCreatingManual } = useEscalasCrud();
  const posthog = useAnalytics();
  const { validateNomeDebounced, isCheckingName } = useEscalaNomeValidator(ministerioId);
  const tour = useScreenTutorial(
    ESCALA_MANUAL_TOUR_ID,
    ESCALA_MANUAL_TOUR_TITLE,
    ESCALA_MANUAL_TOUR_STEPS,
  );

  const dataAtual = new Date();
  const form = useForm({
    resolver: zodResolver(EscalaSchema),
    defaultValues: {
      dataInicio: new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1),
      dataTermino: new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 2, 0),
    },
  });

  const handleNomeBlur = useCallback(
    async (nome: string) => {
      const nomeNormalizado = nome?.trim() ?? '';
      if (!nomeNormalizado) return;

      try {
        const result = await validateNomeDebounced(nomeNormalizado);
        if (result.exists) {
          form.setError('nome', { message: DUPLICATE_NAME_MESSAGE });
          return;
        }
        if (form.formState.errors.nome?.message === DUPLICATE_NAME_MESSAGE) {
          form.clearErrors('nome');
        }
      } catch (error) {
        if (__DEV__) {
          console.log('[EscalaManual] erro ao validar nome no blur:', error);
        }
      }
    },
    [form, validateNomeDebounced],
  );

  const handleCriar = form.handleSubmit(async (values) => {
    if (!ministerioId || !igrejaAtiva?.id || !user?.user?.id) return;

    showLoading('Criando escala...');
    try {
      const resultado = await createManual({
        ministerioId,
        criadoPor: user.user.id,
        nome: values.nome,
        dataInicio: DateUtilsApi.dateOnlyToApi(values.dataInicio),
        dataTermino: DateUtilsApi.dateOnlyToApi(values.dataTermino),
      });
      posthog.capture(
        AnalyticsEvent.EscalaCriada,
        buildEscalaCriadaProps({
          escalaId: resultado.id,
          ministerioId,
          qtdItens: resultado.itens?.length ?? 0,
        }),
      );

      router.replace({
        pathname: '/ministerios/escalas/details',
        params: {
          ministerioId,
          escalaId: resultado.id,
          viewMode: 'edit',
        },
      });
    } catch (error) {
      const responseData = axios.isAxiosError(error) ? (error.response?.data as any) : null;
      const errorCode = responseData?.error?.code || responseData?.errorCode;
      if (errorCode === 'ESCALA_NOME_DUPLICADO') {
        form.setError('nome', { message: DUPLICATE_NAME_MESSAGE });
      }
    } finally {
      hideLoading();
    }
  });

  return (
    <FormProvider {...form}>
      <FancyPageView style={styles.container}>
        {tour.showBanner && (
          <View style={styles.bannerWrapper}>
            <TutorialBanner onStart={tour.start} onDismiss={tour.skip} />
          </View>
        )}

        <FancyFormScrollView fill contentContainerStyle={styles.scrollContent}>
          <AssistenteParametrosStep isCheckingName={isCheckingName} onNomeBlur={handleNomeBlur} />
        </FancyFormScrollView>

        <View style={styles.footer}>
          <TutorialTarget
            id='escala-manual-criar'
            registerTarget={tour.registerTarget}
            unregisterTarget={tour.unregisterTarget}
          >
            <FancyButton
              label={!isCreatingManual ? 'Criar escala' : 'Criando...'}
              disabled={isCreatingManual || isCheckingName}
              icon={{ ...DefaultIconsNames.save, size: 14 }}
              onPress={handleCriar}
            />
          </TutorialTarget>
        </View>

        <TutorialOverlay tour={tour} />
      </FancyPageView>
    </FormProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bannerWrapper: { paddingHorizontal: 15, paddingTop: 10, marginBottom: 4 },
  scrollContent: { flexGrow: 1, paddingTop: 14, gap: 14, paddingHorizontal: 20, paddingBottom: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
});
