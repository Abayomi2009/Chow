import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../config/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.canvas },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="restaurant/[restaurantId]" options={{ title: 'Menu' }} />
        <Stack.Screen name="cart" options={{ title: 'Your cart' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="tracking" options={{ title: 'Order tracking' }} />
        <Stack.Screen name="driver" options={{ title: 'Courier' }} />
        <Stack.Screen name="admin" options={{ title: 'Operations' }} />
        <Stack.Screen name="auth" options={{ title: 'Your account' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
