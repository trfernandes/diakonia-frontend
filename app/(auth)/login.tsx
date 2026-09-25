import { StyleSheet, View, TextInput, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardState } from 'react-native-keyboard-controller';

import FancyButton from '../../components/buttons/FancyButton';
import FancyCheckbox from '../../components/FancyCheckbox';
import FancyText from '../../components/FancyText';
import FancyTextInput from '../../components/fields/FancyTextInput';
import FancyPasswordInput from '../../components/fields/FancyPasswordInput';
import { EXTRA_SMALL_SIZE_FONT } from '../../constants/font';
import { router } from 'expo-router';
import { usePallete } from '../../hooks/usePallete';
import { useAuth } from '../../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnectivity } from '../../core/network/connectivity/ConnectivityProvider';
import { CadastroIgrejaRepository } from '../../domain/services/CadastroIgrejaRepository';
import { FancyAlert } from '../../components/modal/FancyAlert';
import {
  clearPendingLoginAttempt,
  setPendingLoginAttempt,
} from '../../core/auth/pendingLoginAttemptStore';

const REMEMBER_EMAIL_KEY = 'artos_remember_email';
const REMEMBER_PASSWORD_KEY = 'artos_remember_password';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginIndexPage() {
  const { signIn } = useAuth();
  const { status: connectivityStatus, isOffline } = useConnectivity();
  const isServerUnavailable = connectivityStatus !== 'ok';
  const passwordInputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const keyboardHeight = useKeyboardState((state) => state.height);

  const Pallete = usePallete();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    const loadCredentials = async () => {
      const savedEmail = await SecureStore.getItemAsync(REMEMBER_EMAIL_KEY);
      const savedPassword = await SecureStore.getItemAsync(REMEMBER_PASSWORD_KEY);

      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    };
    loadCredentials();
  }, []);

  const validateForm = () => {
    let isValid = true;
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Informe o e-mail');
      isValid = false;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('E-mail invalido');
      isValid = false;
    } else {
      setEmailError('');
    }

    if (!password.trim()) {
      setPasswordError('Informe a senha');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  const handleNetworkError = () => {
    FancyAlert.alert(
      'Problema de conexao',
      'Nao foi possivel se conectar. Verifique sua internet e tente novamente.',
      [
        { text: 'Cancelar', style: 'default' },
        { text: 'Tentar novamente', onPress: () => handleLogin() },
      ],
    );
  };

  const handleCadastroPendente = async (error: AxiosError | any, fallbackEmail: string) => {
    const data = error?.response?.data;
    const payload = data?.data ?? data;
    const errorCode =
      data?.code || data?.error?.code || data?.errorCode || payload?.code || payload?.errorCode;
    const message = data?.message || data?.error?.message || payload?.message;

    const normalizedMessage = typeof message === 'string' ? message.toLowerCase() : '';
    const isCadastroPendente =
      errorCode === 'CADASTRO_PENDENTE' ||
      normalizedMessage.includes('cadastro_pendente') ||
      normalizedMessage.includes('cadastro pendente');

    if (!isCadastroPendente) return false;

    const cadastroId = payload?.cadastroId;
    const cadastroSecret = payload?.cadastroSecret;
    const responsavelEmail = payload?.responsavelEmail || fallbackEmail;

    if (cadastroId && cadastroSecret && responsavelEmail) {
      await CadastroIgrejaRepository.salvarDadosCadastro({
        cadastroId,
        cadastroSecret,
        responsavelEmail,
      });
    }

    const dadosCadastro = await CadastroIgrejaRepository.obterDadosCadastro();
    if (dadosCadastro) {
      router.replace('/(auth)/igreja-cadastro-aguardando-email');
      return true;
    }

    Toast.show({
      type: 'error',
      text1: 'Cadastro pendente',
      text2: 'Nao encontramos os dados do cadastro. Inicie o cadastro novamente.',
    });
    return true;
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!validateForm()) return;

    const trimmedEmail = email.trim();
    if (isOffline) {
      handleNetworkError();
      return;
    }

    setLoading(true);

    try {
      await signIn(trimmedEmail, password);
      clearPendingLoginAttempt();

      try {
        if (rememberMe) {
          await SecureStore.setItemAsync(REMEMBER_EMAIL_KEY, trimmedEmail);
          await SecureStore.setItemAsync(REMEMBER_PASSWORD_KEY, password);
        } else {
          await SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY);
          await SecureStore.deleteItemAsync(REMEMBER_PASSWORD_KEY);
        }
      } catch (secureStoreError: any) {
        console.error('Erro ao salvar credenciais no SecureStore:', secureStoreError);
        Toast.show({
          type: 'error',
          text1: 'Erro ao salvar credenciais',
          text2: `Não foi possível salvar o e-mail e senha localmente. ${secureStoreError?.message || JSON.stringify(secureStoreError)}`,
        });
      }

      let inviteToken: string | null = null;
      try {
        const raw = await AsyncStorage.getItem('pendingInvite');
        const legacy = await AsyncStorage.getItem('pendingInviteToken');
        inviteToken = raw ? (JSON.parse(raw)?.token ?? null) : (legacy ?? null);
      } catch {
        inviteToken = null;
      }

      if (inviteToken) {
        router.replace(`/(public)/invite/${inviteToken}`);
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      if (await handleCadastroPendente(error, trimmedEmail)) return;

      const status = error?.response?.status;
      const data = error?.response?.data;
      const backendMessage: string = (data?.message || data?.error?.message || '').toLowerCase();

      if (status === 401) {
        if (
          backendMessage.includes('não verificado') ||
          backendMessage.includes('nao verificado')
        ) {
          setPendingLoginAttempt(trimmedEmail, password);
          router.push({
            pathname: '/(auth)/voluntario-aguardando-email',
            params: { email: trimmedEmail },
          });
          return;
        } else if (backendMessage.includes('desativada') || backendMessage.includes('desativado')) {
          clearPendingLoginAttempt();
          Toast.show({
            type: 'error',
            text1: 'Conta desativada',
            text2: 'Sua conta foi desativada. Entre em contato com o suporte.',
          });
        } else {
          clearPendingLoginAttempt();

          // Credencial rejeitada pelo backend: se veio de "lembrar-me" (SecureStore/Keychain,
          // sobrevive a reinstall), limpar aqui — evita reenvio silencioso da mesma senha errada
          // pra sempre. Ver artos_frontend/CLAUDE.md "Login — SecureStore lembrar-me".
          await SecureStore.deleteItemAsync(REMEMBER_EMAIL_KEY);
          await SecureStore.deleteItemAsync(REMEMBER_PASSWORD_KEY);
          setRememberMe(false);
          setPassword('');

          Toast.show({
            type: 'error',
            text1: 'Credenciais inválidas',
            text2: 'E-mail ou senha incorretos. Senha salva removida — digite novamente.',
          });
        }
        return;
      }

      const isNetworkError =
        !error?.response ||
        error?.code === 'ECONNABORTED' ||
        `${error?.message || ''}`.toLowerCase().includes('timeout') ||
        `${error?.message || ''}`.toLowerCase().includes('network');

      if (isNetworkError || isOffline) {
        handleNetworkError();
        return;
      }

      Toast.show({
        type: 'error',
        text1: 'Nao foi possivel autenticar',
        text2: 'Verifique se e-mail e senha estao corretos e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: Pallete.backgroundColor }]}>
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + 24,
              paddingBottom:
                (keyboardVisible ? keyboardHeight - insets.bottom : insets.bottom) + 24,
            },
          ]}
        >
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={[styles.logoImage, { tintColor: Pallete.primary }]}
              resizeMode='contain'
            />
          </View>

          <View style={styles.bodyCenter}>
            <View style={styles.centerGroup}>
              <FancyText
                size='large'
                type='bold'
                color={Pallete.fonts.dark}
                style={styles.screenTitle}
              >
                Entre na sua conta
              </FancyText>

              <View style={styles.fieldsWrap}>
                <FancyTextInput
                  label='E-mail'
                  value={email}
                  errorMessage={emailError}
                  inputProps={{
                    onChangeText: (value) => {
                      setEmail(value);
                      if (emailError) setEmailError('');
                    },
                    keyboardType: 'email-address',
                    autoCapitalize: 'none',
                    autoCorrect: false,
                    returnKeyType: 'next',
                    textContentType: 'username',
                    autoComplete: 'email',
                    importantForAutofill: 'yes',
                    blurOnSubmit: false,
                    onSubmitEditing: () => passwordInputRef.current?.focus(),
                    accessibilityLabel: 'E-mail',
                  }}
                  readonly={loading}
                  disabled={loading}
                />
                <FancyPasswordInput
                  label='Senha'
                  value={password}
                  errorMessage={passwordError}
                  inputRef={passwordInputRef}
                  inputProps={{
                    onChangeText: (value) => {
                      setPassword(value);
                      if (passwordError) setPasswordError('');
                    },
                    returnKeyType: 'go',
                    textContentType: 'password',
                    autoComplete: 'password',
                    autoCapitalize: 'none',
                    autoCorrect: false,
                    importantForAutofill: 'yes',
                    onSubmitEditing: () => handleLogin(),
                    accessibilityLabel: 'Senha',
                  }}
                  readonly={loading}
                  disabled={loading}
                />
              </View>

              <View style={styles.rememberRow}>
                <FancyCheckbox
                  label='Lembrar-se'
                  value={rememberMe}
                  onChangeValue={setRememberMe}
                  disabled={loading}
                  labelColor={Pallete.fonts.dark}
                />
                <FancyButton
                  type='text'
                  label='Esqueceu sua senha?'
                  onPress={() => router.push('/(auth)/forgot-password')}
                  labelStyle={{ fontSize: EXTRA_SMALL_SIZE_FONT, color: Pallete.fonts.link }}
                  containerStyle={styles.linkButton}
                  disabled={loading}
                />
              </View>

              <FancyButton
                label={loading ? 'Entrando...' : 'Entrar'}
                onPress={handleLogin}
                disabled={loading || isServerUnavailable}
              />

              {!keyboardVisible && (
                <View style={styles.footerWrap}>
                  <View style={styles.signupRow}>
                    <FancyText size='small' color={Pallete.fonts.dark}>
                      Não tem uma conta ainda?
                    </FancyText>
                    <FancyButton
                      type='text'
                      label='Começar'
                      onPress={() => router.push('/(auth)/admin-discovery')}
                      labelStyle={{ color: Pallete.fonts.link }}
                      containerStyle={styles.linkButton}
                      disabled={loading}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const LOGO_HEIGHT = 58;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  centerGroup: {
    gap: 14,
  },
  // Logo fixo no topo — fora da equação de centralização (regra: logo do login
  // é exceção; o conteúdo é que deve ficar centralizado verticalmente).
  logoSection: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  // Espaço restante abaixo do logo: centraliza o conteúdo (título + campos + botões)
  // verticalmente, sem o peso visual do logo deslocar o centro óptico.
  bodyCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  screenTitle: {
    textAlign: 'left',
  },
  logoImage: {
    width: 150,
    height: LOGO_HEIGHT,
  },
  fieldsWrap: {
    gap: 14,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  linkButton: {
    paddingHorizontal: 0,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0,
  },
  footerWrap: {
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
});
