"use client";

import { useMemo } from "react";
import { formatMoney } from "@/lib/utils";

export type PnLPoint = {
  key: string;
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  cumulative: number;
};

type Props = {
  points: PnLPoint[];
  currency?: "INR" | "THB";
};

/** Classic worm / sparkline-style cumulative P&L chart (SVG, no chart lib). */
export function PnLWormChart({ points, currency = "INR" }: Props) {
  const layout = useMemo(() => {
    const w = 640;
    const h = 220;
    const pad = { t: 16, r: 16, b: 36, l: 48 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;

    if (!points.length) {
      return null;
    }

    const values = points.map((pt) => pt.cumulative);
    let min = Math.min(0, ...values);
    let max = Math.max(0, ...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const range = max - min;

    const xAt = (i: number) =>
      pad.l +
      (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const yAt = (v: number) => pad.t + ((max - v) / range) * innerH;

    const coords = points.map((pt, i) => ({
      x: xAt(i),
      y: yAt(pt.cumulative),
      point: pt,
    }));

    const path = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");

    const zeroY = yAt(0);
    const area = `${path} L ${coords[coords.length - 1].x.toFixed(1)} ${zeroY.toFixed(
      1
    )} L ${coords[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`;

    const yTicks = [0, 1, 2, 3, 4].map((i) => {
      const v = min + (range * i) / 4;
      return { y: yAt(v), label: formatCompact(v) };
    });

    return {
      w,
      h,
      pad,
      path,
      area,
      coords,
      zeroY,
      yTicks,
      latest: points[points.length - 1],
    };
  }, [points]);

  if (!layout) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Add purchase &amp; sale rates on Items, then invoice goods — P&amp;L will
        worm across months here.
      </p>
    );
  }

  const profitPositive = (layout.latest.cumulative ?? 0) >= 0;
  const stroke = profitPositive ? "#047857" : "#b91c1c";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-sm text-[var(--muted)]">Cumulative P&amp;L</div>
          <div
            className={`font-display text-2xl ${
              profitPositive ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {formatMoney(layout.latest.cumulative, currency)}
          </div>
        </div>
        <div className="text-right text-xs text-[var(--muted)]">
          <div>
            Last month · Revenue{" "}
            {formatMoney(layout.latest.revenue, currency)} · Cost{" "}
            {formatMoney(layout.latest.cost, currency)}
          </div>
          <div>
            Period profit {formatMoney(layout.latest.profit, currency)}
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${layout.w} ${layout.h}`}
        className="h-auto w-full"
        role="img"
        aria-label="Profit and loss worm chart"
      >
        <defs>
          <linearGradient id="pnl-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {layout.yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={layout.pad.l}
              x2={layout.w - layout.pad.r}
              y1={t.y}
              y2={t.y}
              stroke="var(--line)"
              strokeWidth="1"
            />
            <text
              x={layout.pad.l - 6}
              y={t.y + 3}
              textAnchor="end"
              fontSize="10"
              fill="var(--muted)"
            >
              {t.label}
            </text>
          </g>
        ))}

        <line
          x1={layout.pad.l}
          x2={layout.w - layout.pad.r}
          y1={layout.zeroY}
          y2={layout.zeroY}
          stroke="var(--muted)"
          strokeDasharray="4 4"
          strokeOpacity="0.55"
        />

        <path d={layout.area} fill="url(#pnl-fill)" />
        <path
          d={layout.path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {layout.coords.map((c, i) => (
          <g key={c.point.key}>
            <circle
              cx={c.x}
              cy={c.y}
              r={i === layout.coords.length - 1 ? 4.5 : 3}
              fill={c.point.cumulative >= 0 ? "#047857" : "#b91c1c"}
              stroke="#fff"
              strokeWidth="1.5"
            />
            <text
              x={c.x}
              y={layout.h - 10}
              textAnchor="middle"
              fontSize="10"
              fill="var(--muted)"
            >
              {c.point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function formatCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
