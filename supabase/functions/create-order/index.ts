import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';

interface RequestedLine {
  item: { id: string };
  quantity: number;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication is required.' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Server configuration is incomplete.' }, 500);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Your session is invalid or expired.' }, 401);

  let body: { restaurantId?: string; lines?: RequestedLine[]; address?: string; latitude?: number; longitude?: number };
  try { body = await request.json(); } catch { return json({ error: 'Request body must be valid JSON.' }, 400); }
  if (
    !body.restaurantId
    || !Array.isArray(body.lines)
    || body.lines.length < 1
    || body.lines.length > 30
    || typeof body.address !== 'string'
    || body.address.trim().length < 5
    || body.address.length > 300
    || typeof body.latitude !== 'number'
    || body.latitude < -90
    || body.latitude > 90
    || typeof body.longitude !== 'number'
    || body.longitude < -180
    || body.longitude > 180
  ) return json({ error: 'Restaurant, items, and a valid delivery address and location are required.' }, 400);
  if (body.lines.some((line) => !line?.item?.id || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 30)) {
    return json({ error: 'Each item must have a valid ID and a quantity between 1 and 30.' }, 400);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: restaurant, error: restaurantError } = await admin.from('restaurants')
    .select('id,delivery_fee,is_active').eq('id', body.restaurantId).eq('is_active', true).single();
  if (restaurantError || !restaurant) return json({ error: 'This restaurant is not available.' }, 404);
  const itemIds = [...new Set(body.lines.map((line) => line.item.id))];
  const { data: menu, error: menuError } = await admin.from('menu_items')
    .select('id,restaurant_id,name,price,is_available')
    .in('id', itemIds)
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true);
  if (menuError) return json({ error: 'Unable to validate menu items.' }, 500);
  const menuById = new Map((menu ?? []).map((item) => [item.id, item]));
  if (menuById.size !== itemIds.length) return json({ error: 'One or more items are unavailable.' }, 400);

  const entries = body.lines.map((line) => {
    const item = menuById.get(line.item.id)!;
    const unitPrice = Number(item.price);
    return { menu_item_id: item.id, item_name: item.name, unit_price: unitPrice, quantity: line.quantity, line_total: unitPrice * line.quantity };
  });
  const subtotal = entries.reduce((sum, item) => sum + item.line_total, 0);
  const deliveryFee = Number(restaurant.delivery_fee);
  const { data: order, error: orderError } = await admin.from('orders').insert({
    customer_id: userData.user.id,
    restaurant_id: restaurant.id,
    subtotal,
    delivery_fee: deliveryFee,
    total: subtotal + deliveryFee,
    delivery_address: body.address.trim(),
    delivery_latitude: body.latitude,
    delivery_longitude: body.longitude,
  }).select('id').single();
  if (orderError) return json({ error: 'Unable to create the order.' }, 500);
  const { error: linesError } = await admin.from('order_items').insert(entries.map((item) => ({ ...item, order_id: order.id })));
  if (linesError) {
    const { error: rollbackError } = await admin.from('orders').delete().eq('id', order.id);
    if (rollbackError) console.error('Order rollback failed:', rollbackError.message);
    return json({ error: 'Unable to save the order items.' }, 500);
  }
  return json({ orderId: order.id }, 201);
});
