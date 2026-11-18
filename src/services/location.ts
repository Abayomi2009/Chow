import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export async function startDriverLocationUpdates(driverId: string) {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Location permission was not granted.');
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
    async ({ coords }) => {
      const { error } = await supabase.from('driver_locations').upsert({
        driver_id: driverId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading,
        updated_at: new Date().toISOString(),
      });
      if (error) console.error('Unable to publish driver location:', error.message);
    },
  );
}
