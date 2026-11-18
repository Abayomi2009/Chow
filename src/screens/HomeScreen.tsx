import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { DeliveryMap } from '../components/DeliveryMap';
import { RestaurantCard } from '../components/RestaurantCard';
import { restaurants as previewRestaurants } from '../data/seed';
import { colors } from '../config/theme';
import { useAppStore } from '../store/useAppStore';
import { AppRole, Restaurant } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { registerPushToken } from '../services/notifications';
import { listRestaurants } from '../services/catalog';

export function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const columns = width >= 1120 ? 3 : width >= 768 ? 2 : 1;
  const horizontalPadding = isWide ? 32 : 20;
  const contentWidth = Math.min(width, 1240);
  const cardGap = 14;
  const restaurantCardWidth = (contentWidth - horizontalPadding * 2 - cardGap * (columns - 1)) / columns;
  const [availableRestaurants, setAvailableRestaurants] = useState<Restaurant[]>(previewRestaurants);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [accountRole, setAccountRole] = useState<AppRole | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const count = useAppStore((state) => state.cart.reduce((sum, line) => sum + line.quantity, 0));
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const filters = useMemo(() => [
    'All',
    ...new Set(availableRestaurants.map((restaurant) => restaurant.category.split('·')[0].trim()).filter(Boolean)),
    'Saved',
  ], [availableRestaurants]);
  const filteredRestaurants = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return availableRestaurants.filter((restaurant) => {
      const matchesQuery = !normalizedQuery
        || `${restaurant.name} ${restaurant.category}`.toLocaleLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === 'All'
        || (filter === 'Saved' ? favorites.includes(restaurant.id) : restaurant.category.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
      return matchesQuery && matchesFilter;
    });
  }, [availableRestaurants, favorites, filter, query]);

  const enableNotifications = async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error('Sign in before enabling order notifications.');
      await registerPushToken(data.user.id);
      Alert.alert('Notifications enabled', 'We’ll let you know when your order changes.');
    } catch (error) {
      Alert.alert('Could not enable notifications', error instanceof Error ? error.message : 'Please try again.');
    }
  };
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void listRestaurants()
      .then(setAvailableRestaurants)
      .catch((error: unknown) => Alert.alert('Could not load restaurants', error instanceof Error ? error.message : 'Please try again.'));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    const loadProfileName = async (userId: string | null, metadataName: unknown) => {
      if (!userId) {
        if (active) {
          if (active) {
            setCustomerName(null);
            setAccountRole(null);
          }
        }
        return;
      }

      setCustomerName(null);
      setAccountRole(null);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name,role')
          .eq('id', userId)
          .maybeSingle();
        if (error) throw error;
        const profileName = data?.full_name.trim();
        const fallbackName = typeof metadataName === 'string' ? metadataName.trim() : '';
        const role = data?.role;
        if (active) {
          setCustomerName(profileName || fallbackName || null);
          setAccountRole(role === 'admin' || role === 'driver' || role === 'customer' ? role : null);
        }
      } catch (error) {
        if (active) {
          setCustomerName(null);
          setAccountRole(null);
          Alert.alert('Could not load your profile', error instanceof Error ? error.message : 'Please try again.');
        }
      }
    };

    void supabase.auth.getUser()
      .then(({ data, error }) => {
        if (error) throw error;
        return loadProfileName(data.user?.id ?? null, data.user?.user_metadata.full_name);
      })
      .catch((error: unknown) => {
        if (active) {
          Alert.alert('Could not load your account', error instanceof Error ? error.message : 'Please try again.');
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void Promise.resolve().then(() => loadProfileName(
        session?.user.id ?? null,
        session?.user.user_metadata.full_name,
      ));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>c</Text></View>
          <View><Text style={styles.eyebrow}>GOOD FOOD, GOOD MOOD</Text><Text style={styles.title}>chow</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open bag${count ? `, ${count} items` : ''}`} style={styles.cart} onPress={() => router.push('/cart')}>
          <Text style={styles.cartIcon}>▱</Text>
          {count > 0 ? <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{count}</Text></View> : null}
        </Pressable>
      </View>
      <View style={styles.address}>
        <Text style={styles.addressIcon}>⌖</Text>
        <View style={styles.addressText}><Text style={styles.addressLabel}>DELIVERING TO</Text><Text style={styles.addressValue}>Victoria Island, Lagos  ▾</Text></View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{customerName?.trim().charAt(0).toUpperCase() ?? 'C'}</Text></View>
      </View>
      {!isSupabaseConfigured && <Text style={styles.setup}>Preview mode · Add Supabase keys in .env to enable sign-in and live orders.</Text>}
      <View style={styles.greeting}>
        <Text style={styles.greetingLabel}>{customerName ? 'WELCOME BACK' : 'YOUR LOCAL FOOD GUIDE'}</Text>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.greetingName}>{customerName ?? 'Welcome to Chow'}</Text>
      </View>
      <View style={[styles.hero, isWide && styles.heroWide]}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>A LITTLE TREAT, ON US</Text>
          <Text style={styles.heroTitle}>Good things{'\n'}are cooking.</Text>
          <Text style={styles.heroSub}>Find your new favourite around the corner.</Text>
          <View style={styles.heroPill}><Text style={styles.heroPillText}>MADE FOR LAGOS  ·  MADE WITH LOVE</Text></View>
        </View>
        <Text accessibilityElementsHidden style={styles.heroEmoji}>🍲</Text>
        <View style={styles.heroCircle} />
      </View>
      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="Search restaurants and cuisines"
          placeholder="Dishes, restaurants, cuisines"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}><Text style={styles.clearSearch}>×</Text></Pressable> : null}
      </View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Find your flavour</Text><Text style={styles.resultCount}>{availableRestaurants.length} spots</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => {
          const selected = filter === item;
          return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFilter(item)} style={[styles.filterChip, selected && styles.filterChipSelected]}>
            {item === 'Saved' ? <Text style={[styles.filterHeart, selected && styles.filterHeartSelected]}>♥</Text> : null}
            <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{item}</Text>
            {item === 'Saved' ? <Text style={[styles.savedCount, selected && styles.savedCountSelected]}>{favorites.length}</Text> : null}
          </Pressable>;
        })}
      </ScrollView>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{filter === 'Saved' ? 'Your saved spots' : 'Popular around you'}</Text></View>
      <View style={[styles.restaurantGrid, { gap: cardGap }]}>
        {filteredRestaurants.map((restaurant) => <View key={restaurant.id} style={{ width: restaurantCardWidth }}>
          <RestaurantCard
            restaurant={restaurant}
            favorite={favorites.includes(restaurant.id)}
            onPress={() => router.push({ pathname: '/restaurant/[restaurantId]', params: { restaurantId: restaurant.id } })}
            onToggleFavorite={() => toggleFavorite(restaurant.id)}
          />
        </View>)}
      </View>
      {filteredRestaurants.length === 0 ? <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>{filter === 'Saved' ? '♡' : '⌕'}</Text>
        <Text style={styles.emptyTitle}>{filter === 'Saved' ? 'Save a spot for later' : 'No kitchens found'}</Text>
        <Text style={styles.emptyText}>{filter === 'Saved' ? 'Tap the heart on a restaurant to keep it close.' : 'Try a different search or explore another flavour.'}</Text>
        <Pressable onPress={() => { setQuery(''); setFilter('All'); }}><Text style={styles.resetText}>Explore all restaurants</Text></Pressable>
      </View> : null}
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Around your area</Text><Text style={styles.mapCaption}>LIVE MAP</Text></View>
      <DeliveryMap restaurants={availableRestaurants} />
      <Pressable style={styles.previewCard} onPress={() => router.push({ pathname: '/tracking', params: { orderId: 'demo', demo: 'true' } })}>
        <View style={styles.previewIcon}><Text style={styles.previewEmoji}>🛵</Text></View>
        <View style={styles.previewCopy}><Text style={styles.previewTitle}>Curious how tracking works?</Text><Text style={styles.previewSub}>Take a quick look at a live delivery.</Text></View>
        <Text style={styles.previewArrow}>›</Text>
      </Pressable>
      <View style={styles.accountActions}>
        <Pressable onPress={() => router.push('/auth')}><Text style={styles.accountLink}>Your account</Text></Pressable>
        {Platform.OS !== 'web' ? <>
          <Text style={styles.accountDivider}>·</Text>
          <Pressable onPress={() => void enableNotifications()}><Text style={styles.accountLink}>Order alerts</Text></Pressable>
        </> : null}
      </View>
      {accountRole === 'admin' ? <Pressable accessibilityRole="button" onPress={() => router.push('/admin')} style={styles.roleAccessButton}>
        <Text style={styles.roleAccessText}>Open admin dashboard  ›</Text>
      </Pressable> : null}
      {accountRole === 'driver' ? <Pressable accessibilityRole="button" onPress={() => router.push('/driver')} style={styles.roleAccessButton}>
        <Text style={styles.roleAccessText}>Open courier workspace  ›</Text>
      </Pressable> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingTop: 36, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: { width: 43, height: 43, backgroundColor: colors.green, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: colors.white, fontWeight: '900', fontSize: 28, lineHeight: 34 },
  eyebrow: { color: colors.green, fontWeight: '800', letterSpacing: 1.05, fontSize: 9 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 2 },
  cart: { position: 'relative', width: 46, height: 46, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cartIcon: { color: colors.ink, fontWeight: '700', fontSize: 26 },
  cartBadge: { position: 'absolute', top: -4, right: -4, minWidth: 19, height: 19, paddingHorizontal: 4, backgroundColor: colors.green, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.canvas },
  cartBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  address: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, marginBottom: 14 },
  addressIcon: { color: colors.green, fontSize: 25 },
  addressText: { flex: 1 },
  addressLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  addressValue: { color: colors.ink, fontWeight: '700', marginTop: 3 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3E6D7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  setup: { color: colors.greenDark, backgroundColor: colors.greenLight, padding: 11, borderRadius: 12, fontSize: 12, marginBottom: 10 },
  greeting: { marginBottom: 15 },
  greetingLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  greetingName: { color: colors.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  hero: { minHeight: 195, overflow: 'hidden', position: 'relative', flexDirection: 'row', alignItems: 'center', borderRadius: 25, backgroundColor: colors.greenDark, padding: 21, marginBottom: 17 },
  heroWide: { minHeight: 230, padding: 36 },
  heroCopy: { zIndex: 1, flex: 1 },
  heroEyebrow: { color: '#B9E0C8', fontWeight: '800', fontSize: 9, letterSpacing: 1.1 },
  heroTitle: { color: colors.white, fontSize: 27, fontWeight: '900', lineHeight: 31, marginTop: 10 },
  heroSub: { color: '#D5E9DB', fontSize: 11, lineHeight: 17, marginTop: 8, maxWidth: 210 },
  heroPill: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF1C', borderRadius: 15, paddingHorizontal: 9, paddingVertical: 6, marginTop: 13 },
  heroPillText: { color: '#E1F2E6', fontSize: 8, letterSpacing: 0.5, fontWeight: '800' },
  heroEmoji: { fontSize: 76, position: 'absolute', right: 3, bottom: 32 },
  heroCircle: { position: 'absolute', width: 170, height: 170, right: -55, bottom: -82, borderRadius: 90, borderWidth: 1, borderColor: '#FFFFFF24' },
  search: { height: 54, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, marginBottom: 19 },
  searchIcon: { color: colors.green, fontSize: 28, marginRight: 9 },
  searchInput: { flex: 1, height: '100%', color: colors.ink, fontSize: 13 },
  clearSearch: { color: colors.muted, fontSize: 24, paddingLeft: 8 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 10 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  restaurantGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  resultCount: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  filters: { gap: 9, paddingVertical: 3, paddingBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 15, paddingVertical: 10, backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  filterChipSelected: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  filterTextSelected: { color: colors.white },
  filterHeart: { color: colors.red, fontSize: 12 },
  filterHeartSelected: { color: colors.white },
  savedCount: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  savedCountSelected: { color: '#D5E9DB' },
  emptyState: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 23, marginBottom: 13 },
  emptyEmoji: { color: colors.green, fontSize: 36, marginBottom: 5 },
  emptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  emptyText: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 12 },
  resetText: { color: colors.green, fontWeight: '800', fontSize: 12 },
  mapCaption: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 13, marginTop: 10 },
  previewIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  previewEmoji: { fontSize: 23 },
  previewCopy: { flex: 1, paddingHorizontal: 12 },
  previewTitle: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  previewSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  previewArrow: { color: colors.green, fontSize: 26, paddingHorizontal: 3 },
  accountActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, paddingVertical: 23 },
  accountLink: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  accountDivider: { color: colors.border },
  roleAccessButton: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
  roleAccessText: { color: colors.green, fontWeight: '800', fontSize: 13 },
});
