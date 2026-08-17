import { CartItem, Dish } from "@/types/database";

/**
 * ✅ حساب مجاميع السلة. نسبة الخصم تصل مُتحقَّقاً من الخادم عبر checkPromo
 *    (كانت القائمة كاملة تُقرأ من العميل ليبحث عن الكود محلياً).
 */
export function calcTotals(
  cart: CartItem[],
  dishes: Dish[],
  promoPercentOff: number | null,
  deliveryFee: number,
) {
  const subtotal = cart.reduce((sum, item) => {
    const dish = dishes.find((d) => d.id === item.dishId);
    if (!dish) return sum;
    const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + a.price, 0);
    return sum + (dish.price + addonsPrice) * item.quantity;
  }, 0);

  const discount = promoPercentOff ? (subtotal * promoPercentOff) / 100 : 0;
  const totalAfterDiscount = Math.max(0, subtotal - discount);
  const finalDeliveryFee = cart.length > 0 ? deliveryFee : 0;

  return {
    subtotal,
    discount,
    deliveryFee: finalDeliveryFee,
    total: totalAfterDiscount + finalDeliveryFee,
  };
}
