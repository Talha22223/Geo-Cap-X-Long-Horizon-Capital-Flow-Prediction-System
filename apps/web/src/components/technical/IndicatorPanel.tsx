'use client';

import React, { useRef, useEffect } from 'react';

interface IndicatorPanelProps {
  title: string;
  values: (number | null)[];
  signal?: (number | null)[];
  histogram?: (number | null)[];
  height?: number;
  color?: string;
  signalColor?: string;
  overbought?: number;
  oversold?: number;
  zeroline?: boolean;
  className?: string;
}

export function IndicatorPanel({
  title,
  values,
  signal,
  histogram,
  height = 120,
  color = '#818cf8',
  signalColor = '#f97316',
  overbought,
  oversold,
  zeroline = false,
  className = '',
}: IndicatorPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const n = 120;
    const visible = values.slice(-n);
    const pad = { top: 8, right: 56, bottom: 16, left: 8 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;

    // Determine y range
    const allVals = [...visible, ...(signal ?? []).slice(-n), ...(histogram ?? []).slice(-n)]
      .filter((v): v is number => v !== null);
    if (allVals.length === 0) return;

    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const range = maxV - minV || 1;

    const toY = (v: number) => pad.top + cH - ((v - minV) / range) * cH;
    const toX = (i: number) => pad.left + (i / Math.max(1, visible.length - 1)) * cW;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 2; g++) {
      const y = pad.top + (cH / 2) * g;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
    }

    // Zero line
    if (zeroline) {
      const zY = toY(0);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, zY);
      ctx.lineTo(W - pad.right, zY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Overbought / oversold lines
    const drawLevelLine = (level: number, col: string) => {
      const y = toY(level);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col;
      ctx.font = '9px Inter, system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(level.toString(), W - pad.right + 4, y + 3);
    };

    if (overbought !== undefined) drawLevelLine(overbought, 'rgba(248,113,113,0.6)');
    if (oversold !== undefined) drawLevelLine(oversold, 'rgba(52,211,153,0.6)');

    // Histogram bars (for MACD)
    if (histogram) {
      const histVals = histogram.slice(-n);
      const zeroY = toY(0);
      histVals.forEach((v, i) => {
        if (v === null) return;
        const x = toX(i);
        const y = toY(v);
        const barW = Math.max(1, cW / visible.length - 1);
        ctx.fillStyle = v >= 0 ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.5)';
        ctx.fillRect(x - barW / 2, Math.min(y, zeroY), barW, Math.abs(y - zeroY));
      });
    }

    // Main line
    const drawLine = (vals: (number | null)[], col: string, w = 1.5) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.beginPath();
      let started = false;
      vals.slice(-n).forEach((v, i) => {
        if (v === null) { started = false; return; }
        const x = toX(i);
        const y = toY(v);
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      });
      ctx.stroke();
    };

    drawLine(visible, color);
    if (signal) drawLine(signal.slice(-n), signalColor, 1.5);

    // Right axis labels
    ctx.fillStyle = 'rgba(148,163,184,0.5)';
    ctx.font = '9px Inter, system-ui';
    ctx.textAlign = 'left';
    const lastVal = visible.filter(v => v !== null).pop();
    if (lastVal !== undefined && lastVal !== null) {
      ctx.fillStyle = color;
      ctx.fillText(lastVal.toFixed(2), W - pad.right + 4, pad.top + 12);
    }

    // Title
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = 'bold 10px Inter, system-ui';
    ctx.textAlign = 'left';
    ctx.fillText(title, pad.left + 4, pad.top + 10);

  }, [values, signal, histogram, height, color, signalColor, overbought, oversold, zeroline, title]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={canvasRef} className="w-full h-full" style={{ height }} />
    </div>
  );
}
