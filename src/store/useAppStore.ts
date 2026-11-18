import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CartLine, MenuItem } from '../types';

interface AppState {
  cart: CartLine[];
  favorites: string[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  toggleFavorite: (restaurantId: string) => void;
}

export const useAppStore = create<AppState>()(persist((set) => ({
  cart: [],
  favorites: [],
  addToCart: (item) => set((state) => {
    const existing = state.cart.find((line) => line.item.id === item.id);
    if (existing) {
      return { cart: state.cart.map((line) => line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) };
    }
    return { cart: [...state.cart, { item, quantity: 1 }] };
  }),
  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.flatMap((line) => {
      if (line.item.id !== itemId) return [line];
      return line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [];
    }),
  })),
  clearCart: () => set({ cart: [] }),
  toggleFavorite: (restaurantId) => set((state) => ({
    favorites: state.favorites.includes(restaurantId)
      ? state.favorites.filter((id) => id !== restaurantId)
      : [...state.favorites, restaurantId],
  })),
}), {
  name: 'chow-app-state',
  storage: createJSONStorage(() => AsyncStorage),
}));
