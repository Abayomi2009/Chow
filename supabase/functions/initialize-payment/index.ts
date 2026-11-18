import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const authorization = request.headers.get('Authorization');
  if (!authorization) return json({ error: 'Authentication is required.' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY');
  const callbackUrl = Deno.env.get('PAYSTACK_CALLBACK_URL');
  if (!url || !anonKey || !serviceKey || !paystackSecret || !callbackUrl) return json({ error: 'Payment server configuration is incomplete.' }, 500);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user?.email) return json({ error: 'A signed-in account with a verified email is required for payment.' }, 401);
  let body: { orderId?: string };
  try { body = await request.json(); } catch { return json({ error: 'Request body must be valid JSON.' }, 400); }
  if (!body.orderId) return json({ error: 'Order ID is required.' }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error: orderError } = await admin.from('orders')
    .select('id,customer_id,total,payment_status')
    .eq('id', body.orderId)
    .eq('customer_id', userData.user.id)
    .single();
  if (orderError || !order) return json({ error: 'Order not found.' }, 404);
  if (order.payment_status === 'paid') return json({ error: 'This order has already been paid.' }, 409);

  const reference = `chow_${order.id.replaceAll('-', '')}_${crypto.randomUUID().replaceAll('-', '')}`;
  const { error: pendingError } = await admin.from('orders').update({
    payment_reference: reference,
    payment_status: 'pending',
  }).eq('id', order.id);
  if (pendingError) return json({ error: 'Unable to prepare payment.' }, 500);

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${paystackSecret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: userData.user.email,
      amount: Math.round(Number(order.total) * 100),
      currency: 'NGN',
      reference,
      callback_url: callbackUrl,
      metadata: { order_id: order.id, user_id: userData.user.id },
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.status || !result.data?.authorization_url) {
    const { error: updateError } = await admin.from('orders').update({ payment_status: 'failed' }).eq('id', order.id);
    if (updateError) console.error('Unable to mark payment as failed:', updateError.message);
    return json({ error: 'Payment provider could not initialize checkout.' }, 502);
  }
  return json({ authorizationUrl: result.data.authorization_url, reference });
});
