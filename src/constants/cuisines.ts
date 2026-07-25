export type CuisineId = "all" | "pizza" | "burger" | "oriental" | "sushi" | "sweets";

export const CUISINES = [
  { id: "all" as const, label: "All", icon: "🍽️" },
  { id: "pizza", label: "بيتزا", icon: "🍕" },
  { id: "burger", label: "برغر", icon: "🍔" },
  { id: "oriental", label: "شرقي", icon: "🥙" },
  { id: "sushi", label: "سوشي", icon: "🍣" },
  { id: "sweets", label: "حلويات", icon: "🍰" },
];
