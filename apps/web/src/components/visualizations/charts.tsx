'use client';

import React, { useRef, useEffect, useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface LineSeriesProps {
  data: { x: number; y: number }[];
  color: string;
  width?: number;
  fill?: boolean;
  fillOpacity?: number;
}

interface TimeSeriesChartProps {
  series: { name: string; data: number[]; color: string; fill?: boolean }[];
  labels?: string[];
  height?: number;
  className?: string;
}

// ── Time-Series Line Chart ───────────────────────────────────────────────────
export function TimeSeriesChart({ series, labels = [], height = 280, className = '' }: TimeSeriesChartProps) {
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

    const pad = { top: 20, right: 20, bottom: 36, left: 48 };
    const cW = W - pad.left - pad.right;
    const cH = H - pad.top - pad.bottom;
    const n = Math.max(...series.map(s => s.data.length));

    const allVals = series.flatMap(s => s.data);
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals);
    const range = maxV - minV || 1;

    const toX = (i: number) => pad.left + (i / Math.max(1, n - 1)) * cW;
    const toY = (v: number) => pad.top + cH - ((v - minV) / range) * cH;

    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

    // Grid
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.top + (cH / 4) * g;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      const val = maxV - (range / 4) * g;
      ctx.fillStyle = isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.9)';
      ctx.font = '9px Inter, system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(2), pad.left - 4, y + 3);
    }

    // X-axis labels
    if (labels.length > 0) {
      const step = Math.max(1, Math.floor(labels.length / 6));
      ctx.fillStyle = isDark ? 'rgba(100,116,139,0.8)' : 'rgba(71,85,105,0.9)';
      ctx.font = '9px Inter, system-ui';
      ctx.textAlign = 'center';
      labels.forEach((lbl, i) => {
        if (i % step === 0 || i === labels.length - 1) {
          ctx.fillText(lbl, toX(i), H - pad.bottom + 14);
        }
      });
    }

    // Series
    series.forEach(s => {
      const data = s.data;
      if (data.length === 0) return;

      // Fill
      if (s.fill) {
        ctx.beginPath();
        data.forEach((v, i) => {
          const x = toX(i);
          const y = toY(v);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.lineTo(toX(data.length - 1), toY(minV));
        ctx.lineTo(toX(0), toY(minV));
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
        grad.addColorStop(0, s.color.replace(')', ', 0.25)').replace('rgb', 'rgba'));
        grad.addColorStop(1, s.color.replace(')', ', 0)').replace('rgb', 'rgba'));
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Line
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = toX(i);
        const y = toY(v);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

  }, [series, labels, height]);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <canvas ref={canvasRef} className="w-full" style={{ height }} />
    </div>
  );
}

// ── Donut / Pie Chart ────────────────────────────────────────────────────────
interface DonutChartProps {
  data: DataPoint[];
  size?: number;
  innerRadius?: number;
  className?: string;
}

export function DonutChart({ data, size = 160, innerRadius = 0.55, className = '' }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const ir = r * innerRadius;

  const segments = useMemo(() => {
    let startAngle = -Math.PI / 2;
    return data.map(d => {
      const angle = (d.value / total) * Math.PI * 2;
      const seg = { ...d, startAngle, endAngle: startAngle + angle };
      startAngle += angle;
      return seg;
    });
  }, [data, total]);

  const describeArc = (sa: number, ea: number, outer: number, inner: number) => {
    const x1 = cx + outer * Math.cos(sa);
    const y1 = cy + outer * Math.sin(sa);
    const x2 = cx + outer * Math.cos(ea);
    const y2 = cy + outer * Math.sin(ea);
    const ix1 = cx + inner * Math.cos(ea);
    const iy1 = cy + inner * Math.sin(ea);
    const ix2 = cx + inner * Math.cos(sa);
    const iy2 = cy + inner * Math.sin(sa);
    const largeArc = ea - sa > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${outer} ${outer} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${inner} ${inner} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
  };

  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => (
          <path
            key={i}
            d={describeArc(seg.startAngle, seg.endAngle, r, ir)}
            fill={seg.color ?? '#6366f1'}
            opacity={0.9}
          />
        ))}
        <circle cx={cx} cy={cy} r={ir - 2} className="fill-slate-50 dark:fill-slate-900 transition-colors" />
      </svg>
      <div className="space-y-1.5 flex-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color ?? '#6366f1' }} />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{d.label}</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal Bar Chart ─────────────────────────────────────────────────────
interface HBarChartProps {
  data: DataPoint[];
  className?: string;
}

export function HBarChart({ data, className = '' }: HBarChartProps) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div className={`space-y-2.5 ${className}`}>
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">{d.label}</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">{d.value.toFixed(2)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800/80">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? '#6366f1' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Waterfall/SHAP Chart ─────────────────────────────────────────────────────
interface WaterfallItem {
  label: string;
  value: number;
}

interface WaterfallChartProps {
  items: WaterfallItem[];
  baseline?: number;
  height?: number;
  className?: string;
}

export function WaterfallChart({ items, baseline = 0, height = 220, className = '' }: WaterfallChartProps) {
  const padV = 24;
  const padH = 64;
  const innerH = height - padV * 2;

  // Running total for waterfall
  const bars = useMemo(() => {
    let running = baseline;
    return items.map(item => {
      const start = running;
      running += item.value;
      return { ...item, start, end: running };
    });
  }, [items, baseline]);

  const allVals = bars.flatMap(b => [b.start, b.end]);
  const minV = Math.min(...allVals) - 0.05;
  const maxV = Math.max(...allVals) + 0.05;
  const range = maxV - minV;

  const toY = (v: number) => padV + innerH - ((v - minV) / range) * innerH;
  const barWidth = 32;
  const totalWidth = padH * 2 + Math.max(bars.length * (barWidth + 12), 200);
  const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className={`overflow-x-auto ${className}`}>
      <svg width={Math.max(400, totalWidth)} height={height} className="w-full">
        {/* Zero line */}
        <line
          x1={padH}
          y1={toY(baseline)}
          x2={totalWidth - padH}
          y2={toY(baseline)}
          stroke={isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {bars.map((bar, i) => {
          const x = padH + i * (barWidth + 12);
          const isPos = bar.value >= 0;
          const barTop = Math.min(toY(bar.start), toY(bar.end));
          const barH = Math.abs(toY(bar.start) - toY(bar.end));
          const color = isPos ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626');

          return (
            <g key={i}>
              {/* Connector */}
              {i > 0 && (
                <line
                  x1={padH + (i - 1) * (barWidth + 12) + barWidth}
                  y1={toY(bars[i - 1].end)}
                  x2={x}
                  y2={toY(bars[i - 1].end)}
                  stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
              )}
              {/* Bar */}
              <rect
                x={x}
                y={barTop}
                width={barWidth}
                height={Math.max(2, barH)}
                fill={color}
                opacity={0.85}
                rx={3}
              />
              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={barTop - 4}
                textAnchor="middle"
                fill={color}
                fontSize={8}
                fontWeight="bold"
              >
                {isPos ? '+' : ''}{bar.value.toFixed(3)}
              </text>
              {/* X label */}
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                fill={isDark ? 'rgba(148,163,184,0.8)' : 'rgba(71,85,105,0.9)'}
                fontSize={8}
                fontWeight="500"
                transform={`rotate(-30, ${x + barWidth / 2}, ${height - 4})`}
              >
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
