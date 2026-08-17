import { describe, it, expect } from "vitest";
import { calcTotals } from "./calcTotals";
import type { CartItem, Dish } from "@/types/database";

const dish = (id: string, price: number): Dish => ({
  id,
  restaurantId: "r1",
  name: `طبق ${id}`,
  description: "",
  price,
  category: "رئيسية",
  available: true,
});

const item = (dishId: string, quantity: number, addons: CartItem["selectedAddons"] = []): CartItem => ({
  dishId,
  quantity,
  selectedAddons: addons,
});

describe("calcTotals — منطق التسعير الحرج للسلة", () => {
  it("يجمع سعر الطبق والإضافات مضروباً بالكمية", () => {
    const dishes = [dish("a", 20), dish("b", 30)];
    const cart = [
      item("a", 2, [{ id: "x1", name: "جبنة", price: 5 }]),
      item("b", 1),
    ];
    const r = calcTotals(cart, dishes, null, 10);
    // (20+5)*2 + 30*1 = 80
    expect(r.subtotal).toBe(80);
    expect(r.discount).toBe(0);
    expect(r.deliveryFee).toBe(10);
    expect(r.total).toBe(90);
  });

  it("يتخطى أصناف السلة التي لم تُحمّل أطباقها بعد (بدل انهيار)", () => {
    const cart = [item("a", 1), item("missing", 3)];
    const r = calcTotals(cart, [dish("a", 15)], null, 10);
    expect(r.subtotal).toBe(15);
  });

  it("يطبّق نسبة الخصم المُتحقَّق منها من الخادم على المجموع الفرعي فقط", () => {
    const cart = [item("a", 4)]; // 100
    const r = calcTotals(cart, [dish("a", 25)], 20, 10);
    expect(r.discount).toBe(20);
    expect(r.total).toBe(80 + 10);
  });

  it("لا رسوم توصيل على سلة فارغة", () => {
    const r = calcTotals([], [dish("a", 25)], null, 10);
    expect(r.deliveryFee).toBe(0);
    expect(r.total).toBe(0);
  });

  it("خصم أكبر من المجموع لا يُنتج مجموعاً سالباً", () => {
    const cart = [item("a", 1)];
    const r = calcTotals(cart, [dish("a", 10)], 100, 5);
    expect(r.total).toBe(5); // 0 + 5 توصيل
  });
});
