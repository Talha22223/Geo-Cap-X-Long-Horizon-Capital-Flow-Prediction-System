/**
 * Generates deterministic mock OHLCV + indicator data for UI development
 * when the AI service is not available.
 */

export interface MockBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function seed(s: number) {
  let x = Math.sin(s) * 10000;
  return x - Math.floor(x);
}

export function generateMockOHLCV(symbol: string, n = 200, base = 1.08): MockBar[] {
  const bars: MockBar[] = [];
  let price = base;
  const now = Date.now();
  const step = 3600_000; // 1 hour

  for (let i = 0; i < n; i++) {
    const r = (seed(i + symbol.charCodeAt(0) * 13) - 0.5) * 0.004;
    const open = price;
    const close = price * (1 + r);
    const hi = Math.max(open, close) * (1 + seed(i * 2.3) * 0.002);
    const lo = Math.min(open, close) * (1 - seed(i * 3.1) * 0.002);
    const vol = 1_000_000 + seed(i * 7.7) * 5_000_000;
    bars.push({
      timestamp: new Date(now - (n - i) * step).toISOString(),
      open: +open.toFixed(5),
      high: +hi.toFixed(5),
      low: +lo.toFixed(5),
      close: +close.toFixed(5),
      volume: Math.round(vol),
    });
    price = close;
  }
  return bars;
}

function sma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) =>
    i < period - 1 ? null : closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  );
}

function ema(closes: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const result: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (prev === null) {
      prev = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(prev);
    } else {
      prev = closes[i] * k + prev * (1 - k);
      result.push(prev);
    }
  }
  return result;
}

function rsi(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(null); continue; }
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;
    if (i <= period) {
      avgGain = (avgGain * (i - 1) + gain) / i;
      avgLoss = (avgLoss * (i - 1) + loss) / i;
      result.push(i < period ? null : 100 - 100 / (1 + avgGain / (avgLoss || 0.0001)));
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      result.push(100 - 100 / (1 + avgGain / (avgLoss || 0.0001)));
    }
  }
  return result;
}

export function generateMockIndicators(bars: MockBar[]) {
  const closes = bars.map(b => b.close);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => (v !== null && ema26[i] !== null) ? v - ema26[i]! : null);
  const macdSignal = ema(macdLine.filter((v): v is number => v !== null), 9);
  const macdSignalFull: (number | null)[] = [];
  let si = 0;
  macdLine.forEach(v => {
    if (v === null) { macdSignalFull.push(null); }
    else { macdSignalFull.push(macdSignal[si++] ?? null); }
  });

  const rsi14 = rsi(closes);
  const stdPeriod = 20;
  const bbUpper: (number | null)[] = sma20.map((m, i) => {
    if (m === null) return null;
    const slice = closes.slice(i - stdPeriod + 1, i + 1);
    const std = Math.sqrt(slice.reduce((acc, v) => acc + (v - m) ** 2, 0) / stdPeriod);
    return m + 2 * std;
  });
  const bbLower: (number | null)[] = sma20.map((m, i) => {
    if (m === null) return null;
    const slice = closes.slice(i - stdPeriod + 1, i + 1);
    const std = Math.sqrt(slice.reduce((acc, v) => acc + (v - m) ** 2, 0) / stdPeriod);
    return m - 2 * std;
  });

  return {
    sma_20: sma20,
    sma_50: sma50,
    ema_9: ema(closes, 9),
    rsi_14: rsi14,
    macd: {
      line: macdLine,
      signal: macdSignalFull,
      histogram: macdLine.map((v, i) => (v !== null && macdSignalFull[i] !== null) ? v - macdSignalFull[i]! : null),
    },
    bollinger_bands: { upper: bbUpper, middle: sma20, lower: bbLower },
    last_price: closes.at(-1) ?? base,
    last_volume: bars.at(-1)?.volume ?? 0,
  };
}

const base = 1.08;
export const MOCK_SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'XAU/USD', 'BTC/USD'];
