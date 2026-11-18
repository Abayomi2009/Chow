import { supabase } from '../lib/supabase';

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const name = fullName.trim();
  if (!name) throw new Error('Enter your full name to create an account.');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  return data;
}

export async function sendPhoneOtp(phone: string, fullName: string) {
  const name = fullName.trim();
  if (!name) throw new Error('Enter your full name to continue with your phone number.');

  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
    options: { data: { full_name: name } },
  });
  if (error) throw error;
  return data;
}

export async function verifyPhoneOtp(phone: string, token: string, fullName: string) {
  const name = fullName.trim();
  if (!name) throw new Error('Enter your full name to verify your phone number.');

  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: name })
      .eq('id', data.user.id);
    if (profileError) throw profileError;
  }
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
