import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppButton } from '../components/AppButton';
import { menuItems, restaurants } from '../data/seed';
import { colors, formatNaira } from '../config/theme';
import { useAppStore } from '../store/useAppStore';
import { MenuItem, Restaurant } from '../types';
import { listMenuItems, listRestaurants } from '../services/catalog';
import { isSupabaseConfigured } from '../lib/supabase';

export function RestaurantScreen() {
  const router = useRouter();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const previewRestaurant = restaurants.find((item) => item.id === restaurantId);
  const previewItems = menuItems.filter((item) => item.restaurantId === restaurantId);
  const [remoteMenu, setRemoteMenu] = useState<{
    restaurantId: string;
    restaurant?: Restaurant;
    items: MenuItem[];
    error?: string;
  } | null>(null);
  const currentMenu = remoteMenu?.restaurantId === restaurantId ? remoteMenu : null;
  const restaurant = isSupabaseConfigured ? currentMenu?.restaurant : previewRestaurant;
  const items = isSupabaseConfigured ? currentMenu?.items ?? [] : previewItems;
  const loading = isSupabaseConfigured && !currentMenu;
  const loadError = currentMenu?.error ?? '';
  const addToCart = useAppStore((state) => state.addToCart);
  const clearCart = useAppStore((state) => state.clearCart);
  const quantity = useAppStore((state) => state.cart.reduce((sum, line) => sum + line.quantity, 0));
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!restaurantId) return;
    let active = true;
    void Promise.all([listRestaurants(), listMenuItems(restaurantId)])
      .then(([available, menu]) => {
        if (!active) return;
        setRemoteMenu({
          restaurantId,
          restaurant: available.find((item) => item.id === restaurantId),
          items: menu,
          error: available.some((item) => item.id === restaurantId) ? undefined : 'This restaurant is not available right now.',
        });
      })
      .catch((error: unknown) => {
        if (active) setRemoteMenu({
          restaurantId,
          items: [],
          error: error instanceof Error ? error.message : 'Please try again.',
        });
      });
    return () => { active = false; };
  }, [restaurantId]);
  if (loading) return <View style={[styles.page, styles.loading]}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Fresh menu coming right up…</Text></View>;
  if (loadError) return <View style={[styles.page, styles.unavailable]}><Text style={styles.unavailableTitle}>We can’t load this menu.</Text><Text style={styles.unavailableText}>{loadError}</Text></View>;
  if (!restaurant) return <View style={styles.page}><Text>Restaurant not found.</Text></View>;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Image source={{ uri: restaurant.imageUrl }} style={styles.hero} />
      <Text style={styles.name}>{restaurant.name}</Text>
      <Text style={styles.meta}>{restaurant.category} · ★ {restaurant.rating} · {restaurant.deliveryMinutes} min</Text>
      <Text style={styles.heading}>Popular picks</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.item}>
          <View style={styles.itemText}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.description}>{item.description}</Text><Text style={styles.price}>{formatNaira(item.price)}</Text></View>
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
          <AppButton label="+" onPress={() => {
            const currentRestaurant = useAppStore.getState().cart[0]?.item.restaurantId;
            if (currentRestaurant && currentRestaurant !== item.restaurantId) {
              Alert.alert('Start a new bag?', 'Your bag has items from another restaurant. Replace it with this restaurant’s menu?', [
                { text: 'Keep current bag', style: 'cancel' },
                { text: 'Start new bag', style: 'destructive', onPress: () => { clearCart(); addToCart(item); } },
              ]);
              return;
            }
            addToCart(item);
          }} style={styles.addButton} />
        </View>
      ))}
      <AppButton label={`View bag${quantity ? ` (${quantity})` : ''}`} onPress={() => router.push('/cart')} style={styles.cta} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 13 },
  unavailable: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  unavailableTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  unavailableText: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  content: { width: '100%', maxWidth: 860, alignSelf: 'center', padding: 18, paddingBottom: 36 },
  hero: { width: '100%', height: 190, borderRadius: 20, backgroundColor: colors.greenLight },
  name: { color: colors.ink, fontSize: 25, fontWeight: '800', marginTop: 17 },
  meta: { color: colors.muted, fontSize: 13, marginTop: 6 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 25, marginBottom: 4 },
  item: { backgroundColor: colors.white, borderRadius: 17, padding: 13, marginTop: 10, minHeight: 125, flexDirection: 'row', borderWidth: 1, borderColor: colors.border },
  itemText: { flex: 1, paddingRight: 8 },
  itemName: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  description: { color: colors.muted, fontSize: 11, marginTop: 5, lineHeight: 16 },
  price: { color: colors.ink, fontSize: 13, fontWeight: '700', marginTop: 7 },
  thumb: { width: 75, height: 75, borderRadius: 12, backgroundColor: colors.greenLight },
  addButton: { position: 'absolute', bottom: 9, right: 13, minHeight: 31, width: 36, borderRadius: 10, paddingHorizontal: 0 },
  cta: { marginTop: 20 },
});
