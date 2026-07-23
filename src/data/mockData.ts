// src/data/mockData.ts

export type OrderStatus =
  | "Pending"
  | "Preparing"
  | "OutForDelivery"
  | "Delivered"
  | "Cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  plateNumber: string;
  isAvailable?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryFee: number;
  etaMinutes: number;
  image: string;
  address: string;
  isOpen: boolean;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  available: boolean;
}

export interface PromoCode {
  code: string;
  percentOff: number;
  active: boolean;
}

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: "drv-101",
    name: "أحمد ياسين",
    phone: "0599000111",
    vehicle: "سكوتر SYM Joymax",
    plateNumber: "6-8921-99",
    isAvailable: true,
  },
  {
    id: "drv-102",
    name: "محمود خليل",
    phone: "0599000222",
    vehicle: "سيارة هيونداي Getz",
    plateNumber: "6-1234-98",
    isAvailable: true,
  },
];

export const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: "rest-1",
    name: "Pizza Heaven",
    cuisine: "بيتزا / إيطالي",
    rating: 4.8,
    deliveryFee: 10,
    etaMinutes: 30,
    image: "/images/pizza.jpg",
    address: "وسط المدينة",
    isOpen: true,
  },
  {
    id: "rest-2",
    name: "Burger Craft",
    cuisine: "برجر / وجبات سريعة",
    rating: 4.6,
    deliveryFee: 8,
    etaMinutes: 25,
    image: "/images/burger.jpg",
    address: "شارع الجامعة",
    isOpen: true,
  },
];

export const INITIAL_DISHES: Dish[] = [
  {
    id: "dish-1",
    restaurantId: "rest-1",
    name: "بيتزا مارجريتا",
    description: "صلصة طماطم طازجة، جبنة موزاريلا، ريحان",
    price: 35,
    image: "/images/margherita.jpg",
    category: "بيتزا",
    available: true,
  },
  {
    id: "dish-2",
    restaurantId: "rest-1",
    name: "بيتزا ببروني",
    description: "شرائح ببروني بقري، جبنة موزاريلا",
    price: 45,
    image: "/images/pepperoni.jpg",
    category: "بيتزا",
    available: true,
  },
];

export const INITIAL_PROMOS: PromoCode[] = [
  { code: "ZEST10", percentOff: 10, active: true },
  { code: "HEAVEN20", percentOff: 20, active: true },
];

export type CuisineId = "all" | "pizza" | "burger" | "oriental" | "sushi" | "sweets";

export const CUISINES = [
  { id: "all", name: "الكل", icon: "🍽️" },
  { id: "pizza", name: "بيتزا", icon: "🍕" },
  { id: "burger", name: "برغر", icon: "🍔" },
  { id: "oriental", name: "شرقي", icon: "🥙" },
  { id: "sushi", name: "سوشي", icon: "🍣" },
  { id: "sweets", name: "حلويات", icon: "🍰" },
];
