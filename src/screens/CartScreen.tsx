import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '../components/AppButton';
import { colors, formatNaira } from '../config/theme';
import { useAppStore } from '../store/useAppStore';

export function CartScreen() {
  const router = useRouter();
  const cart = useAppStore((state) => state.cart);
  const add = useAppStore((state) => state.addToCart);
  const remove = useAppStore((state) => state.removeFromCart);
  const subtotal = cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{cart.length ? 'Ready when you are.' : 'Your bag is waiting.'}</Text>
      {cart.map(({ item, quantity }) => (
        <View key={item.id} style={styles.line}>
          <View style={styles.product}><Text style={styles.name}>{item.name}</Text><Text style={styles.price}>{formatNaira(item.price)}</Text></View>
          <View style={styles.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${item.name}`} onPress={() => remove(item.id)} hitSlop={8}><Text style={styles.step}>−</Text></Pressable>
            <Text accessibilityLabel={`Quantity ${quantity}`} style={styles.qty}>{quantity}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`} onPress={() => add(item)} hitSlop={8}><Text style={styles.step}>+</Text></Pressable>
          </View>
        </View>
      ))}
      {cart.length === 0 ? <Text style={styles.empty}>Add a meal from a nearby restaurant and it will show up here.</Text> : (
        <>
          <View style={styles.total}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>{formatNaira(subtotal)}</Text></View>
          <Text style={styles.delivery}>Delivery and service fees are calculated at checkout.</Text>
          <AppButton label="Continue to checkout" onPress={() => router.push('/checkout')} style={styles.cta} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: 20, paddingTop: 26 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', marginBottom: 16 },
  line: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 16, padding: 15, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  product: { flex: 1 },
  name: { color: colors.ink, fontWeight: '700' },
  price: { color: colors.muted, marginTop: 5 },
  stepper: { flexDirection: 'row', gap: 13, alignItems: 'center', backgroundColor: colors.greenLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  step: { color: colors.greenDark, fontWeight: '800', fontSize: 18 },
  qty: { color: colors.ink, fontWeight: '700' },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: 17, marginTop: 10 },
  totalLabel: { color: colors.ink, fontWeight: '600' },
  totalValue: { color: colors.ink, fontWeight: '800' },
  delivery: { color: colors.muted, fontSize: 12, marginTop: 8 },
  cta: { marginTop: 20 },
  empty: { color: colors.muted, lineHeight: 22, marginTop: 5 },
});
