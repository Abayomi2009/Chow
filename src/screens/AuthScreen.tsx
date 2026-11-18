import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { AppButton } from '../components/AppButton';
import { colors } from '../config/theme';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { signInWithEmail, signUpWithEmail, sendPhoneOtp, verifyPhoneOtp, signOut } from '../services/auth';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    void supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setHasSession(Boolean(data.session));
      })
      .catch((error: unknown) => {
        if (active) Alert.alert('Could not load your account', error instanceof Error ? error.message : 'Please try again.');
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try { await action(); Alert.alert('You’re all set', 'Your account action completed successfully.'); }
    catch (error) { Alert.alert('Could not authenticate', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{mode === 'signIn' ? 'Welcome back' : 'Create your account'}</Text>
      {mode === 'signUp' ? <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" /> : null}
      <TextInput style={styles.input} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      <AppButton label={mode === 'signIn' ? 'Sign in with email' : 'Create account'} loading={busy} onPress={() => void run(() => mode === 'signIn' ? signInWithEmail(email, password) : signUpWithEmail(email, password, name))} />
      <Text style={styles.switch} onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>{mode === 'signIn' ? 'New to Chow? Create an account' : 'Already registered? Sign in'}</Text>
      <Text style={styles.section}>Or continue with phone</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextInput style={styles.input} placeholder="+2348012345678" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <AppButton label="Send verification code" secondary loading={busy} onPress={() => void run(() => sendPhoneOtp(phone, name))} />
      <TextInput style={styles.input} placeholder="SMS verification code" value={otp} onChangeText={setOtp} keyboardType="number-pad" />
      <AppButton label="Verify phone" secondary loading={busy} onPress={() => void run(() => verifyPhoneOtp(phone, otp, name))} />
      {hasSession ? <AppButton label="Sign out" secondary loading={busy} onPress={() => void run(signOut)} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', padding: 20, paddingTop: 28, gap: 12 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800', marginBottom: 8 },
  input: { backgroundColor: colors.white, color: colors.ink, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  switch: { color: colors.green, textAlign: 'center', fontWeight: '700', padding: 12 },
  section: { color: colors.ink, fontWeight: '800', marginTop: 12 },
});
