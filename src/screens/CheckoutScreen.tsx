import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { AppButton } from '../components/AppButton';
import { colors, formatNaira } from '../config/theme';
import { useAppStore } from '../store/useAppStore';
import { createOrder } from '../services/orders';
import { payForOrder, verifyOrderPayment } from '../services/payments';
import { isSupabaseConfigured } from '../lib/supabase';
import { listRestaurants } from '../services/catalog';
import { restaurants } from '../data/seed';

export function CheckoutScreen() {
  const router = useRouter();
  const cart = useAppStore((state) => state.cart);
  const clearCart = useAppStore((state) => state.clearCart);
  const [address, setAddress] = useState('Victoria Island, Lagos');
  const [busy, setBusy] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingDraftKey, setPendingDraftKey] = useState<string | null>(null);
  const restaurantId = cart[0]?.item.restaurantId;
  const [remoteFee, setRemoteFee] = useState<{ restaurantId: string; amount: number } | null>(null);
  const deliveryFee = remoteFee?.restaurantId === restaurantId
    ? remoteFee.amount
    : restaurants.find((restaurant) => restaurant.id === restaurantId)?.deliveryFee ?? 0;
  const subtotal = cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  useEffect(() => {
    if (!restaurantId) return;
    if (!isSupabaseConfigured) return;
    let active = true;
    void listRestaurants().then((items) => {
      const restaurant = items.find((item) => item.id === restaurantId);
      if (!restaurant) throw new Error('This restaurant is no longer available.');
      if (active) setRemoteFee({ restaurantId, amount: restaurant.deliveryFee });
    }).catch((error: unknown) => Alert.alert('Could not load delivery fee', error instanceof Error ? error.message : 'Please try again.'));
    return () => { active = false; };
  }, [restaurantId]);

  const checkout = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Backend not configured', 'Add your Supabase URL and anon key to .env, then deploy the backend functions to place a real order.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Delivery address required', 'Enter where you would like your order delivered.');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Your bag is empty', 'Add at least one menu item before checkout.');
      return;
    }
    if (!restaurantId) {
      Alert.alert('Restaurant not found', 'Return to the menu and add your items again.');
      return;
    }
    setBusy(true);
    try {
      const restaurantId = cart[0].item.restaurantId;
      if (cart.some((line) => line.item.restaurantId !== restaurantId)) {
        throw new Error('Orders must contain items from one restaurant at a time.');
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Allow location access so we can match your delivery address to a map location.');
      const [deliveryPoint] = await Location.geocodeAsync(address.trim());
      if (!deliveryPoint) throw new Error('We could not find that delivery address. Add a more specific street or area.');
      const draftKey = JSON.stringify({
        restaurantId,
        address: address.trim(),
        lines: cart.map(({ item, quantity }) => [item.id, quantity]),
      });
      let orderId = pendingDraftKey === draftKey ? pendingOrderId : null;
      if (!orderId) {
        if (pendingOrderId) setPendingOrderId(null);
        const order = await createOrder({
          restaurantId,
          lines: cart,
          address: address.trim(),
          latitude: deliveryPoint.latitude,
          longitude: deliveryPoint.longitude,
        });
        orderId = order.orderId;
        setPendingOrderId(orderId);
        setPendingDraftKey(draftKey);
      }
      await payForOrder(orderId);
      const verification = await verifyOrderPayment(orderId);
      if (!verification.paid) {
        Alert.alert('Payment not completed', 'Your bag is still saved. Complete payment before placing another order.');
        return;
      }
      clearCart();
      setPendingOrderId(null);
      setPendingDraftKey(null);
      router.replace({ pathname: '/tracking', params: { orderId } });
    } catch (error) {
      Alert.alert('Checkout failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Almost there</Text>
      <Text style={styles.caption}>Delivery address</Text>
      <TextInput value={address} onChangeText={setAddress} style={styles.input} placeholder="Street, area, city" />
      <Text style={styles.caption}>Payment</Text>
      <Text style={styles.payment}>Paystack secure checkout · Card, bank transfer, or USSD</Text>
      <Text style={styles.caption}>Order summary</Text>
      <Text style={styles.summary}>Subtotal  <Text style={styles.amount}>{formatNaira(subtotal)}</Text></Text>
      <Text style={styles.summary}>Delivery fee  <Text style={styles.amount}>{formatNaira(deliveryFee)}</Text></Text>
      <Text style={styles.summary}>Total  <Text style={styles.amount}>{formatNaira(subtotal + deliveryFee)}</Text></Text>
      <AppButton label="Place order and pay" onPress={() => void checkout()} loading={busy} style={styles.cta} />
      <Text style={styles.disclaimer}>Payment details are entered on Paystack. Card information is never stored in Chow.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 20, paddingTop: 27 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800', marginBottom: 22 },
  caption: { color: colors.ink, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, backgroundColor: colors.white, color: colors.ink },
  payment: { borderRadius: 14, backgroundColor: colors.greenLight, padding: 14, color: colors.greenDark, fontSize: 13 },
  summary: { color: colors.muted, paddingVertical: 8 },
  amount: { color: colors.ink, fontWeight: '700' },
  cta: { marginTop: 24 },
  disclaimer: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 12 },
});
