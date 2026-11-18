import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { DeliveryMap } from '../components/DeliveryMap';
import { colors, formatNaira } from '../config/theme';
import { DeliveryOrder, DriverLocation, OrderStatus } from '../types';
import { getOrder, subscribeToDriver, subscribeToOrder } from '../services/orders';

const labels: Record<OrderStatus, string> = {
  pending: 'Finding a restaurant',
  accepted: 'Order confirmed',
  preparing: 'The kitchen is preparing your food',
  ready: 'Your order is ready',
  picked_up: 'Your courier is on the way',
  delivered: 'Delivered — enjoy!',
  cancelled: 'Order cancelled',
};
const previewOrder: DeliveryOrder = {
  id: 'CH-4821',
  status: 'picked_up',
  total: 10200,
  currency: 'NGN',
  restaurantName: 'The Green Bowl',
  createdAt: new Date().toISOString(),
  driverId: 'demo-driver',
  deliveryLatitude: 6.4312,
  deliveryLongitude: 3.4156,
};

export function TrackingScreen() {
  const params = useLocalSearchParams<{ orderId?: string; demo?: string }>();
  const orderId = params.orderId ?? '';
  const demo = params.demo === 'true';
  const [liveOrder, setLiveOrder] = useState<DeliveryOrder | null>(null);
  const order = demo ? previewOrder : liveOrder;
  const [driver, setDriver] = useState<DriverLocation | null>(demo ? {
    driverId: 'demo-driver', latitude: 6.432, longitude: 3.414, heading: 150, updatedAt: new Date().toISOString(),
  } : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demo || !orderId) return;
    const unsubscribe = subscribeToOrder(orderId, (change) => {
      setLiveOrder((current) => current ? { ...current, ...change } : current);
    });
    void getOrder(orderId).then((result) => {
      setLiveOrder(result);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load order.'));
    return () => {
      unsubscribe();
    };
  }, [demo, orderId]);
  const trackingError = error || (!demo && !orderId ? 'This tracking link is missing its order number.' : '');

  useEffect(() => {
    if (!order?.driverId || demo) return;
    return subscribeToDriver(order.driverId, (location) => setDriver({
      driverId: order.driverId!,
      ...location,
      heading: null,
      updatedAt: new Date().toISOString(),
    }));
  }, [demo, order?.driverId]);

  if (!order && !trackingError) return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      {trackingError ? <Text style={styles.error}>{trackingError}</Text> : null}
      {order ? <>
        <View style={styles.statusCard}>
          <Text style={styles.kicker}>ORDER {order.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.status}>{labels[order.status]}</Text>
          <Text style={styles.restaurant}>{order.restaurantName} · {formatNaira(order.total)}</Text>
        </View>
        <DeliveryMap driver={driver} />
        <View style={styles.steps}>
          {(['accepted', 'preparing', 'picked_up', 'delivered'] as OrderStatus[]).map((status, index) => {
            const progress: Record<OrderStatus, number> = {
              pending: -1,
              accepted: 0,
              preparing: 1,
              ready: 2,
              picked_up: 2,
              delivered: 3,
              cancelled: -1,
            };
            const done = index <= progress[order.status];
            return <View key={status} style={styles.step}><Text style={[styles.dot, done && styles.dotDone]}>{done ? '✓' : `${index + 1}`}</Text><Text style={styles.stepText}>{labels[status]}</Text></View>;
          })}
        </View>
        <Text style={styles.live}>{demo ? 'Sample tracking preview' : 'Live updates are enabled for this order.'}</Text>
      </> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 18, paddingTop: 22 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusCard: { backgroundColor: colors.greenDark, borderRadius: 22, padding: 20, marginBottom: 12 },
  kicker: { color: '#B9E0C8', fontWeight: '700', fontSize: 10, letterSpacing: 1.2 },
  status: { color: colors.white, fontSize: 21, fontWeight: '800', marginTop: 10 },
  restaurant: { color: '#D5E9DB', fontSize: 12, marginTop: 8 },
  steps: { backgroundColor: colors.white, borderRadius: 18, padding: 15, marginTop: 13 },
  step: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  dot: { width: 25, height: 25, textAlign: 'center', textAlignVertical: 'center', borderRadius: 14, overflow: 'hidden', backgroundColor: colors.border, color: colors.muted, fontWeight: '700', fontSize: 12 },
  dotDone: { backgroundColor: colors.greenLight, color: colors.greenDark },
  stepText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  live: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 14 },
  error: { color: colors.red, padding: 14, backgroundColor: colors.white, borderRadius: 14 },
});
