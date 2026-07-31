"use client";

import { motion } from "framer-motion";
import { CUISINES, type CuisineOption } from "@/constants/cuisines";

type CuisineSliderProps = {
  value: CuisineOption;
  onChange: (value: CuisineOption) => void;
};

export function CuisineSlider({ value, onChange }: CuisineSliderProps) {
  const options: { id: CuisineOption; label: string; icon?: string }[] = [
    { id: "all", label: "الكل", icon: "🍽️" },
    ...CUISINES.map((c) => ({ id: c.id, label: c.label, icon: c.icon })),
  ];

  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-2 pb-1">
        {options.map((item) => {
          const active = value === item.id;
          return (
            <li key={item.id}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onChange(item.id)}
                className={`no-select touch-target flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-primary text-white shadow-[0_6px_20px_rgb(255_107_53_/_0.35)]"
                    : "glass text-foreground-muted hover:text-foreground"
                }`}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </motion.button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
