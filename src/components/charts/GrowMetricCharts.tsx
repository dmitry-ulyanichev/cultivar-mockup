import React, { useId, useMemo, useRef, useState } from 'react';
import {
  DistributionRange,
  EaseBreakdown,
  OdorLevel,
  SmellBreakdown,
} from '../../types/strain';

export type AdaptiveScaleKind = 'weeks' | 'cm' | 'gm2' | 'gplant';

export interface AdaptiveRangeScale {
  scaleMin: number;
  scaleMax: number;
  ticks: number[];
}

/**
 * Computes a clean, data-adapted axis range and human-friendly ticks for one
 * or more distributions (e.g. 7–16 wks for an 8–15 wk strain, expanding smoothly
 * to 20+ wks when a longer-flowering cultivar needs it).
 */
export function getAdaptiveRangeScale(
  ranges: DistributionRange[],
  kind: AdaptiveScaleKind
): AdaptiveRangeScale {
  const rawMin = Math.min(...ranges.map((r) => r.min));
  const rawMax = Math.max(...ranges.map((r) => r.max));

  if (kind === 'weeks') {
    const scaleMin = Math.max(0, Math.floor(rawMin) - 1);
    const scaleMax = Math.ceil(rawMax) + 1;
    const span = scaleMax - scaleMin;

    if (span <= 10) {
      const ticks: number[] = [];
      for (let t = scaleMin; t <= scaleMax; t += 1) {
        ticks.push(t);
      }
      return { scaleMin, scaleMax, ticks };
    }

    const tickStep = span <= 20 ? 2 : 3;
    const snappedMin = Math.max(0, Math.floor(scaleMin / tickStep) * tickStep);
    const snappedMax = Math.ceil(scaleMax / tickStep) * tickStep;
    const ticks: number[] = [];
    for (let t = snappedMin; t <= snappedMax; t += tickStep) {
      ticks.push(t);
    }
    return { scaleMin: snappedMin, scaleMax: snappedMax, ticks };
  }

  // When interval buckets are present (e.g. 20 cm height bins), align axis ticks cleanly to bin edges
  const intervalRanges = ranges.filter(
    (r) => r.buckets && r.buckets.some((b) => typeof b.end === 'number')
  );
  if (intervalRanges.length > 0) {
    const allIntervalBuckets = intervalRanges.flatMap((r) =>
      (r.buckets ?? []).filter((b) => typeof b.end === 'number')
    );
    const binStep = Math.min(
      ...allIntervalBuckets.map((b) => Math.max(1, (b.end as number) - b.value))
    );
    const bucketMin = Math.min(
      rawMin,
      ...allIntervalBuckets.map((b) => b.value)
    );
    const bucketMax = Math.max(
      rawMax,
      ...allIntervalBuckets.map((b) => b.end as number)
    );

    const scaleMin = Math.max(0, Math.floor(bucketMin / binStep) * binStep - binStep);
    const scaleMax = Math.ceil(bucketMax / binStep) * binStep + binStep;
    const binCount = (scaleMax - scaleMin) / binStep;
    const tickStep = binCount <= 10 ? binStep : binStep * 2;
    const snappedMin = Math.max(0, Math.floor(scaleMin / tickStep) * tickStep);
    const snappedMax = Math.ceil(scaleMax / tickStep) * tickStep;
    const ticks: number[] = [];
    for (let t = snappedMin; t <= snappedMax; t += tickStep) {
      ticks.push(t);
    }
    return { scaleMin: snappedMin, scaleMax: snappedMax, ticks };
  }

  const rawSpan = Math.max(1, rawMax - rawMin);
  const paddedMin = Math.max(0, rawMin - rawSpan * 0.15);
  const paddedMax = rawMax + rawSpan * 0.15;
  const paddedSpan = Math.max(1, paddedMax - paddedMin);

  const niceSteps = [5, 10, 20, 25, 50, 100, 150, 200, 250, 400, 500, 1000];
  const step =
    niceSteps.find((s) => paddedSpan / s <= 5.5) ??
    niceSteps[niceSteps.length - 1];

  const scaleMin = Math.max(0, Math.floor(paddedMin / step) * step);
  const scaleMax = Math.ceil(paddedMax / step) * step;
  const ticks: number[] = [];
  for (let t = scaleMin; t <= scaleMax; t += step) {
    ticks.push(t);
  }

  return { scaleMin, scaleMax, ticks };
}

