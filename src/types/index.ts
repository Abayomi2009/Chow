export type AppRole = 'customer' | 'driver' | 'admin';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'delivered'
  | 'cancelled';

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  rating: number;
  deliveryMinutes: number;
  deliveryFee: number;
  imageUrl: string;
  latitude: number;
  longitude: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

export interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  updatedAt: string;
}

export interface DeliveryOrder {
  id: string;
  status: OrderStatus;
  total: number;
  currency: string;
  restaurantName: string;
  createdAt: string;
  driverId: string | null;
  deliveryLatitude: number;
  deliveryLongitude: number;
}
