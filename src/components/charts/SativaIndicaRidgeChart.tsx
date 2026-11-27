import React, { useId, useMemo, useRef, useState } from 'react';
import { SativaIndicaVote, Strain } from '../../types/strain';

/** Day-to-Night spectrum aligned with EffectsRadarChart */
const SPECTRUM_SATIVA = '#FBBF24'; // Solar Gold (100% Sativa)
const SPECTRUM_BALANCED = '#34D399'; // Botanical Emerald (50/50)
const SPECTRUM_INDICA = '#818CF8'; // Twilight Indigo (100% Indica)

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Sample Day-to-Night color along x ∈ [0, 100] (0 = 100% Sativa, 100 = 100% Indica) */
function sampleSpectrumColor(indicaPercent: number): string {
  const t = Math.max(0, Math.min(1, indicaPercent / 100));
  return t < 0.5
    ? lerpHex(SPECTRUM_SATIVA, SPECTRUM_BALANCED, t * 2)
    : lerpHex(SPECTRUM_BALANCED, SPECTRUM_INDICA, (t - 0.5) * 2);
}

function formatSpectrumPosition(indicaPercent: number): string {
  const rounded = Math.round(indicaPercent);
  if (rounded >= 48 && rounded <= 52) return '50 / 50 Balanced';
  if (rounded > 52) return `${rounded}% Indica`;
  return `${100 - rounded}% Sativa`;
}

