import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { Order, OrderStatus } from "@/types/database";

const ORDERS_COLLECTION = "orders";

// 1. إنشاء طلب جديد وتخزينه في Firestore
export async function createOrder(orderData: Omit<Order, "id">) {
  try {
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding order: ", error);
    return { success: false, error };
  }
}

// 2. الاستماع الفوري للطلبات (Real-time Listener) للمطعم أو الإدارة
export function subscribeToOrders(callback: (orders: Order[]) => void) {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const orders: Order[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Order, "id">),
    }));
    callback(orders);
  });
}

// 3. تحديث حالة الطلب (مثلاً: من pending إلى preparing)
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: Date.now(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating order status: ", error);
    return { success: false, error };
  }
}
