import { describe, it, expect } from "vitest";
import { ORDER_STATUSES, STATUS_LABELS_AR } from "./orderStatuses";
import { STATUS_TRANSITIONS, type OrderStatus } from "@/types/database";

const ALL_STATUSES: OrderStatus[] = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];

describe("حالات الطلب — مصدر الحقيقة الموحّد", () => {
  it("ORDER_STATUSES يغطي الحالات السبع كاملة (كان Accepted مفقوداً سابقاً)", () => {
    expect(ORDER_STATUSES).toEqual(ALL_STATUSES);
  });

  it("لكل حالة تسمية عربية — لا حالة تعرض نصاً إنجليزياً خاماً للمستخدم", () => {
    for (const status of ORDER_STATUSES) {
      expect(STATUS_LABELS_AR[status], `تسمية مفقودة لـ ${status}`).toBeTruthy();
    }
  });

  it("STATUS_TRANSITIONS يغطي كل الحالات ولا تشير لأي حالة غير معرّفة", () => {
    expect(Object.keys(STATUS_TRANSITIONS).sort()).toEqual([...ALL_STATUSES].sort());
    for (const transitions of Object.values(STATUS_TRANSITIONS)) {
      for (const target of transitions) {
        expect(ALL_STATUSES, `حالة غير معرّفة في الانتقالات: ${target}`).toContain(target);
      }
    }
  });
});
