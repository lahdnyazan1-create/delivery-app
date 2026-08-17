import { describe, it, expect, beforeEach, vi } from "vitest";

// ✅ محاكاة طبقة Cloud Functions — لا نلمس الشبكة في اختبارات الوحدة
const checkPromoCodeMock = vi.fn();
vi.mock("@/lib/orders", () => ({
  checkPromoCode: (...args: unknown[]) => checkPromoCodeMock(...args),
}));

// ✅ محاكاة تهيئة Firebase — getAuth يرفض بيئة node (يتطلب متصفحاً)؛
//    والاختبارات لا تستدعي عمليات Firestore فعلياً
vi.mock("@/lib/firebase", () => ({
  default: {},
  app: {},
  db: {},
  auth: {},
  functions: {},
  storage: {},
}));

import { useCartStore } from "./useCartStore";
import { useDataStore } from "./useDataStore";
import type { Dish, Zone } from "@/types/database";

const dish = (id: string, price: number): Dish => ({
  id,
  restaurantId: "r1",
  name: `طبق ${id}`,
  description: "",
  price,
  category: "رئيسية",
  available: true,
});

const zone = (id: string, fee: number): Zone => ({
  id,
  name: `منطقة ${id}`,
  deliveryFee: fee,
  active: true,
});

beforeEach(() => {
  useCartStore.getState().clearCart();
  useCartStore.setState({ selectedZoneId: "z1", appliedPromo: null, appliedPromoPercent: null });
  useDataStore.setState({
    dishes: [dish("a", 20), dish("b", 30)],
    zones: [zone("z1", 10)],
  });
  checkPromoCodeMock.mockReset();
});

describe("useCartStore — سير السلة", () => {
  it("أول إضافة تربط السلة بالمطعم", () => {
    const r = useCartStore.getState().addToCart("a", "r1");
    expect(r.ok).toBe(true);
    expect(useCartStore.getState().cartRestaurantId).toBe("r1");
  });

  it("إضافة من مطعم آخر تُرفض بإشعار تعارض", () => {
    useCartStore.getState().addToCart("a", "r1");
    const r = useCartStore.getState().addToCart("b", "r2");
    expect(r.ok).toBe(false);
    expect(r.conflict).toBe(true);
  });

  it("نفس الطبق بنفس الملاحظات والإضافات يُدمج كمياً لا يُكرَّر سطراً", () => {
    useCartStore.getState().addToCart("a", "r1", "", [{ id: "x", name: "جبنة", price: 5 }]);
    useCartStore.getState().addToCart("a", "r1", "", [{ id: "x", name: "جبنة", price: 5 }]);
    const cart = useCartStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it("إضافات مختلفة تصنع سطرين مستقلين", () => {
    useCartStore.getState().addToCart("a", "r1", "", [{ id: "x", name: "جبنة", price: 5 }]);
    useCartStore.getState().addToCart("a", "r1", "", [{ id: "y", name: "صوص", price: 3 }]);
    expect(useCartStore.getState().cart).toHaveLength(2);
  });

  it("replaceCartAndAdd يستبدل السلة ويصفر الخصم المطبّق", async () => {
    useCartStore.getState().addToCart("a", "r1");
    useCartStore.setState({ appliedPromo: "SAVE", appliedPromoPercent: 10 });

    useCartStore.getState().replaceCartAndAdd("b", "r9");

    const s = useCartStore.getState();
    expect(s.cartRestaurantId).toBe("r9");
    expect(s.cart).toHaveLength(1);
    expect(s.appliedPromo).toBeNull();
    expect(s.appliedPromoPercent).toBeNull();
  });

  it("updateQuantity بصفر يحذف الصنف", () => {
    useCartStore.getState().addToCart("a", "r1");
    useCartStore.getState().updateQuantity("a", 0);
    expect(useCartStore.getState().cart).toHaveLength(0);
    expect(useCartStore.getState().cartRestaurantId).toBeNull();
  });
});

describe("useCartStore — أكواد الخصم (عبر الخادم)", () => {
  it("كود صالح يُطبّق النسبة ويظهر في حساب الإجمالي", async () => {
    checkPromoCodeMock.mockResolvedValue({ ok: true, percentOff: 25 });
    useCartStore.getState().addToCart("a", "r1", "", [{ id: "x", name: "جبنة", price: 10 }]);

    const r = await useCartStore.getState().applyPromo("save");
    expect(r.ok).toBe(true);
    expect(r.message).toContain("25");

    const { subtotal, discount, total } = useCartStore.getState().getCartTotal();
    expect(subtotal).toBe(30);
    expect(discount).toBe(7.5);
    expect(total).toBe(32.5); // 30 - 7.5 + 10 توصيل
  });

  it("كود مرفوض من الخادم يُبلَّغ برسالة الخطأ ولا يغيّر الحالة", async () => {
    useCartStore.getState().addToCart("a", "r1");
    checkPromoCodeMock.mockResolvedValue({ ok: false, message: "كود غير صالح" });

    const r = await useCartStore.getState().applyPromo("BAD");
    expect(r.ok).toBe(false);
    expect(useCartStore.getState().appliedPromo).toBeNull();
    expect(useCartStore.getState().getCartTotal().discount).toBe(0);
  });

  it("الكود يُطبَّع بأحرف كبيرة قبل الإرسال", async () => {
    checkPromoCodeMock.mockResolvedValue({ ok: true, percentOff: 10 });
    await useCartStore.getState().applyPromo(" save ");
    expect(checkPromoCodeMock).toHaveBeenCalledWith("SAVE");
  });
});
