import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { AppButton } from '../components/AppButton';
import { DeliveryMap } from '../components/DeliveryMap';
import { colors } from '../config/theme';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { startDriverLocationUpdates } from '../services/location';
import { OrderStatus } from '../types';

interface DeliveryTask {
  id: string;
  status: OrderStatus;
  delivery_address: string;
}

export function DriverScreen() {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState('Sign in with a courier account to start sharing your location.');
  const [busy, setBusy] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const [tasks, setTasks] = useState<DeliveryTask[]>([]);

  useEffect(() => {
    let active = true;
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) { if (active) setMessage(error.message); return; }
      if (!data.user) return;
      const id = data.user.id;
      if (active) setDriverId(id);
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', id).single();
      if (profileError) { if (active) setMessage(profileError.message); return; }
      if (profile.role !== 'driver') {
        if (active) setMessage('Sign in using an approved courier account to receive assignments.');
        return;
      }
      orderChannel = supabase.channel(`driver-orders-${id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, ({ new: row }) => {
          const task = row as DeliveryTask & { driver_id: string | null };
          if (!task.id) return;
          setTasks((current) => {
            if (task.driver_id === id && ['ready', 'picked_up'].includes(task.status)) {
              const next = { id: task.id, status: task.status, delivery_address: task.delivery_address };
              return current.some((item) => item.id === task.id)
                ? current.map((item) => item.id === task.id ? next : item)
                : [...current, next];
            }
            return current.filter((item) => item.id !== task.id);
          });
        })
        .subscribe();
      const { data: assignments, error: assignmentError } = await supabase.from('orders')
        .select('id,status,delivery_address')
        .eq('driver_id', id)
        .in('status', ['ready', 'picked_up']);
      if (assignmentError) { if (active) setMessage(assignmentError.message); return; }
      if (active) {
        setTasks(assignments);
        setMessage('Courier account ready. Your location is shared only while this screen is open.');
      }
    })();
    return () => {
      active = false;
      if (orderChannel) void supabase.removeChannel(orderChannel);
    };
  }, []);

  useEffect(() => {
    return () => { subscription.current?.remove(); };
  }, []);

  const toggleSharing = async () => {
    if (!driverId) {
      Alert.alert('Sign in required', 'Sign in using an account with the courier role.');
      return;
    }
    if (sharing) {
      subscription.current?.remove();
      subscription.current = null;
      setSharing(false);
      setMessage('Location sharing paused.');
      return;
    }
    setBusy(true);
    try {
      subscription.current = await startDriverLocationUpdates(driverId);
      setSharing(true);
      setMessage('Location permission granted. Keep Chow open while completing a delivery to publish updates.');
      Alert.alert('Location ready', 'Foreground updates are enabled while you use the app.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start location sharing.');
    } finally {
      setBusy(false);
    }
  };

  const completeTaskStep = async (task: DeliveryTask) => {
    const status: OrderStatus = task.status === 'ready' ? 'picked_up' : 'delivered';
    const { error } = await supabase.from('orders').update({ status }).eq('id', task.id);
    if (error) {
      Alert.alert('Could not update delivery', error.message);
      return;
    }
    if (status === 'delivered') setTasks((current) => current.filter((item) => item.id !== task.id));
    else setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
  };

  if (!isSupabaseConfigured) return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.demoHeader}><View><Text style={styles.title}>Your deliveries</Text><Text style={styles.text}>See what a courier shift looks like.</Text></View><View style={styles.demoBadge}><Text style={styles.demoBadgeText}>DEMO</Text></View></View>
      <DeliveryMap driver={{ driverId: 'demo-driver', latitude: 6.432, longitude: 3.414, heading: 150, updatedAt: new Date().toISOString() }} />
      <View style={styles.card}>
        <Text style={styles.taskKicker}>READY FOR PICKUP</Text>
        <Text style={styles.cardTitle}>Order #CH-2026-00481</Text>
        <Text style={styles.text}>Victoria Island, Lagos · 1.8 km away</Text>
        <AppButton label="Confirm pickup" disabled onPress={() => undefined} style={styles.taskButton} />
      </View>
      <View style={styles.card}><Text style={styles.cardTitle}>Your location stays yours</Text><Text style={styles.text}>Couriers control when location is shared. Go online to securely send updates during an active delivery.</Text></View>
      <Text style={styles.disclaimer}>Sample assignment · Connect Supabase and sign in as an approved courier to go online.</Text>
    </ScrollView>
  );
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your deliveries</Text>
      <Text style={styles.text}>{message}</Text>
      <DeliveryMap />
      {tasks.map((task) => (
        <View key={task.id} style={styles.card}>
          <Text style={styles.cardTitle}>Order #{task.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.text}>{task.delivery_address}</Text>
          <Text style={styles.text}>{task.status === 'ready' ? 'Ready for pickup' : 'On the way to customer'}</Text>
          <AppButton label={task.status === 'ready' ? 'Confirm pickup' : 'Confirm delivery'} onPress={() => void completeTaskStep(task)} style={styles.taskButton} />
        </View>
      ))}
      <View style={styles.card}><Text style={styles.cardTitle}>{sharing ? 'Location sharing active' : 'Go online for deliveries'}</Text><Text style={styles.text}>Live location updates are sent to active order tracking screens.</Text></View>
      <AppButton label={sharing ? 'Pause location sharing' : 'Start location sharing'} onPress={() => void toggleSharing()} loading={busy} />
      <Text style={styles.disclaimer}>Location is collected only with foreground permission. Background tracking requires an explicit app configuration and store disclosures.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', padding: 20, paddingTop: 24 },
  demoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  demoBadge: { backgroundColor: '#FFF0D9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  demoBadgeText: { color: '#88540E', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  taskKicker: { color: colors.green, fontWeight: '800', fontSize: 10, letterSpacing: 0.8, marginBottom: 8 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  text: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: colors.white, padding: 16, borderRadius: 18, marginVertical: 12, borderWidth: 1, borderColor: colors.border },
  taskButton: { marginTop: 13 },
  cardTitle: { color: colors.ink, fontWeight: '800', fontSize: 16, marginBottom: 6 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 15 },
});
