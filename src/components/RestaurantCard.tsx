import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Restaurant } from '../types';
import { colors, formatNaira } from '../config/theme';

interface RestaurantCardProps {
  restaurant: Restaurant;
  favorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

export function RestaurantCard({ restaurant, favorite, onPress, onToggleFavorite }: RestaurantCardProps) {
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${restaurant.name} menu`} onPress={onPress}>
        <View>
          <Image source={{ uri: restaurant.imageUrl }} style={styles.image} />
          <View style={styles.imageTag}><Text style={styles.imageTagText}>POPULAR NEAR YOU</Text></View>
        </View>
        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.rating}>★ {restaurant.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.category}>{restaurant.category}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{restaurant.deliveryMinutes} min</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>{formatNaira(restaurant.deliveryFee)} delivery</Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? `Remove ${restaurant.name} from saved restaurants` : `Save ${restaurant.name}`}
        accessibilityState={{ selected: favorite }}
        onPress={onToggleFavorite}
        style={styles.favorite}
      >
        <Text style={[styles.heart, favorite && styles.heartActive]}>{favorite ? '♥' : '♡'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 21, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', height: 164, backgroundColor: colors.greenLight },
  imageTag: { position: 'absolute', bottom: 11, left: 12, backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  imageTagText: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  info: { paddingHorizontal: 15, paddingVertical: 14, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800', flexShrink: 1, paddingRight: 8 },
  rating: { color: colors.ink, fontWeight: '700', fontSize: 12, backgroundColor: '#FFF5E8', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9 },
  category: { color: colors.muted, fontSize: 13 },
  metaRow: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 3 },
  meta: { color: colors.greenDark, fontSize: 12, fontWeight: '700' },
  metaDot: { color: colors.muted },
  favorite: { position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  heart: { color: colors.ink, fontSize: 24, lineHeight: 28 },
  heartActive: { color: colors.red },
});
