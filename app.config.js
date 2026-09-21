module.exports = {
  expo: {
    name: 'Diakonia',
    slug: 'artos_frontend',
    version: '1.1.1',
    scheme: 'diakonia',
    platforms: ['ios', 'android'],
    orientation: 'portrait',
    icon: './assets/images/icon-ios.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      icon: './assets/images/icon-ios.png',
      supportsTablet: false,
      bundleIdentifier: 'br.app.diakonia',
      buildNumber: '1',
      associatedDomains: ['applinks:diakonia.app.br'],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/icon-android.png',
        backgroundColor: '#ffffff',
      },
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
      edgeToEdgeEnabled: true,
      softwareKeyboardLayoutMode: 'resize',
      package: 'com.church.artos',
      versionCode: 1,
      permissions: ['INTERNET', 'VIBRATE'],
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'diakonia.app.br',
              pathPrefix: '/invite',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    plugins: [
      'expo-router',
      'expo-font',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#151A2C',
          image: './assets/images/splash-icon.png',
          resizeMode: 'cover',
          enableFullScreenImage_legacy: true,
          dark: {
            image: './assets/images/splash-icon.png',
            backgroundColor: '#151A2C',
          },
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Permita que o Diakonia acesse suas fotos para atualizar seu perfil.',
          cameraPermission: 'Permita que o Diakonia use sua câmera para tirar a foto do perfil.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: '#73D1C0',
        },
      ],
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          project: 'artos-front',
          organization: 'artos-uw',
        },
      ],
      'expo-secure-store',
      'expo-web-browser',
    ],
    extra: {
      router: {},
      eas: {
        projectId: '8de609c4-80b9-4a57-9d70-b8c16383e892',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/8de609c4-80b9-4a57-9d70-b8c16383e892',
      requestHeaders: {
        'expo-channel-name': 'production',
      },
    },
  },
};