function formatMetricNumber(val: number, unit: string): string {
  if (unit === 'wks') {
    return String(Number(val.toFixed(1)));
  }
  return String(Math.round(val));
}

function getAverageValue(range: DistributionRange): number {
  if (typeof range.average === 'number') return range.average;
  if (range.buckets && range.buckets.length > 0) {
    const total = range.buckets.reduce((sum, b) => sum + b.count, 0);
    if (total > 0) {
      const weighted = range.buckets.reduce((sum, b) => {
        const mid = typeof b.end === 'number' ? (b.value + b.end) / 2 : b.value;
        return sum + mid * b.count;
      }, 0);
      return Number((weighted / total).toFixed(1));
    }
  }
  return range.median;
}

interface EaseStackedBarProps {
  ease: EaseBreakdown;
  label?: string;
  reviewTier?: string;
}

export const EaseStackedBar: React.FC<EaseStackedBarProps> = ({
  ease,
  label,
  reviewTier,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold text-[#F3F5F8] truncate">
            {label}
          </span>
          {reviewTier && (
            <span className="text-xs text-[#969FA9] shrink-0">
              {reviewTier} reviews
            </span>
          )}
        </div>
      )}

      {/* Single horizontal 100% stacked bar */}
      <div
        className="flex h-7 w-full overflow-hidden rounded-md bg-[#1C2026] border border-white/10"
        role="img"
        aria-label={`Ease of growing: ${ease.easy}% Easy, ${ease.medium}% Medium, ${ease.hard}% Hard`}
      >
        {ease.easy > 0 && (
          <div
            style={{ width: `${ease.easy}%` }}
            className="h-full bg-[#34D399] flex items-center justify-center text-[11px] font-mono font-semibold text-[#0B1410] tabular-nums transition-all duration-200"
            title={`Easy: ${ease.easy}%`}
          >
            {ease.easy >= 16 ? `${ease.easy}%` : ''}
          </div>
        )}
        {ease.medium > 0 && (
          <div
            style={{ width: `${ease.medium}%` }}
            className="h-full bg-[#F59E0B] flex items-center justify-center text-[11px] font-mono font-semibold text-[#181104] tabular-nums transition-all duration-200"
            title={`Medium: ${ease.medium}%`}
          >
            {ease.medium >= 16 ? `${ease.medium}%` : ''}
          </div>
        )}
        {ease.hard > 0 && (
          <div
            style={{ width: `${ease.hard}%` }}
            className="h-full bg-[#F43F5E] flex items-center justify-center text-[11px] font-mono font-semibold text-white tabular-nums transition-all duration-200"
            title={`Hard: ${ease.hard}%`}
          >
            {ease.hard >= 14 ? `${ease.hard}%` : ''}
          </div>
        )}
      </div>

      {/* Unboxed tabular breakdown legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 text-[#D1D7DF]">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#34D399]" />
          <span>Easy</span>
          <span className="font-mono tabular-nums text-[#F3F5F8]">
            {ease.easy}%
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[#D1D7DF]">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#F59E0B]" />
          <span>Medium</span>
          <span className="font-mono tabular-nums text-[#F3F5F8]">
            {ease.medium}%
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[#D1D7DF]">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[#F43F5E]" />
          <span>Hard</span>
          <span className="font-mono tabular-nums text-[#F3F5F8]">
            {ease.hard}%
          </span>
        </span>
      </div>
    </div>
  );
};

interface SmellStackedBarProps {
  smell?: SmellBreakdown;
  odorLevel: OdorLevel;
  label?: string;
}

const FALLBACK_SMELL_BY_ODOR: Record<OdorLevel, SmellBreakdown> = {
  Low: { none: 18, weak: 54, medium: 22, strong: 6 },
  Medium: { none: 6, weak: 24, medium: 50, strong: 20 },
  High: { none: 2, weak: 7, medium: 28, strong: 63 },
};

export interface SmellSummary {
  label: 'Minimal' | 'Weak' | 'Medium' | 'Medium–Strong' | 'Strong';
  score: number;
  textClass: string;
}

/**
 * Computes a 5-step weighted average rating from the flowering smell distribution
 * (None = 0, Weak = 1, Medium = 2, Strong = 3).
 */
export function getEffectiveSmellSummary(
  smell: SmellBreakdown | undefined,
  odorLevel: OdorLevel
): SmellSummary {
  const dist = smell ?? FALLBACK_SMELL_BY_ODOR[odorLevel];
  const total =
    Math.max(0, dist.none) +
    Math.max(0, dist.weak) +
    Math.max(0, dist.medium) +
    Math.max(0, dist.strong);
  const score =
    total > 0
      ? (Math.max(0, dist.weak) * 1 +
          Math.max(0, dist.medium) * 2 +
          Math.max(0, dist.strong) * 3) /
        total
      : 1.5;

  if (score < 0.6) {
    return { label: 'Minimal', score, textClass: 'text-teal-300' };
  }
  if (score < 1.25) {
    return { label: 'Weak', score, textClass: 'text-emerald-300' };
  }
  if (score < 1.85) {
    return { label: 'Medium', score, textClass: 'text-amber-300' };
  }
  if (score < 2.45) {
    return { label: 'Medium–Strong', score, textClass: 'text-orange-300' };
  }
  return { label: 'Strong', score, textClass: 'text-rose-300' };
}

const SMELL_SEGMENTS: Array<{
  key: keyof SmellBreakdown;
  label: string;
  bg: string;
  textClass: string;
}> = [
  { key: 'none', label: 'None', bg: '#2DD4BF', textClass: 'text-[#0B1410]' },
  { key: 'weak', label: 'Weak', bg: '#34D399', textClass: 'text-[#0B1410]' },
  { key: 'medium', label: 'Medium', bg: '#F59E0B', textClass: 'text-[#181104]' },
  { key: 'strong', label: 'Strong', bg: '#F43F5E', textClass: 'text-white' },
];

/** Normalizes counts/weights to integer percentages summing cleanly to 100% (largest-remainder method) */
function normalizeToPercents(breakdown: SmellBreakdown): Record<keyof SmellBreakdown, number> {
  const keys: Array<keyof SmellBreakdown> = ['none', 'weak', 'medium', 'strong'];
  const total = keys.reduce((sum, k) => sum + Math.max(0, breakdown[k]), 0);
  if (total <= 0) {
    return { none: 0, weak: 0, medium: 0, strong: 0 };
  }
  const exact = keys.map((k) => {
    const val = (Math.max(0, breakdown[k]) / total) * 100;
    const floor = Math.floor(val);
    return { k, floor, rem: val - floor };
  });
  let remainder = 100 - exact.reduce((sum, e) => sum + e.floor, 0);
  const byRem = [...exact].sort((a, b) => b.rem - a.rem);
  for (let i = 0; i < remainder; i += 1) {
    byRem[i % byRem.length].floor += 1;
  }
  const out = { none: 0, weak: 0, medium: 0, strong: 0 };
  for (const item of exact) {
    out[item.k] = item.floor;
  }
  return out;
}

export const SmellStackedBar: React.FC<SmellStackedBarProps> = ({
  smell,
  odorLevel,
  label,
}) => {
  const [hoveredKey, setHoveredKey] = useState<keyof SmellBreakdown | null>(null);

  const percents = useMemo(
    () => normalizeToPercents(smell ?? FALLBACK_SMELL_BY_ODOR[odorLevel]),
    [smell, odorLevel]
  );

  const hoveredSeg = hoveredKey
    ? SMELL_SEGMENTS.find((s) => s.key === hoveredKey) ?? null
    : null;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-baseline justify-between gap-2 min-h-[20px]">
          <span className="text-sm font-semibold text-[#F3F5F8] truncate">
            {label}
          </span>
          {hoveredSeg && (
            <span className="font-mono text-xs tabular-nums shrink-0">
              <span style={{ color: hoveredSeg.bg }} className="font-semibold">
                {hoveredSeg.label}
              </span>{' '}
              <span className="text-[#5C6672]" aria-hidden="true">
                ·
              </span>{' '}
              <span className="text-[#F3F5F8] font-semibold">
                {percents[hoveredSeg.key]}%
              </span>
            </span>
          )}
        </div>
      )}

      {/* Single horizontal 100% stacked bar */}
      <div
        className="flex h-7 w-full overflow-hidden rounded-md bg-[#1C2026] border border-white/10"
        role="img"
        aria-label={`Smell during flowering: ${percents.none}% None, ${percents.weak}% Weak, ${percents.medium}% Medium, ${percents.strong}% Strong`}
      >
        {SMELL_SEGMENTS.map((seg) => {
          const pct = percents[seg.key];
          if (pct <= 0) return null;
          const isDimmed = hoveredKey !== null && hoveredKey !== seg.key;
          return (
            <div
              key={seg.key}
              style={{
                width: `${pct}%`,
                backgroundColor: seg.bg,
                opacity: isDimmed ? 0.45 : 1,
              }}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`h-full flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums transition-opacity duration-150 cursor-default ${seg.textClass}`}
              title={`${seg.label}: ${pct}%`}
            >
              {pct >= 14 ? `${pct}%` : ''}
            </div>
          );
        })}
      </div>

      {/* Unboxed tabular breakdown legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {SMELL_SEGMENTS.map((seg) => {
          const pct = percents[seg.key];
          const isActive = hoveredKey === seg.key;
          return (
            <span
              key={seg.key}
              onMouseEnter={() => setHoveredKey(seg.key)}
              onMouseLeave={() => setHoveredKey(null)}
              className={`flex items-center gap-1.5 transition-colors cursor-default ${
                isActive ? 'text-[#F3F5F8]' : 'text-[#D1D7DF]'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                style={{ backgroundColor: seg.bg }}
              />
              <span>{seg.label}</span>
              <span className="font-mono tabular-nums text-[#F3F5F8]">
                {pct}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Compact visual key explaining Average pin, Typical IQR highlight, and ridge height */
export const DensityRangeLegend: React.FC<{ className?: string }> = ({
  className = '',
}) => (
  <div
    className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#8B95A1] ${className}`}
  >
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex flex-col items-center justify-end w-3 h-3.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F3F5F8] ring-1 ring-[#0D0F12]" />
        <span className="w-[1.5px] h-2 bg-[#F3F5F8]" />
      </span>
      <span>Average</span>
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex flex-col items-center justify-end w-4 h-3 rounded-[2px] bg-emerald-400/30 border-b-2 border-emerald-400" />
      <span>Typical range (middle 50%)</span>
    </span>
    <span className="inline-flex items-center gap-1.5">
      <svg
        width="18"
        height="11"
        viewBox="0 0 18 11"
        fill="none"
        aria-hidden="true"
        className="text-emerald-400"
      >
        <path
          d="M1 9.5 C4.5 9.5, 6 2, 9 2 C12 2, 13.5 9.5, 17 9.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <span>Higher = more likely</span>
    </span>
  </div>
);

interface DensityRangeBarProps {
  range: DistributionRange;
  scaleMin: number;
  scaleMax: number;
  unit: string;
  label?: string;
  sublabel?: string;
  accentHex?: string;
  ticks: number[];
}

/**
 * Distribution Ridge Chart (unified with SativaIndicaRidgeChart):
 * - First line pairs the metric label with its average value (or live hover readout).
 * - Smooth kernel density ridge drawn directly from rawValues / discrete buckets,
 *   or synthesized cleanly from [min, typicalLow, median, typicalHigh, max] for summary strains.
 * - Typical range (middle 50%) is shaded brighter inside the ridge and underscored on the baseline.
 * - Crisp white average pin with floating avg pill sits on the ridge and dims gently while scrubbing.
 */
export const DensityRangeBar: React.FC<DensityRangeBarProps> = ({
  range,
  scaleMin,
  scaleMax,
  unit,
  label,
  sublabel,
  accentHex = '#34D399',
  ticks,
}) => {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const avgValue = useMemo(() => getAverageValue(range), [range]);
  const span = Math.max(0.0001, scaleMax - scaleMin);

  // Extract empirical point samples when available (rawValues preferred, then buckets)
  const empiricalData = useMemo(() => {
    if (range.rawValues && range.rawValues.length > 0) {
      return {
        mode: 'continuous' as const,
        points: range.rawValues.map((v) => ({ value: v, weight: 1 })),
        totalWeight: range.rawValues.length,
      };
    }
    if (range.buckets && range.buckets.length > 0) {
      const hasInterval = range.buckets.some((b) => typeof b.end === 'number');
      const points = range.buckets
        .filter((b) => b.count > 0)
        .map((b) => ({
          value: typeof b.end === 'number' ? (b.value + b.end) / 2 : b.value,
          weight: b.count,
        }));
      const totalWeight = points.reduce((s, p) => s + p.weight, 0);
      if (totalWeight > 0) {
        return {
          mode: hasInterval ? ('interval' as const) : ('discrete' as const),
          points,
          totalWeight,
        };
      }
    }
    return null;
  }, [range.rawValues, range.buckets]);

  // SVG layout geometry (matches approved ridge comparison proportions)
  const viewW = 460;
  const viewH = 128;
  const padL = 8;
  const padR = 8;
  const ridgeTop = 26;
  const baseY = 104;
  const plotW = viewW - padL - padR;
  const peakH = baseY - ridgeTop;

  const toSvgX = (val: number) => {
    const pct = Math.max(0, Math.min(1, (val - scaleMin) / span));
    return padL + pct * plotW;
  };

  const { areaPath, strokePath, peakValue, evalDensityNorm } = useMemo(() => {
    const steps = 160;

    // Choose smooth, data-faithful bandwidth
    const bw =
      unit === 'wks'
        ? 0.68
        : unit === 'cm'
          ? Math.max(8, span * 0.058)
          : Math.max(10, span * 0.072);

    const evalRaw = (x: number): number => {
      if (empiricalData) {
        let sum = 0;
        for (const pt of empiricalData.points) {
          const z = (x - pt.value) / bw;
          sum += pt.weight * Math.exp(-0.5 * z * z);
        }
        return sum / empiricalData.totalWeight;
      }

      // Smooth asymmetric split-Gaussian synthesized from summary stats
      const center = range.median;
      const sigmaL = Math.max(
        span * 0.045,
        (center - range.typicalLow) / 0.6745,
        (center - range.min) / 2.2
      );
      const sigmaR = Math.max(
        span * 0.045,
        (range.typicalHigh - center) / 0.6745,
        (range.max - center) / 2.2
      );
      const sigma = x < center ? sigmaL : sigmaR;
      const z = (x - center) / sigma;
      return Math.exp(-0.5 * z * z);
    };

    const samples: Array<{ x: number; d: number }> = [];
    let maxD = 0;
    let peakX = avgValue;
    for (let i = 0; i <= steps; i += 1) {
      const x = scaleMin + (span * i) / steps;
      const d = evalRaw(x);
      if (d > maxD) {
        maxD = d;
        peakX = x;
      }
      samples.push({ x, d });
    }

    const safeMax = maxD > 0 ? maxD : 1;
    const coords = samples.map((pt) => ({
      sx: padL + ((pt.x - scaleMin) / span) * plotW,
      sy: baseY - (pt.d / safeMax) * peakH,
    }));

    const lineD = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.sx.toFixed(2)} ${c.sy.toFixed(2)}`)
      .join(' ');
    const areaD = `${lineD} L ${(padL + plotW).toFixed(2)} ${baseY.toFixed(2)} L ${padL.toFixed(2)} ${baseY.toFixed(2)} Z`;

    return {
      areaPath: areaD,
      strokePath: lineD,
      peakValue: peakX,
      evalDensityNorm: (x: number) => evalRaw(x) / safeMax,
    };
  }, [
    empiricalData,
    unit,
    span,
    range.median,
    range.typicalLow,
    range.typicalHigh,
    range.min,
    range.max,
    avgValue,
    scaleMin,
    padL,
    plotW,
    baseY,
    peakH,
  ]);

  // Snap hover cleanly to natural increments for each metric type
  const snapStep =
    unit === 'wks'
      ? 1
      : span <= 120
        ? 5
        : span <= 300
          ? 5
          : 10;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relSvgX = ((e.clientX - rect.left) / rect.width) * viewW;
    const rawVal = scaleMin + ((relSvgX - padL) / plotW) * span;
    const clamped = Math.max(scaleMin, Math.min(scaleMax, rawVal));
    const snapped = Math.round(clamped / snapStep) * snapStep;
    setHoverVal(Math.max(scaleMin, Math.min(scaleMax, snapped)));
  };

  // Compute honest hover readout
  const hoverReadout = useMemo(() => {
    if (hoverVal === null) return null;

    if (empiricalData) {
      if (empiricalData.mode === 'discrete') {
        const match = empiricalData.points.find(
          (p) => Math.abs(p.value - hoverVal) < 0.001
        );
        const pct = match
          ? Math.round((match.weight / empiricalData.totalWeight) * 100)
          : 0;
        return {
          valLabel: `${formatMetricNumber(hoverVal, unit)} ${unit}`,
          detail: pct > 0 ? `${pct}% of grows` : 'Rarely reported',
          hasShare: pct > 0,
        };
      }

      const halfWin =
        unit === 'cm' ? 10 : unit === 'g/plant' ? 12.5 : Math.max(10, span * 0.065);
      let weightIn = 0;
      for (const p of empiricalData.points) {
        if (Math.abs(p.value - hoverVal) <= halfWin) {
          weightIn += p.weight;
        }
      }
      const pct = Math.round((weightIn / empiricalData.totalWeight) * 100);
      return {
        valLabel: `~${formatMetricNumber(hoverVal, unit)} ${unit}`,
        detail: pct > 0 ? `${pct}% of grows` : 'Rarely reported',
        hasShare: pct > 0,
      };
    }

    // Summary-only strain readout
    const dNorm = evalDensityNorm(hoverVal);
    const inTypical =
      hoverVal >= range.typicalLow && hoverVal <= range.typicalHigh;
    const detail =
      dNorm >= 0.78
        ? 'Peak likelihood'
        : inTypical
          ? 'Typical range'
          : dNorm >= 0.22
            ? 'Less common'
            : 'Rare outcome';
    return {
      valLabel: `~${formatMetricNumber(hoverVal, unit)} ${unit}`,
      detail,
      hasShare: inTypical || dNorm >= 0.78,
    };
  }, [
    hoverVal,
    empiricalData,
    unit,
    span,
    evalDensityNorm,
    range.typicalLow,
    range.typicalHigh,
  ]);

  const typX1 = toSvgX(range.typicalLow);
  const typX2 = toSvgX(range.typicalHigh);
  const typY1 = baseY - evalDensityNorm(range.typicalLow) * peakH;
  const typY2 = baseY - evalDensityNorm(range.typicalHigh) * peakH;

  const avgX = toSvgX(avgValue);
  const avgY = baseY - evalDensityNorm(avgValue) * peakH;

  const badgeUnit = unit === 'g/plant' ? 'g' : unit;
  const avgBadgeText = `avg ${formatMetricNumber(avgValue, unit)} ${badgeUnit}`;
  const badgeW = Math.max(66, avgBadgeText.length * 6.8 + 16);
  const badgeH = 20;
  const badgeX = Math.max(
    padL,
    Math.min(viewW - padR - badgeW, avgX - badgeW / 2)
  );
  const badgeY = Math.max(2, avgY - badgeH - 9);

  const hoverSvgX = hoverVal !== null ? toSvgX(hoverVal) : null;
  const hoverSvgY =
    hoverVal !== null ? baseY - evalDensityNorm(hoverVal) * peakH : null;
  const isHovering = hoverVal !== null;

  const showUnitOnLastTick = ticks.length <= 6;
  const typClipId = `ridge-typ-clip-${uid}`;
  const tailGradId = `ridge-tail-grad-${uid}`;
  const coreGradId = `ridge-core-grad-${uid}`;

  const peakRounded =
    unit === 'wks'
      ? String(Math.round(peakValue))
      : String(Math.round(peakValue / 5) * 5);

  return (
    <div className="flex flex-col gap-1.5">
      {/* First line: Label + Average (or live hover readout) */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="min-w-0">
          {label && (
            <span className="text-sm font-semibold text-[#F3F5F8] truncate block">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-xs text-[#969FA9]">{sublabel}</span>
          )}
        </div>

        {hoverReadout ? (
          <span className="font-mono text-xs tabular-nums shrink-0">
            <span
              style={{ color: hoverReadout.hasShare ? accentHex : '#D2D9E1' }}
              className="font-semibold"
            >
              {hoverReadout.valLabel}
            </span>{' '}
            <span className="text-[#5C6672]" aria-hidden="true">
              ·
            </span>{' '}
            <span className="text-[#B6BFC9]">{hoverReadout.detail}</span>
          </span>
        ) : (
          <span className="font-mono text-xs tabular-nums text-[#F3F5F8] shrink-0">
            {formatMetricNumber(avgValue, unit)} {unit}{' '}
            <span className="text-[#8B95A1]">average</span>
          </span>
        )}
      </div>

      {/* Smooth interactive Distribution Ridge SVG */}
      <div className="w-full select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-auto overflow-visible touch-none cursor-crosshair"
          role="img"
          aria-label={`${label ?? 'Distribution'}: typical ${range.typicalLow} to ${range.typicalHigh} ${unit}, average ${avgValue} ${unit}, full range ${range.min} to ${range.max} ${unit}`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverVal(null)}
        >
          <defs>
            {/* Outer tails gradient */}
            <linearGradient id={tailGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentHex} stopOpacity="0.22" />
              <stop offset="100%" stopColor={accentHex} stopOpacity="0.06" />
            </linearGradient>

            {/* Brighter typical IQR core gradient */}
            <linearGradient id={coreGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentHex} stopOpacity="0.46" />
              <stop offset="100%" stopColor={accentHex} stopOpacity="0.22" />
            </linearGradient>

            <clipPath id={typClipId}>
              <rect
                x={typX1}
                y={0}
                width={Math.max(1, typX2 - typX1)}
                height={baseY}
              />
            </clipPath>
          </defs>

          {/* Subtle vertical scale grid lines */}
          {ticks.map((t) => {
            const tx = toSvgX(t);
            return (
              <line
                key={`grid-${t}`}
                x1={tx}
                y1={ridgeTop - 4}
                x2={tx}
                y2={baseY}
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={1}
              />
            );
          })}

          {/* Full distribution ridge fill (soft tails) */}
          <path d={areaPath} fill={`url(#${tailGradId})`} />

          {/* Brighter core fill clipped cleanly to typical IQR [typicalLow, typicalHigh] */}
          <path
            d={areaPath}
            fill={`url(#${coreGradId})`}
            clipPath={`url(#${typClipId})`}
          />

          {/* Subtle vertical dashed guides bounding the typical IQR inside the curve */}
          <line
            x1={typX1}
            y1={typY1}
            x2={typX1}
            y2={baseY}
            stroke={accentHex}
            strokeOpacity={0.42}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <line
            x1={typX2}
            y1={typY2}
            x2={typX2}
            y2={baseY}
            stroke={accentHex}
            strokeOpacity={0.42}
            strokeWidth={1}
            strokeDasharray="2 3"
          />

          {/* Glowing accent ridge curve */}
          <path
            d={strokePath}
            fill="none"
            stroke={accentHex}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Baseline track */}
          <line
            x1={padL}
            y1={baseY}
            x2={padL + plotW}
            y2={baseY}
            stroke="rgba(255, 255, 255, 0.14)"
            strokeWidth={1.5}
          />

          {/* Thick accent bar along baseline marking the Typical Range */}
          <rect
            x={typX1}
            y={baseY - 2.2}
            width={Math.max(4, typX2 - typX1)}
            height={4.4}
            rx={2.2}
            fill={accentHex}
            opacity={0.95}
          />

          {/* Crisp White Average Pin + Floating Pill */}
          <g
            style={{
              opacity: isHovering ? 0.36 : 1,
              transition: 'opacity 140ms ease',
            }}
          >
            <line
              x1={avgX}
              y1={avgY}
              x2={avgX}
              y2={baseY + 3}
              stroke="#F3F5F8"
              strokeWidth={1.9}
              strokeLinecap="round"
            />
            <circle
              cx={avgX}
              cy={avgY}
              r={4.5}
              fill="#F3F5F8"
              stroke="#0D0F12"
              strokeWidth={1.8}
            />
            {!isHovering && (
              <>
                <rect
                  x={badgeX}
                  y={badgeY}
                  width={badgeW}
                  height={badgeH}
                  rx={4.5}
                  fill="#1C2230"
                  stroke="rgba(255, 255, 255, 0.28)"
                  strokeWidth={1}
                />
                <text
                  x={badgeX + badgeW / 2}
                  y={badgeY + 13.5}
                  textAnchor="middle"
                  fill="#F3F5F8"
                  fontSize={10.5}
                  fontWeight={600}
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                >
                  {avgBadgeText}
                </text>
              </>
            )}
          </g>

          {/* Interactive hover scrubber */}
          {isHovering && hoverSvgX !== null && hoverSvgY !== null && (
            <g className="pointer-events-none">
              <line
                x1={hoverSvgX}
                y1={ridgeTop - 4}
                x2={hoverSvgX}
                y2={baseY + 3}
                stroke={accentHex}
                strokeOpacity={0.75}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <circle
                cx={hoverSvgX}
                cy={hoverSvgY}
                r={5}
                fill={accentHex}
                stroke="#0D0F12"
                strokeWidth={1.8}
              />
            </g>
          )}

          {/* Scale axis ticks aligned sub-pixel cleanly to gridlines */}
          {ticks.map((t, idx) => {
            const tx = toSvgX(t);
            const anchor =
              idx === 0
                ? 'start'
                : idx === ticks.length - 1
                  ? 'end'
                  : 'middle';
            const isNearHover =
              hoverVal !== null && Math.abs(t - hoverVal) <= snapStep * 0.5;
            return (
              <text
                key={t}
                x={tx}
                y={baseY + 18}
                textAnchor={anchor}
                fill={isNearHover ? '#F3F5F8' : '#7D8793'}
                fontSize={10}
                fontWeight={isNearHover ? 600 : 500}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
              >
                {t}
                {showUnitOnLastTick && idx === ticks.length - 1
                  ? ` ${unit}`
                  : ''}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Compact Typical & Peak summary row below axis */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[11px] font-mono tabular-nums pt-0.5">
        <span style={{ color: accentHex }} className="font-medium">
          Typical: {formatMetricNumber(range.typicalLow, unit)}–
          {formatMetricNumber(range.typicalHigh, unit)} {unit}
        </span>
        <span className="text-[#7D8793]">
          Most common: ~{peakRounded} {unit}
        </span>
      </div>
    </div>
  );
};
