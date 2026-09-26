'use client';

import React, { useRef, useEffect, useMemo } from 'react';

interface Bar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Overlay {
  label: string;
  values: (number | null)[];
  color: string;
  width?: number;
}

interface CandlestickChartProps {
  data: Bar[];
  overlays?: Overlay[];
  height?: number;
  className?: string;
}

export function CandlestickChart({ data, overlays = [], height = 320, className = '' }: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const visibleData = useMemo(() => data.slice(-120), [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visibleData.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 16, right: 60, bottom: 40, left: 12 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const n = visibleData.length;
    const candleW = Math.max(1, Math.floor(chartW / n) - 1);

    // Price bounds
    const allPrices = visibleData.flatMap(b => [b.high, b.low]);
    overlays.forEach(ov => ov.values.forEach(v => { if (v !== null) allPrices.push(v); }));
    const minP = Math.min(...allPrices) * 0.998;
    const maxP = Math.max(...allPrices) * 1.002;
    const priceRange = maxP - minP;

    const toY = (price: number) => pad.top + chartH - ((price - minP) / priceRange) * chartH;
    const toX = (i: number) => pad.left + i * (chartW / n) + candleW / 2;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let g = 0; g <= gridLines; g++) {
      const y = pad.top + (chartH / gridLines) * g;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      // Price labels on right
      const price = maxP - (priceRange / gridLines) * g;
      ctx.fillStyle = 'rgba(148,163,184,0.5)';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(2), W - pad.right + 4, y + 4);
    }

    // Draw candles
    for (let i = 0; i < n; i++) {
      const bar = visibleData[i];
      const x = toX(i);
      const isBull = bar.close >= bar.open;
      const bodyColor = isBull ? '#34d399' : '#f87171';
      const wickColor = isBull ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)';

      const yOpen = toY(bar.open);
      const yClose = toY(bar.close);
      const yHigh = toY(bar.high);
      const yLow = toY(bar.low);

      // Wick
      ctx.strokeStyle = wickColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      ctx.fillStyle = bodyColor;
      const bodyTop = Math.min(yOpen, yClose);
      const bodyH = Math.max(1, Math.abs(yClose - yOpen));
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    }

    // Overlays (lines)
    overlays.forEach(ov => {
      ctx.strokeStyle = ov.color;
      ctx.lineWidth = ov.width ?? 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      let started = false;
      ov.values.slice(-n).forEach((val, i) => {
        if (val === null) { started = false; return; }
        const x = toX(i);
        const y = toY(val);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      });
      ctx.stroke();
    });

    // X-axis baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, H - pad.bottom);
    ctx.lineTo(W - pad.right, H - pad.bottom);
    ctx.stroke();

  }, [visibleData, overlays, height]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ height }} />
    </div>
  );
}
