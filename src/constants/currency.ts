export const CURRENCY = {
  symbol: "₪",
  code: "ILS",
  position: "after" as "before" | "after",
};

export function formatPrice(amount: number): string {
  const formatted = amount.toFixed(2);
  return CURRENCY.position === "before"
    ? `${CURRENCY.symbol}${formatted}`
    : `${formatted} ${CURRENCY.symbol}`;
}
