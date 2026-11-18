import { supabase } from '../lib/supabase';
import { MenuItem, Restaurant } from '../types';

export async function listRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase.from('restaurants')
    .select('id,name,category,rating,delivery_minutes,delivery_fee,image_url,latitude,longitude')
    .eq('is_active', true)
    .order('rating', { ascending: false });
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    rating: Number(row.rating),
    deliveryMinutes: row.delivery_minutes,
    deliveryFee: Number(row.delivery_fee),
    imageUrl: row.image_url,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  }));
}

export async function listMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase.from('menu_items')
    .select('id,restaurant_id,name,description,price,image_url')
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true)
    .order('name');
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    imageUrl: row.image_url,
  }));
}
