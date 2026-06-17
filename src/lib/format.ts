// Currency formatting. Mirrors the original fmt()/detectScale() behaviour:
// when revenue < 1000 we assume values are already expressed in billions.

export function detectScale(revenue: number | null | undefined): boolean {
  return revenue != null && revenue < 1000;
}

export type Formatter = (n: number | null | undefined) => string;

export function makeFmt(isBillionScale: boolean): Formatter {
  return (n) => {
    if (n == null || isNaN(n)) return '$—';
    if (isBillionScale) {
      if (Math.abs(n) >= 1) return '$' + n.toFixed(1) + 'B';
      if (Math.abs(n) >= 0.001) return '$' + (n * 1000).toFixed(0) + 'M';
      return '$' + (n * 1000).toFixed(1) + 'M';
    }
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n.toLocaleString();
  };
}
