/** Short money labels such as "$3.1k" or "$1.2M". Deterministic, so server and browser render the same text
 * (Intl compact notation differs between ICU builds and causes hydration mismatches). */
export function compactMoney(value: number) {
  const [divisor, suffix] = value >= 1e9 ? [1e9, "B"] : value >= 1e6 ? [1e6, "M"] : value >= 1e3 ? [1e3, "k"] : [1, ""];
  const scaled = value / divisor;
  return `$${suffix ? scaled.toFixed(1).replace(/\.0$/, "") : Math.round(scaled)}${suffix}`;
}

export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
