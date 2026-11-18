import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';

export async function payForOrder(orderId: string) {
  const { data, error } = await supabase.functions.invoke('initialize-payment', {
    body: { orderId },
  });
  if (error) throw error;
  if (!data?.authorizationUrl) throw new Error('Payment provider did not return a checkout URL.');
  const result = await WebBrowser.openBrowserAsync(data.authorizationUrl);
  return { ...data, browserResult: result };
}

export async function verifyOrderPayment(orderId: string) {
  const { data, error } = await supabase.functions.invoke('verify-payment', {
    body: { orderId },
  });
  if (error) throw error;
  return data as { paid: boolean; status: string };
}
