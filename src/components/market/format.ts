export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)} B €`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} M €`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)} K €`;
  if (abs === 0) return "—";
  return `${sign}${abs.toFixed(0)} €`;
}
