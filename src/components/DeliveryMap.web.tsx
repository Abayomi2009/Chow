import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { restaurants as defaultRestaurants } from '../data/seed';
import { colors } from '../config/theme';
import { DriverLocation, Restaurant } from '../types';

export function DeliveryMap({
  driver,
  restaurants: nearbyRestaurants,
}: {
  driver?: DriverLocation | null;
  restaurants?: Restaurant[];
}) {
  const [linkError, setLinkError] = useState('');
  const locations = nearbyRestaurants ?? defaultRestaurants;

  const openLocation = async (restaurant: Restaurant) => {
    try {
      const url = `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`;
      await Linking.openURL(url);
      setLinkError('');
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Could not open this location.');
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Lagos Island</Text>
        <Text style={styles.caption}>RESTAURANT LOCATIONS</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {locations.map((restaurant) => (
          <Pressable
            key={restaurant.id}
            accessibilityRole="link"
            onPress={() => void openLocation(restaurant)}
            style={styles.location}
          >
            <Text style={styles.pin}>●</Text>
            <View style={styles.details}>
              <Text style={styles.name}>{restaurant.name}</Text>
              <Text style={styles.category}>{restaurant.category}</Text>
            </View>
            <Text style={styles.arrow}>↗</Text>
          </Pressable>
        ))}
        {driver ? (
          <Text style={styles.driver}>
            Courier location: {driver.latitude.toFixed(3)}, {driver.longitude.toFixed(3)}
          </Text>
        ) : null}
      </ScrollView>
      {linkError ? <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#eaf0e9',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  title: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  caption: { color: colors.green, fontWeight: '800', fontSize: 9, letterSpacing: 0.6 },
  list: { padding: 8 },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 9,
    marginBottom: 6,
  },
  pin: { color: colors.green, fontSize: 14, paddingHorizontal: 6 },
  details: { flex: 1 },
  name: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  category: { color: colors.muted, fontSize: 10, marginTop: 2 },
  arrow: { color: colors.green, fontSize: 16, paddingHorizontal: 6 },
  driver: { color: colors.greenDark, fontSize: 11, padding: 8 },
  error: { color: colors.red, backgroundColor: colors.white, padding: 6, fontSize: 11 },
});
