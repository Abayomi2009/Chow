import { CartLine, DeliveryOrder } from '../types';
import { supabase } from '../lib/supabase';

export async function createOrder(input: {
  restaurantId: string;
  lines: CartLine[];
  address: string;
  latitude: number;
  longitude: number;
}) {
  const { data, error } = await supabase.functions.invoke('create-order', { body: input });
  if (error) throw error;
  return data as { orderId: string };
}

export async function getOrder(orderId: string): Promise<DeliveryOrder> {
  const { data, error } = await supabase
    .from('orders')
    .select('id,status,total,currency,created_at,driver_id,delivery_latitude,delivery_longitude,restaurants(name)')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  const restaurant = data.restaurants as unknown as { name: string };
  return {
    id: data.id,
    status: data.status,
    total: Number(data.total),
    currency: data.currency,
    restaurantName: restaurant.name,
    createdAt: data.created_at,
    driverId: data.driver_id,
    deliveryLatitude: Number(data.delivery_latitude),
    deliveryLongitude: Number(data.delivery_longitude),
  };
}

export function subscribeToOrder(orderId: string, onUpdate: (order: Partial<DeliveryOrder>) => void) {
  const channel = supabase
    .channel(`order-${orderId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: `id=eq.${orderId}`,
    }, ({ new: row }) => onUpdate({ status: row.status, driverId: row.driver_id }))
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function subscribeToDriver(driverId: string, onUpdate: (location: { latitude: number; longitude: number }) => void) {
  const channel = supabase
    .channel(`driver-${driverId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'driver_locations',
      filter: `driver_id=eq.${driverId}`,
    }, ({ new: row }) => onUpdate({ latitude: Number(row.latitude), longitude: Number(row.longitude) }))
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
