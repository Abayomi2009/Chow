import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, formatNaira } from '../config/theme';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { OrderStatus } from '../types';

interface Metrics {
  orders: number;
  pending: number;
  revenue: number;
}

interface AdminOrder {
  id: string;
  status: OrderStatus;
  total: number;
  paymentStatus: string;
  driverId: string | null;
  createdAt: string;
}

interface Driver {
  id: string;
  full_name: string;
}

type AccessState = 'checking' | 'allowed' | 'denied';

export function AdminScreen() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>('checking');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [message, setMessage] = useState('Checking your admin access…');

  useEffect(() => {
    let active = true;
    let checkVersion = 0;

    const denyAccess = (reason: string) => {
      if (!active) return;
      setAccess('denied');
      setMessage(reason);
      setMetrics(null);
      setOrders([]);
      setDrivers([]);
    };

    const checkAccess = async () => {
      const currentVersion = ++checkVersion;
      const isCurrent = () => active && checkVersion === currentVersion;
      setAccess('checking');
      setMetrics(null);
      setOrders([]);
      setDrivers([]);
      setLoadingData(false);
      setMessage('Checking your admin access…');
      if (!isSupabaseConfigured) {
        denyAccess('Admin access requires a configured Supabase project and an approved admin account.');
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!isCurrent()) return;
      if (userError) { denyAccess(userError.message); return; }
      if (!userData.user) { denyAccess('Sign in using an approved admin account to view operations.'); return; }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', userData.user.id).single();
      if (!isCurrent()) return;
      if (profileError) { denyAccess(profileError.message); return; }
      if (profile.role !== 'admin') { denyAccess('Access denied. This screen is available to approved admin accounts only.'); return; }

      setAccess('allowed');
      setLoadingData(true);
      const [
        { data: orderRows, error },
        { data: driverRows, error: driverError },
        { data: summaryRows, error: summaryError },
      ] = await Promise.all([
        supabase.from('orders').select('id,total,status,payment_status,driver_id,created_at').order('created_at', { ascending: false }).limit(25),
        supabase.from('profiles').select('id,full_name').eq('role', 'driver'),
        supabase.rpc('admin_dashboard_metrics'),
      ]);
      if (!isCurrent()) return;
      if (error) { setMessage(error.message); setLoadingData(false); return; }
      if (driverError) { setMessage(driverError.message); setLoadingData(false); return; }
      if (summaryError) { setMessage(summaryError.message); setLoadingData(false); return; }
      const summary = summaryRows[0];
      if (!summary) { setMessage('Admin metrics were not returned by Supabase.'); setLoadingData(false); return; }
      setOrders(orderRows.map((order) => ({
        id: order.id,
        status: order.status,
        total: Number(order.total),
        paymentStatus: order.payment_status,
        driverId: order.driver_id,
        createdAt: order.created_at,
      })));
      setDrivers(driverRows);
      setMetrics({
        orders: Number(summary.total_orders),
        pending: Number(summary.pending_orders),
        revenue: Number(summary.delivered_revenue),
      });
      setMessage('Live order operations overview');
      setLoadingData(false);
    };

    const checkAccessSafely = () => {
      void checkAccess().catch((error: unknown) => {
        if (active) denyAccess(error instanceof Error ? error.message : 'Could not verify admin access.');
      });
    };

    checkAccessSafely();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        checkVersion += 1;
        denyAccess('Sign in using an approved admin account to view operations.');
      } else if (event === 'SIGNED_IN') {
        void Promise.resolve().then(checkAccessSafely);
      }
    });
    return () => {
      active = false;
      checkVersion += 1;
      subscription.unsubscribe();
    };
  }, []);

  const updateOrder = async (orderId: string, changes: { status?: OrderStatus; driver_id?: string | null }) => {
    setBusyOrder(orderId);
    const { error } = await supabase.from('orders').update(changes).eq('id', orderId);
    if (error) {
      Alert.alert('Could not update order', error.message);
    } else {
      setOrders((current) => current.map((order) => order.id === orderId
        ? { ...order, status: changes.status ?? order.status, driverId: changes.driver_id === undefined ? order.driverId : changes.driver_id }
        : order));
      if (changes.status) {
        const order = orders.find((item) => item.id === orderId);
        if (order) setMetrics((current) => current ? {
          ...current,
          pending: current.pending
            + (['accepted', 'preparing'].includes(changes.status!) ? 1 : 0)
            - (['accepted', 'preparing'].includes(order.status) ? 1 : 0),
          revenue: current.revenue
            + (changes.status === 'delivered' ? order.total : 0)
            - (order.status === 'delivered' ? order.total : 0),
        } : current);
      }
    }
    setBusyOrder(null);
  };

  const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
    pending: 'accepted',
    accepted: 'preparing',
    preparing: 'ready',
  };

  if (access === 'checking') {
    return <View style={styles.accessPage}>
      <ActivityIndicator color={colors.green} />
      <Text style={styles.accessTitle}>Verifying access</Text>
      <Text style={styles.accessMessage}>{message}</Text>
    </View>;
  }

  if (access === 'denied') {
    return <View style={styles.accessPage}>
      <Text style={styles.accessTitle}>Admin access required</Text>
      <Text style={styles.accessMessage}>{message}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.homeButton}>
        <Text style={styles.homeButtonText}>Back to Chow</Text>
      </Pressable>
    </View>;
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View><Text style={styles.title}>Operations</Text><Text style={styles.caption}>{message}</Text></View>
      </View>
      {loadingData ? <ActivityIndicator color={colors.green} style={styles.spinner} /> : null}
      {metrics ? <View style={styles.grid}>
        <Metric label="All orders" value={String(metrics.orders)} />
        <Metric label="In progress" value={String(metrics.pending)} />
        <Metric label="Delivered revenue" value={formatNaira(metrics.revenue)} />
      </View> : null}
      {metrics ? <View style={styles.orders}>
        <Text style={styles.panelTitle}>Recent orders</Text>
        {orders.map((order) => {
          const next = nextStatus[order.status];
          const assignedDriver = drivers.find((driver) => driver.id === order.driverId);
          return (
            <View key={order.id} style={styles.orderCard}>
              <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()} · {formatNaira(order.total)}</Text>
              <Text style={styles.panelText}>{order.status.replace('_', ' ')} · {order.paymentStatus} · {new Date(order.createdAt).toLocaleString()}</Text>
              <Text style={styles.panelText}>{assignedDriver ? `Courier: ${assignedDriver.full_name || 'Courier'}` : 'No courier assigned'}</Text>
              <View style={styles.actions}>
                {drivers.length > 0 && order.paymentStatus === 'paid' ? <Pressable disabled={!isSupabaseConfigured} onPress={() => Alert.alert('Assign a courier', 'Choose an approved courier for this order.', [
                  ...drivers.map((driver) => ({
                    text: driver.full_name || 'Courier',
                    onPress: () => void updateOrder(order.id, { driver_id: driver.id }),
                  })),
                  { text: 'Cancel', style: 'cancel' as const },
                ])}><Text style={styles.actionText}>{order.driverId ? 'Reassign' : 'Assign courier'}</Text></Pressable> : null}
                {next && (next !== 'accepted' || order.paymentStatus === 'paid') ? <Pressable disabled={!isSupabaseConfigured || busyOrder === order.id} onPress={() => void updateOrder(order.id, { status: next })}><Text style={[styles.actionText, !isSupabaseConfigured && styles.disabledAction]}>{busyOrder === order.id ? 'Saving…' : `Mark ${next}`}</Text></Pressable> : null}
                {next === 'accepted' && order.paymentStatus !== 'paid' ? <Text style={styles.panelText}>Awaiting payment</Text> : null}
              </View>
            </View>
          );
        })}
        {!orders.length ? <Text style={styles.panelText}>No orders yet.</Text> : null}
      </View> : null}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Operations tools</Text>
        <Text style={styles.panelText}>Manage restaurant listings, approve courier profiles, and monitor current orders from your secured Supabase project.</Text>
        <Text style={styles.panelText}>Admin access is enforced by database row-level security; never expose the Supabase service-role key in the app.</Text>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  accessPage: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, padding: 28 },
  accessTitle: { color: colors.ink, fontSize: 21, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  accessMessage: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  homeButton: { backgroundColor: colors.green, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13, marginTop: 20 },
  homeButtonText: { color: colors.white, fontWeight: '800' },
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 20, paddingTop: 24 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  caption: { color: colors.muted, fontSize: 13, marginTop: 7 },
  spinner: { marginTop: 30 },
  grid: { gap: 12, marginTop: 20 },
  orders: { marginTop: 23, gap: 10 },
  orderCard: { backgroundColor: colors.white, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1, borderColor: colors.border },
  orderId: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  actionText: { color: colors.green, fontWeight: '800', fontSize: 12 },
  disabledAction: { color: colors.muted },
  metric: { backgroundColor: colors.white, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border },
  metricValue: { color: colors.greenDark, fontSize: 23, fontWeight: '800' },
  metricLabel: { color: colors.muted, marginTop: 5, fontSize: 12 },
  panel: { padding: 18, backgroundColor: colors.greenLight, borderRadius: 18, marginTop: 22, gap: 10 },
  panelTitle: { color: colors.greenDark, fontWeight: '800', fontSize: 16 },
  panelText: { color: colors.greenDark, fontSize: 12, lineHeight: 18 },
});