function formatTypicalSpan(lowIndica: number, highIndica: number): string {
  const lo = Math.round(lowIndica);
  const hi = Math.round(highIndica);
  if (lo >= 55) return `${lo}–${hi}% Indica`;
  if (hi <= 45) return `${100 - hi}–${100 - lo}% Sativa`;
  return `${formatSpectrumPosition(lo)} to ${formatSpectrumPosition(hi)}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 50;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function weightedPercentile(
  pairs: Array<{ value: number; weight: number }>,
  p: number
): number {
  if (pairs.length === 0) return 50;
  const sorted = [...pairs].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((acc, item) => acc + item.weight, 0);
  if (totalWeight <= 0) return 50;
  const target = totalWeight * p;
  let cum = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    cum += sorted[i].weight;
    if (cum >= target) return sorted[i].value;
  }
  return sorted[sorted.length - 1].value;
}

/** Deterministic fallback distribution when a catalog strain has only sativaRatio */
function buildSyntheticVotes(sativaRatio: number): SativaIndicaVote[] {
  const center = Math.max(5, Math.min(95, 100 - sativaRatio));
  const offsets = [
    { d: -15, w: 1 },
    { d: -10, w: 2 },
    { d: -5, w: 4 },
    { d: 0, w: 6 },
    { d: 5, w: 5 },
    { d: 10, w: 3 },
    { d: 15, w: 1 },
  ];
  const map = new Map<number, number>();
  for (const { d, w } of offsets) {
    const val = Math.max(0, Math.min(100, Math.round((center + d) / 5) * 5));
    map.set(val, (map.get(val) ?? 0) + w);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([indicaPercent, count]) => ({ indicaPercent, count }));
}

interface HuberResult {
  huberMean: number;
  rawMean: number;
  typicalLow: number;
  typicalHigh: number;
  weightedVotes: Array<{ indicaPercent: number; count: number; weight: number }>;
  totalWeighted: number;
}

function computeHuberConsensus(votes: SativaIndicaVote[]): HuberResult {
  const samples: number[] = [];
  for (const v of votes) {
    const c = Math.max(0, Math.round(v.count));
    for (let i = 0; i < c; i += 1) {
      samples.push(Math.max(0, Math.min(100, v.indicaPercent)));
    }
  }
  samples.sort((a, b) => a - b);

  if (samples.length === 0) {
    return {
      huberMean: 50,
      rawMean: 50,
      typicalLow: 40,
      typicalHigh: 60,
      weightedVotes: [],
      totalWeighted: 0,
    };
  }

  const rawMean = samples.reduce((acc, x) => acc + x, 0) / samples.length;
  const median = percentile(samples, 0.5);
  const absDevs = samples.map((x) => Math.abs(x - median)).sort((a, b) => a - b);
  const mad = percentile(absDevs, 0.5);
  // Floor sigma slightly so tightly clustered distributions never degenerate
  const sigma = Math.max(6, 1.4826 * mad);
  const delta = 1.345 * sigma;

  let mu = median;
  for (let iter = 0; iter < 80; iter += 1) {
    let wSum = 0;
    let wxSum = 0;
    for (const x of samples) {
      const r = Math.abs(x - mu);
      const w = r <= delta ? 1 : delta / r;
      wSum += w;
      wxSum += w * x;
    }
    const nextMu = wSum > 0 ? wxSum / wSum : mu;
    if (Math.abs(nextMu - mu) < 1e-6) {
      mu = nextMu;
      break;
    }
    mu = nextMu;
  }

  const weightedVotes = votes.map((v) => {
    const r = Math.abs(v.indicaPercent - mu);
    const weight = r <= delta ? 1 : delta / r;
    return { ...v, weight };
  });

  const totalWeighted = weightedVotes.reduce(
    (acc, v) => acc + v.count * v.weight,
    0
  );

  const weightedPairs = weightedVotes.map((v) => ({
    value: v.indicaPercent,
    weight: v.count * v.weight,
  }));

  const typicalLow = Math.max(
    0,
    Math.min(100, weightedPercentile(weightedPairs, 0.25))
  );
  const typicalHigh = Math.max(
    typicalLow,
    Math.min(100, weightedPercentile(weightedPairs, 0.75))
  );

  return {
    huberMean: Math.max(0, Math.min(100, mu)),
    rawMean,
    typicalLow,
    typicalHigh,
    weightedVotes,
    totalWeighted,
  };
}

/**
 * Returns the Huber-adjusted Sativa/Indica consensus when empirical balance votes exist,
 * falling back to the strain's declared geneticsType and sativaRatio otherwise.
 */
export function getEffectiveSativaIndicaBalance(strain: Strain): {
  geneticsLabel: string;
  sativaPercent: number;
  indicaPercent: number;
} {
  if (strain.sativaIndicaVotes && strain.sativaIndicaVotes.length > 0) {
    const { huberMean } = computeHuberConsensus(strain.sativaIndicaVotes);
    const indicaPercent = Math.round(huberMean);
    const sativaPercent = 100 - indicaPercent;
    const geneticsLabel =
      indicaPercent > 55
        ? 'Indica-dominant'
        : sativaPercent > 55
          ? 'Sativa-dominant'
          : 'Hybrid';
    return { geneticsLabel, sativaPercent, indicaPercent };
  }

  return {
    geneticsLabel: strain.geneticsType,
    sativaPercent: strain.sativaRatio,
    indicaPercent: 100 - strain.sativaRatio,
  };
}

interface SativaIndicaRidgeChartProps {
  strain: Strain;
  compact?: boolean;
}

export const SativaIndicaRidgeChart: React.FC<SativaIndicaRidgeChartProps> = ({
  strain,
  compact = false,
}) => {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const votes = useMemo(
    () =>
      strain.sativaIndicaVotes && strain.sativaIndicaVotes.length > 0
        ? strain.sativaIndicaVotes
        : buildSyntheticVotes(strain.sativaRatio),
    [strain.sativaIndicaVotes, strain.sativaRatio]
  );

  const stats = useMemo(() => computeHuberConsensus(votes), [votes]);

  // SVG coordinate system
  const viewW = compact ? 360 : 760;
  const viewH = compact ? 156 : 168;
  const padL = compact ? 12 : 16;
  const padR = compact ? 12 : 16;
  const padTop = 36;
  const baseY = compact ? 126 : 134;
  const plotW = viewW - padL - padR;
  const peakH = baseY - padTop;

  const toSvgX = (indicaPercent: number) =>
    padL + (Math.max(0, Math.min(100, indicaPercent)) / 100) * plotW;

  const {
    kdePoints,
    maxDensity,
    areaPath,
    strokePath,
    peakIndica,
    evalDensityNorm,
  } = useMemo(() => {
    const bw = 5.4;
    const steps = 200;
    const rawPts: Array<{ x: number; d: number }> = [];

    const evalKde = (x: number) => {
      if (stats.totalWeighted <= 0) return 0;
      let sum = 0;
      for (const v of stats.weightedVotes) {
        const z = (x - v.indicaPercent) / bw;
        sum += v.count * v.weight * Math.exp(-0.5 * z * z);
      }
      return sum / stats.totalWeighted;
    };

    let maxD = 0;
    let peakX = stats.huberMean;
    for (let i = 0; i <= steps; i += 1) {
      const x = (i / steps) * 100;
      const d = evalKde(x);
      if (d > maxD) {
        maxD = d;
        peakX = x;
      }
      rawPts.push({ x, d });
    }

    const safeMax = maxD > 0 ? maxD : 1;
    const coords = rawPts.map((pt) => ({
      xVal: pt.x,
      sx: padL + (pt.x / 100) * plotW,
      sy: baseY - (pt.d / safeMax) * peakH,
      norm: pt.d / safeMax,
    }));

    const lineD = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.sx.toFixed(2)} ${c.sy.toFixed(2)}`)
      .join(' ');
    const areaD = `${lineD} L ${(padL + plotW).toFixed(2)} ${baseY.toFixed(2)} L ${padL.toFixed(2)} ${baseY.toFixed(2)} Z`;

    return {
      kdePoints: coords,
      maxDensity: safeMax,
      areaPath: areaD,
      strokePath: lineD,
      peakIndica: peakX,
      evalDensityNorm: (x: number) => evalKde(x) / safeMax,
    };
  }, [stats, padL, plotW, baseY, peakH]);

  // Compute weighted share within ±5% window around a hovered x for intuitive readout
  const getWindowSharePercent = (centerIndica: number): number => {
    if (stats.totalWeighted <= 0) return 0;
    let sum = 0;
    for (const v of stats.weightedVotes) {
      if (Math.abs(v.indicaPercent - centerIndica) <= 5) {
        sum += v.count * v.weight;
      }
    }
    return Math.round((sum / stats.totalWeighted) * 100);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relSvgX = ((e.clientX - rect.left) / rect.width) * viewW;
    const clamped = Math.max(0, Math.min(100, ((relSvgX - padL) / plotW) * 100));
    // Snap cleanly to 5% increments matching smoker rating scale
    const snapped = Math.round(clamped / 5) * 5;
    setHoverX(snapped);
  };

  const consensusIndica = Math.round(stats.huberMean);
  const consensusSativa = 100 - consensusIndica;
  const pinX = toSvgX(stats.huberMean);
  const pinY = baseY - evalDensityNorm(stats.huberMean) * peakH;

  // Clamp consensus badge horizontally so it never clips at SVG edges
  const badgeW = compact ? 86 : 94;
  const badgeH = 22;
  const badgeX = Math.max(
    padL,
    Math.min(viewW - padR - badgeW, pinX - badgeW / 2)
  );
  const badgeY = Math.max(4, pinY - badgeH - 12);

  const typX1 = toSvgX(stats.typicalLow);
  const typX2 = toSvgX(stats.typicalHigh);
  const typAccent = sampleSpectrumColor((stats.typicalLow + stats.typicalHigh) / 2);

  const hoverSvgX = hoverX !== null ? toSvgX(hoverX) : null;
  const hoverSvgY =
    hoverX !== null ? baseY - evalDensityNorm(hoverX) * peakH : null;
  const hoverColor = hoverX !== null ? sampleSpectrumColor(hoverX) : '#FFFFFF';
  const hoverShare = hoverX !== null ? getWindowSharePercent(hoverX) : 0;

  const isHovering = hoverX !== null;
  const fillGradId = `ridge-fill-${uid}`;
  const strokeGradId = `ridge-stroke-${uid}`;
  const fadeMaskId = `ridge-fade-${uid}`;

  // Suppress unused variable warning while keeping kdePoints/maxDensity clear
  void kdePoints;
  void maxDensity;

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#F3F5F8]">
            Sativa/Indica Effects Balance
          </h2>
        </div>

        {/* Dynamic right-side readout: Consensus at rest, live band info on hover */}
        <div className="flex items-baseline gap-2 text-xs sm:text-sm font-mono tabular-nums min-h-[22px]">
          {isHovering ? (
            <>
              <span className="font-semibold" style={{ color: hoverColor }}>
                {formatSpectrumPosition(hoverX)}
              </span>
              <span className="text-[#5C6672]" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-[#B6BFC9]">
                {hoverShare > 0
                  ? `${hoverShare}% of consensus (±5%)`
                  : 'Rarely reported'}
              </span>
            </>
          ) : consensusIndica >= 48 && consensusIndica <= 52 ? (
            <span className="font-semibold text-emerald-300">
              50 / 50 Balanced
            </span>
          ) : consensusIndica > 52 ? (
            <>
              <span className="font-semibold text-[#A5B4FC]">
                {consensusIndica}% Indica
              </span>
              <span className="text-[#5C6672]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#FBBF24]/90">
                {consensusSativa}% Sativa
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-[#FBBF24]">
                {consensusSativa}% Sativa
              </span>
              <span className="text-[#5C6672]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#A5B4FC]/90">
                {consensusIndica}% Indica
              </span>
            </>
          )}
        </div>
      </div>

      {/* Interactive Distribution Ridge SVG */}
      <div className="w-full select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewW} ${viewH}`}
          className="w-full h-auto overflow-visible touch-none cursor-crosshair"
          role="img"
          aria-label={`Sativa to Indica balance distribution for ${strain.name}: ${consensusIndica}% Indica, ${consensusSativa}% Sativa. Typical range ${formatTypicalSpan(stats.typicalLow, stats.typicalHigh)}.`}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverX(null)}
        >
          <defs>
            {/* Horizontal Day-to-Night spectrum */}
            <linearGradient id={strokeGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={SPECTRUM_SATIVA} />
              <stop offset="50%" stopColor={SPECTRUM_BALANCED} />
              <stop offset="100%" stopColor={SPECTRUM_INDICA} />
            </linearGradient>

            {/* Translucent horizontal spectrum for area fill */}
            <linearGradient id={fillGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={SPECTRUM_SATIVA} stopOpacity="0.42" />
              <stop offset="50%" stopColor={SPECTRUM_BALANCED} stopOpacity="0.40" />
              <stop offset="100%" stopColor={SPECTRUM_INDICA} stopOpacity="0.48" />
            </linearGradient>

            {/* Vertical softness fade toward the baseline */}
            <linearGradient id={fadeMaskId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.14" />
            </linearGradient>
            <mask id={`${fadeMaskId}-mask`}>
              <rect
                x={padL}
                y={padTop - 8}
                width={plotW}
                height={peakH + 10}
                fill={`url(#${fadeMaskId})`}
              />
            </mask>
          </defs>

          {/* Subtle reference guides (25%, 50%, 75%) */}
          {[25, 50, 75].map((pct) => {
            const gx = toSvgX(pct);
            const isCenter = pct === 50;
            return (
              <line
                key={pct}
                x1={gx}
                y1={padTop}
                x2={gx}
                y2={baseY}
                stroke={
                  isCenter
                    ? 'rgba(52, 211, 153, 0.24)'
                    : 'rgba(255, 255, 255, 0.06)'
                }
                strokeWidth={1}
                strokeDasharray={isCenter ? '3 3' : undefined}
              />
            );
          })}

          {/* Filled Day-to-Night density mountain */}
          <path
            d={areaPath}
            fill={`url(#${fillGradId})`}
            mask={`url(#${fadeMaskId}-mask)`}
          />

          {/* Glowing Day-to-Night ridge curve */}
          <path
            d={strokePath}
            fill="none"
            stroke={`url(#${strokeGradId})`}
            strokeWidth={2.4}
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

          {/* Typical range highlight bar along baseline */}
          <rect
            x={typX1}
            y={baseY - 2.25}
            width={Math.max(4, typX2 - typX1)}
            height={4.5}
            rx={2.25}
            fill={typAccent}
            opacity={0.95}
          />

          {/* Consensus Balance Pin (Huber-adjusted mean) */}
          <g
            style={{
              opacity: isHovering ? 0.38 : 1,
              transition: 'opacity 140ms ease',
            }}
          >
            <line
              x1={pinX}
              y1={pinY}
              x2={pinX}
              y2={baseY + 4}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <circle
              cx={pinX}
              cy={pinY}
              r={5}
              fill="#FFFFFF"
              stroke="#0D0F12"
              strokeWidth={2}
            />
            <rect
              x={badgeX}
              y={badgeY}
              width={badgeW}
              height={badgeH}
              rx={5}
              fill="#1C2230"
              stroke="rgba(255, 255, 255, 0.28)"
              strokeWidth={1}
            />
            <text
              x={badgeX + badgeW / 2}
              y={badgeY + 14.5}
              textAnchor="middle"
              fill="#F3F5F8"
              fontSize={11}
              fontWeight={600}
              fontFamily="JetBrains Mono, ui-monospace, monospace"
            >
              {consensusIndica >= 48 && consensusIndica <= 52
                ? '50/50'
                : consensusIndica > 52
                  ? `${consensusIndica}% Indica`
                  : `${consensusSativa}% Sativa`}
            </text>
          </g>

          {/* Interactive hover scrubber */}
          {isHovering && hoverSvgX !== null && hoverSvgY !== null && (
            <g className="pointer-events-none">
              <line
                x1={hoverSvgX}
                y1={padTop - 4}
                x2={hoverSvgX}
                y2={baseY + 4}
                stroke={hoverColor}
                strokeOpacity={0.65}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
              <circle
                cx={hoverSvgX}
                cy={hoverSvgY}
                r={5.5}
                fill={hoverColor}
                stroke="#0D0F12"
                strokeWidth={2}
              />
            </g>
          )}

          {/* Horizontal spectrum ticks */}
          {(compact
            ? [
                { pct: 0, label: '100% Sativa', color: SPECTRUM_SATIVA, anchor: 'start' as const, bold: true },
                { pct: 50, label: 'Balanced', color: SPECTRUM_BALANCED, anchor: 'middle' as const, bold: true },
                { pct: 100, label: '100% Indica', color: SPECTRUM_INDICA, anchor: 'end' as const, bold: true },
              ]
            : [
                { pct: 0, label: '100% Sativa', color: SPECTRUM_SATIVA, anchor: 'start' as const, bold: true },
                { pct: 25, label: '75% Sativa', color: '#858F9B', anchor: 'middle' as const, bold: false },
                { pct: 50, label: '50 / 50 Balanced', color: SPECTRUM_BALANCED, anchor: 'middle' as const, bold: true },
                { pct: 75, label: '75% Indica', color: '#858F9B', anchor: 'middle' as const, bold: false },
                { pct: 100, label: '100% Indica', color: SPECTRUM_INDICA, anchor: 'end' as const, bold: true },
              ]
          ).map((tick) => (
            <text
              key={tick.pct}
              x={toSvgX(tick.pct)}
              y={baseY + 20}
              textAnchor={tick.anchor}
              fill={tick.color}
              fontSize={11}
              fontWeight={tick.bold ? 600 : 500}
              fontFamily="JetBrains Mono, ui-monospace, monospace"
            >
              {tick.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Compact legend / typical summary footer */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-2.5 border-t border-white/[0.06] text-[11px] text-[#8B95A1]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-3.5 h-[4px] rounded-full"
              style={{ backgroundColor: typAccent }}
              aria-hidden="true"
            />
            <span>
              Typical range:{' '}
              <strong className="font-mono font-medium text-[#D2D9E1]">
                {formatTypicalSpan(stats.typicalLow, stats.typicalHigh)}
              </strong>
            </span>
          </span>

          <span className="text-[#4B5563]" aria-hidden="true">
            ·
          </span>

          <span>
            Peak:{' '}
            <strong className="font-mono font-medium text-[#D2D9E1]">
              {formatSpectrumPosition(peakIndica)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
