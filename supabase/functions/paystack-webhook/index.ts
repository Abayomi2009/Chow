import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/http.ts';

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const secret = Deno.env.get('PAYSTACK_SECRET_KEY');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !url || !serviceKey) return json({ error: 'Webhook configuration is incomplete.' }, 500);
  const signature = request.headers.get('x-paystack-signature');
  if (!signature) return json({ error: 'Missing signature.' }, 401);
  const rawBody = await request.text();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const expected = toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))));
  if (expected.length !== signature.length) return json({ error: 'Invalid signature.' }, 401);
  const expectedBytes = new TextEncoder().encode(expected);
  const providedBytes = new TextEncoder().encode(signature);
  let mismatch = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) mismatch |= expectedBytes[index] ^ providedBytes[index];
  if (mismatch !== 0) return json({ error: 'Invalid signature.' }, 401);

  let event: { event?: string; data?: { reference?: string; amount?: number; currency?: string; status?: string } };
  try { event = JSON.parse(rawBody); } catch { return json({ error: 'Invalid event body.' }, 400); }
  if (event.event !== 'charge.success') return json({ received: true });
  const reference = event.data?.reference;
  if (!reference || event.data?.status !== 'success' || event.data.currency !== 'NGN') {
    return json({ error: 'Payment event is incomplete.' }, 400);
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error } = await admin.from('orders')
    .select('id,total,payment_status')
    .eq('payment_reference', reference)
    .single();
  if (error || !order) return json({ error: 'Payment reference not found.' }, 404);
  if (Math.round(Number(order.total) * 100) !== event.data.amount) return json({ error: 'Payment amount does not match the order.' }, 400);
  if (order.payment_status === 'paid') return json({ received: true });
  const { error: updateError } = await admin.from('orders')
    .update({ payment_status: 'paid' })
    .eq('id', order.id)
    .eq('payment_status', 'pending');
  if (updateError) return json({ error: 'Unable to confirm payment.' }, 500);
  return json({ received: true });
});
