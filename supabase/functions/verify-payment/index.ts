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
  if (!url || !anonKey || !serviceKey || !paystackSecret) return json({ error: 'Payment server configuration is incomplete.' }, 500);

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Your session is invalid or expired.' }, 401);
  let body: { orderId?: string };
  try { body = await request.json(); } catch { return json({ error: 'Request body must be valid JSON.' }, 400); }
  if (!body.orderId) return json({ error: 'Order ID is required.' }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error: orderError } = await admin.from('orders')
    .select('id,customer_id,total,payment_status,payment_reference')
    .eq('id', body.orderId)
    .eq('customer_id', userData.user.id)
    .single();
  if (orderError || !order) return json({ error: 'Order not found.' }, 404);
  if (order.payment_status === 'paid') return json({ paid: true, status: 'success' });
  if (!order.payment_reference || order.payment_status !== 'pending') return json({ paid: false, status: order.payment_status });

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(order.payment_reference)}`, {
    headers: { Authorization: `Bearer ${paystackSecret}` },
  });
  const result = await response.json();
  if (!response.ok || !result.status) return json({ error: 'Payment provider could not verify this transaction.' }, 502);
  const transaction = result.data;
  if (transaction.status !== 'success') return json({ paid: false, status: transaction.status ?? 'pending' });
  if (transaction.currency !== 'NGN' || Math.round(Number(order.total) * 100) !== transaction.amount) {
    return json({ error: 'Payment details do not match this order.' }, 400);
  }
  const { error: updateError } = await admin.from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', order.id)
    .eq('payment_status', 'pending');
  if (updateError) return json({ error: 'Unable to confirm payment.' }, 500);
  return json({ paid: true, status: transaction.status });
});
