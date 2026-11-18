import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';

function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  if (leftBytes.length !== rightBytes.length) return false;
  let mismatch = 0;
  for (let index = 0; index < leftBytes.length; index += 1) mismatch |= leftBytes[index] ^ rightBytes[index];
  return mismatch === 0;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const webhookSecret = Deno.env.get('ORDER_WEBHOOK_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const suppliedSecret = request.headers.get('x-order-webhook-secret') ?? '';
  if (!webhookSecret || !constantTimeEqual(webhookSecret, suppliedSecret)) return json({ error: 'Unauthorized.' }, 401);
  if (!url || !serviceKey) return json({ error: 'Server configuration is incomplete.' }, 500);

  let payload: {
    type?: string;
    record?: { id?: string; customer_id?: string; driver_id?: string | null; status?: string };
    old_record?: { status?: string };
  };
  try { payload = await request.json(); } catch { return json({ error: 'Invalid webhook payload.' }, 400); }
  const order = payload.record;
  if (payload.type !== 'UPDATE' || !order?.id || !order.customer_id || !order.status) return json({ received: true });
  if (payload.old_record?.status === order.status) return json({ received: true });

  const statusText: Record<string, string> = {
    accepted: 'The restaurant confirmed your order.',
    preparing: 'The kitchen is preparing your order.',
    ready: 'Your order is ready for pickup.',
    picked_up: 'Your courier is on the way.',
    delivered: 'Your order has been delivered.',
    cancelled: 'Your order was cancelled.',
  };
  const message = statusText[order.status];
  if (!message) return json({ received: true });
  const recipientIds = [...new Set([order.customer_id, order.driver_id].filter((id): id is string => Boolean(id)))];
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: tokens, error } = await admin.from('push_tokens').select('token').in('user_id', recipientIds);
  if (error) return json({ error: 'Unable to load notification recipients.' }, 500);
  if (!tokens.length) return json({ received: true, sent: 0 });

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(tokens.map(({ token }) => ({
      to: token,
      title: 'Chow order update',
      body: message,
      sound: 'default',
      channelId: 'orders',
      priority: 'high',
      data: { orderId: order.id },
    }))),
  });
  if (!response.ok) return json({ error: 'Push notification provider returned an error.' }, 502);
  return json({ received: true, sent: tokens.length });
});
