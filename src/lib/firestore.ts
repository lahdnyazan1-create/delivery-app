import { db } from './firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { Restaurant, Dish, Driver, Order, OrderStatus, PromoCode, UserProfile } from '@/types/database';

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const snapshot = await getDocs(collection(db, 'restaurants'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant));
};

export const fetchDishes = async (): Promise<Dish[]> => {
  const snapshot = await getDocs(collection(db, 'dishes'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Dish));
};

export const fetchDrivers = async (): Promise<Driver[]> => {
  const snapshot = await getDocs(collection(db, 'drivers'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
};

export const fetchPromoCodes = async (): Promise<PromoCode[]> => {
  const snapshot = await getDocs(collection(db, 'promoCodes'));
  return snapshot.docs.map(doc => ({ code: doc.id, ...doc.data() } as PromoCode));
};

export const createOrder = async (orderData: Omit<Order, 'id'>): Promise<{ success: boolean; id?: string }> => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false };
  }
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<{ success: boolean }> => {
  try {
    const ref = doc(db, 'orders', orderId);
    await updateDoc(ref, { status, updatedAt: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false };
  }
};

export const subscribeOrders = (callback: (orders: Order[]) => void) => {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toMillis?.() || data.createdAt,
        updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt,
      } as Order;
    });
    callback(orders);
  });
};

export const updateUserProfile = async (uid: string, profile: Partial<UserProfile>) => {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, { ...profile, updatedAt: serverTimestamp() });
};

// إضافات لإدارة المطاعم والأطباق (للأدمن)
export const addRestaurant = async (restaurant: Omit<Restaurant, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'restaurants'), restaurant);
  return ref.id;
};

export const toggleRestaurantActive = async (restaurantId: string, active: boolean) => {
  const ref = doc(db, 'restaurants', restaurantId);
  await updateDoc(ref, { active });
};

export const addDish = async (dish: Omit<Dish, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'dishes'), dish);
  return ref.id;
};

export const updateDish = async (dishId: string, dish: Partial<Dish>) => {
  const ref = doc(db, 'dishes', dishId);
  await updateDoc(ref, { ...dish, updatedAt: serverTimestamp() });
};

export const addDriver = async (driver: Omit<Driver, 'id'>): Promise<string> => {
  const ref = await addDoc(collection(db, 'drivers'), driver);
  return ref.id;
};

export const updateDriver = async (driverId: string, driver: Partial<Driver>) => {
  const ref = doc(db, 'drivers', driverId);
  await updateDoc(ref, { ...driver, updatedAt: serverTimestamp() });
};
