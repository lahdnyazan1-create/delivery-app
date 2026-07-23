"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { vibrate } from "@/lib/feedback";

export function FlyToCart() {
  const { fly, clearFly } = useApp();

  return (
    <AnimatePresence>
      {fly && (
        <motion.div
          key={fly.id}
          className="pointer-events-none fixed z-[100] size-14 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-lg"
          initial={{
            left: fly.from.x,
            top: fly.from.y,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            left: [fly.from.x, (fly.from.x + fly.to.x) / 2, fly.to.x],
            top: [
              fly.from.y,
              Math.min(fly.from.y, fly.to.y) - 80,
              fly.to.y,
            ],
            scale: [1, 0.75, 0.3],
            opacity: [1, 1, 0.7],
          }}
          exit={{ opacity: 0, scale: 0.2 }}
          transition={{
            duration: 0.7,
            ease: "easeInOut",
            times: [0, 0.45, 1],
          }}
          onAnimationComplete={() => {
            vibrate(10);
            clearFly();
          }}
        >
          <div
            className={`h-full w-full bg-gradient-to-br ${fly.gradient}`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
