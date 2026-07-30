import { OrderStatus } from "@/types/database";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "Ready",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];
