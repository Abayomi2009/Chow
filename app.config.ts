import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Chow',
  slug: 'chow-delivery',
  scheme: 'chow',
  platforms: ['ios', 'android', 'web'],
  experiments: { typedRoutes: true },
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: {
    ...config.ios,
    bundleIdentifier: 'com.chow.delivery',
    supportsTablet: true,
    config: {
      ...config.ios?.config,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    },
  },
  android: {
    ...config.android,
    package: 'com.chow.delivery',
    config: {
      ...config.android?.config,
      googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '' },
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  plugins: [
    ...(config.plugins ?? []),
    'expo-router',
    ['expo-location', {
      locationWhenInUsePermission: 'Allow Chow to show restaurants near you and share your courier location during deliveries.',
    }],
    ['expo-notifications', { color: '#087443' }],
    'expo-web-browser',
    'react-native-maps',
  ],
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
});
