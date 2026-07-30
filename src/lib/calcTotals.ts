import { CartItem, Dish, PromoCode } from "@/types/database";

export function calcTotals(
  cart: CartItem[],
  dishes: Dish[],
  appliedPromo: string | null,
  promoCodes: PromoCode[],
  deliveryFee: number,
) {
  const subtotal = cart.reduce((sum, item) => {
    const dish = dishes.find((d) => d.id === item.dishId);
    if (!dish) return sum;
    return sum + dish.price * item.quantity;
  }, 0);

  const promo = appliedPromo
    ? promoCodes.find((p) => p.code === appliedPromo && p.active)
    : null;
  const discount = promo ? (subtotal * promo.percentOff) / 100 : 0;
  const totalAfterDiscount = Math.max(0, subtotal - discount);
  const finalDeliveryFee = cart.length > 0 ? deliveryFee : 0;

  return {
    subtotal,
    discount,
    deliveryFee: finalDeliveryFee,
    total: totalAfterDiscount + finalDeliveryFee,
  };
}
