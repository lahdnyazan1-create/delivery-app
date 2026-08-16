import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /**true للعمليات الخطرة (حذف) — يعرض زر التأكيد بلون الخطر */
  danger?: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  confirmState: {
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null;

  showToast: (type: ToastType, message: string, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;

  /**بديل غير حاجب لـ window.confirm — يعيد Promise يُحل باختيار المستخدم*/
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolveConfirm: (value: boolean) => void;
}

let nextToastId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  confirmState: null,

  showToast: (type, message, durationMs) => {
    const id = nextToastId++;
    const duration = durationMs ?? (type === "error" ? 5000 : 3500);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => get().dismiss(id), duration);
  },

  success: (message) => get().showToast("success", message),
  error: (message) => get().showToast("error", message),
  info: (message) => get().showToast("info", message),

  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      //إذا كان هناك حوار مفتوح، أغلقه برفض قبل فتح الجديد
      get().resolveConfirm(false);
      set({ confirmState: { options, resolve } });
    }),

  resolveConfirm: (value) => {
    const { confirmState } = get();
    if (confirmState) confirmState.resolve(value);
    set({ confirmState: null });
  },
}));
