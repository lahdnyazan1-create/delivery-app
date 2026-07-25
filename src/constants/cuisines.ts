export type CuisineId = "pizza" | "burger" | "oriental" | "sushi" | "sweets";

export const CUISINES: { id: CuisineId; label: string; icon: string }[] = [
  { id: "pizza", label: "بيتزا", icon: "🍕" },
  { id: "burger", label: "برغر", icon: "🍔" },
  { id: "oriental", label: "شرقي", icon: "🥙" },
  { id: "sushi", label: "سوشي", icon: "🍣" },
  { id: "sweets", label: "حلويات", icon: "🍰" },
];

export type CuisineOption = CuisineId | "all";
