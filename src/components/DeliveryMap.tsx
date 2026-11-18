import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { restaurants } from '../data/seed';
import { DriverLocation, Restaurant } from '../types';
import { colors } from '../config/theme';
import { mapStyle } from '../config/mapStyle';

const lagos: Region = {
  latitude: 6.4281,
  longitude: 3.4219,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

export function DeliveryMap({ driver, restaurants: nearbyRestaurants }: { driver?: DriverLocation | null; restaurants?: Restaurant[] }) {
  const [region, setRegion] = useState(lagos);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          setLocationError('Location access is off. Showing restaurants around Lagos Island.');
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        if (active) setRegion((current) => ({ ...current, latitude: location.coords.latitude, longitude: location.coords.longitude }));
      } catch {
        if (active) setLocationError('Your location is unavailable. Showing restaurants around Lagos Island.');
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <View style={styles.wrap}>
      <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={region} customMapStyle={mapStyle} showsUserLocation showsMyLocationButton>
        {(nearbyRestaurants ?? restaurants).map((restaurant) => (
          <Marker
            key={restaurant.id}
            coordinate={{ latitude: restaurant.latitude, longitude: restaurant.longitude }}
            title={restaurant.name}
            description={restaurant.category}
            pinColor={colors.green}
          />
        ))}
        {driver && (
          <Marker coordinate={{ latitude: driver.latitude, longitude: driver.longitude }} title="Your courier" description="Live driver location" pinColor="#E58A21" />
        )}
      </MapView>
      <View pointerEvents="none" style={styles.badge}><Text style={styles.badgeText}>●  Delivering around you</Text></View>
      {locationError ? <Text style={styles.notice}>{locationError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 220, borderRadius: 22, overflow: 'hidden', backgroundColor: '#eaf0e9', marginVertical: 8 },
  map: { flex: 1 },
  badge: { position: 'absolute', top: 12, left: 12, backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: colors.greenDark, fontWeight: '700', fontSize: 12 },
  notice: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, color: colors.muted, padding: 6, fontSize: 11 },
});
