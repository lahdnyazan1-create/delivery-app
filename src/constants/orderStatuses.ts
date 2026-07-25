import { OrderStatus } from "@/types/database";

export const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Preparing",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];
