"use client";

import { motion } from "framer-motion";
import type { OrderStatus } from "@/data/mockData";

const STAGES: {
  status: OrderStatus;
  titleAr: string;
  titleEn: string;
  icon: string;
}[] = [
  {
    status: "Pending",
    titleAr: "تم استلام الطلب",
    titleEn: "Order Received",
    icon: "📝",
  },
  {
    status: "Preparing",
    titleAr: "المطبخ يجهز طلبك",
    titleEn: "Kitchen Preparing",
    icon: "🍳",
  },
  {
    status: "Out for Delivery",
    titleAr: "السائق في الطريق إليك",
    titleEn: "Out for Delivery",
    icon: "🛵",
  },
  {
    status: "Delivered",
    titleAr: "وصل طلبك!",
    titleEn: "Delivered",
    icon: "🎉",
  },
];

type OrderStageTrackerProps = {
  status: OrderStatus;
};

function ScooterCartoon() {
  return (
    <motion.div
      className="relative mx-auto mt-4 flex h-24 w-full max-w-[220px] items-end justify-center"
      aria-hidden
    >
      <div className="absolute bottom-3 h-2 w-full rounded-full bg-white/10" />
      <motion.div
        className="relative z-10 text-5xl"
        animate={{ y: [0, -8, 0], x: [0, 6, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      >
        🛵
      </motion.div>
      <motion.span
        className="absolute bottom-6 left-6 size-2 rounded-full bg-primary/70"
        animate={{ opacity: [0.2, 0.8, 0.2], x: [-4, 8] }}
        transition={{ duration: 0.9, repeat: Infinity }}
      />
      <motion.span
        className="absolute bottom-8 left-10 size-1.5 rounded-full bg-primary/50"
        animate={{ opacity: [0.1, 0.6, 0.1], x: [-2, 10] }}
        transition={{ duration: 1.1, repeat: Infinity, delay: 0.2 }}
      />
    </motion.div>
  );
}

export function OrderStageTracker({ status }: OrderStageTrackerProps) {
  const activeIndex = Math.max(
    0,
    STAGES.findIndex((s) => s.status === status),
  );
  const progress = activeIndex / (STAGES.length - 1);

  return (
    <div className="glass overflow-hidden rounded-3xl p-5" dir="rtl">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
        حالة الطلب
      </p>
      <h2 className="mt-1 text-xl font-extrabold text-foreground">
        {STAGES[activeIndex]?.titleAr}
      </h2>
      <p className="text-sm text-foreground-muted">
        {STAGES[activeIndex]?.titleEn}
      </p>

      {status === "Out for Delivery" && <ScooterCartoon />}
      {status === "Delivered" && (
        <motion.div
          className="mt-4 text-center text-5xl"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18 }}
        >
          🎉
        </motion.div>
      )}

      <div className="relative mt-6 mb-2 px-1">
        <div className="absolute top-4 right-4 left-4 h-1 rounded-full bg-white/10" />
        <motion.div
          className="absolute top-4 right-4 h-1 origin-right rounded-full bg-accent"
          initial={false}
          animate={{ width: `calc(${progress * 100}% - 0px)` }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          style={{ left: "auto" }}
        />
        <ul className="relative grid grid-cols-4 gap-1">
          {STAGES.map((stage, i) => {
            const done = i <= activeIndex;
            const current = i === activeIndex;
            return (
              <li key={stage.status} className="flex flex-col items-center gap-2">
                <motion.span
                  animate={{
                    scale: current ? 1.12 : 1,
                    backgroundColor: done
                      ? "rgb(0, 200, 83)"
                      : "rgba(255,255,255,0.08)",
                  }}
                  className="flex size-9 items-center justify-center rounded-full text-sm shadow-sm"
                >
                  {stage.icon}
                </motion.span>
                <span
                  className={`text-center text-[10px] font-bold leading-tight ${
                    current ? "text-primary" : "text-foreground-muted"
                  }`}
                >
                  {stage.titleAr}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
