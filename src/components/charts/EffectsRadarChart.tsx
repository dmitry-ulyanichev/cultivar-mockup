import React, { useId, useMemo, useState } from 'react';
import { EFFECT_CLOCK_ORDER } from '../../data/strains';
import { EffectKey, Strain } from '../../types/strain';
import {
  getEffectRadarScaleMax,
  getEffectShares,
  getSecondaryEffectShares,
} from '../../utils/matching';

/** Option 1 — Day-to-Night vertical semantic gradient (12:00 Stimulating -> 6:00 Sedating) */
const DAY_NIGHT_TOP = '#FBBF24'; // Solar Gold (12:00 Stimulating)
const DAY_NIGHT_MID = '#34D399'; // Botanical Emerald (Balanced middle)
const DAY_NIGHT_BOT = '#818CF8'; // Twilight Indigo (6:00 Sedating)

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

function sampleDayNightColor(yNorm: number): string {
  const t = Math.max(0, Math.min(1, yNorm));
  return t < 0.5
    ? lerpHex(DAY_NIGHT_TOP, DAY_NIGHT_MID, t * 2)
    : lerpHex(DAY_NIGHT_MID, DAY_NIGHT_BOT, (t - 0.5) * 2);
}

interface EffectsRadarChartProps {
  strain: Strain;
  highlightedEffects?: string[];
  accentColor?: string;
  compact?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  minimal?: boolean;
  /** Shared outer-ring percentage scale (defaults to auto-fit ceiling for this strain) */
  scaleMax?: number;
}

export const EffectsRadarChart: React.FC<EffectsRadarChartProps> = ({
  strain,
  highlightedEffects = [],
  compact = false,
  showHeader = true,
  headerTitle,
  minimal = false,
  scaleMax: scaleMaxProp,
}) => {
  const [hoveredEffect, setHoveredEffect] = useState<EffectKey | null>(null);
  const gradientId = useId();

  const effectShares = useMemo(() => getEffectShares(strain), [strain]);
  const secondaryEffects = useMemo(
    () => getSecondaryEffectShares(strain),
    [strain]
  );
  const scaleMax = useMemo(
    () => scaleMaxProp ?? getEffectRadarScaleMax([strain]),
    [scaleMaxProp, strain]
  );

  const width = minimal ? (compact ? 256 : 276) : compact ? 264 : 308;
  const height = minimal ? (compact ? 220 : 232) : compact ? 244 : 280;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = minimal ? (compact ? 64 : 72) : compact ? 74 : 92;
  const labelRadius = maxRadius + (compact || minimal ? 20 : 26);

  const count = EFFECT_CLOCK_ORDER.length;
  const rings = [25, 50, 75, 100];

  const getPoint = (index: number, radius: number) => {
    const angleDeg = (index * 360) / count; // 0 = 12 o'clock (Energetic)
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
      angleDeg,
    };
  };

  const vertices = EFFECT_CLOCK_ORDER.map((effect, i) => {
    const share = effectShares[effect];
    const rRatio = Math.min(1, share.exactPercent / scaleMax);
    const r = rRatio * maxRadius;
    const pt = getPoint(i, r);
    const axisEnd = getPoint(i, maxRadius);
    const labelPt = getPoint(i, labelRadius);
    const yNorm = (pt.y - (cy - maxRadius)) / (2 * maxRadius);
    const pointColor = sampleDayNightColor(yNorm);
    const axisYNorm = (axisEnd.y - (cy - maxRadius)) / (2 * maxRadius);
    const axisColor = sampleDayNightColor(axisYNorm);
    const labelColor =
      share.raw === 0 ? '#67717E' : lerpHex('#7A8491', axisColor, rRatio);
    const highlightedLabelColor =
      share.raw === 0
        ? '#DCE3EC'
        : lerpHex('#DCE3EC', lerpHex(axisColor, '#FFFFFF', 0.35), rRatio);
    return {
      effect,
      percent: share.percent,
      exactPercent: share.exactPercent,
      isZero: share.raw === 0,
      x: pt.x,
      y: pt.y,
      pointColor,
      labelColor,
      highlightedLabelColor,
      axisEndX: axisEnd.x,
      axisEndY: axisEnd.y,
      labelX: labelPt.x,
      labelY: labelPt.y,
      angleDeg: pt.angleDeg,
      isHighlighted: highlightedEffects.includes(effect),
    };
  });

  const polygonPoints = vertices
    .map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`)
    .join(' ');

  const activeEffect =
    hoveredEffect ??
    (highlightedEffects.length === 1
      ? (highlightedEffects[0] as EffectKey)
      : null);
  const activePercent = activeEffect
    ? (effectShares[activeEffect]?.percent ?? 0)
    : null;

  const isFullDesktop = !compact && !minimal;

  return (
    <div
      className={`flex flex-col ${
        isFullDesktop ? 'gap-3 md:contents' : minimal ? 'gap-1' : 'gap-2'
      }`}
    >
      {showHeader && !minimal && (
        <div className="flex items-baseline justify-between gap-2 self-start w-full">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#F3F5F8] truncate">
              {headerTitle ?? `${strain.name} (${strain.breederCode})`}
            </h4>
          </div>
          {activeEffect && activePercent !== null && (
            <span className="font-mono text-xs tabular-nums text-[#F3F5F8] shrink-0">
              {activeEffect} {activePercent}%
            </span>
          )}
        </div>
      )}

      <div
        className={`relative flex flex-col items-center w-full ${
          isFullDesktop ? 'self-start' : ''
        }`}
      >
        {minimal && hoveredEffect && activePercent !== null && (
          <div className="pointer-events-none absolute top-0 right-0 z-10 px-2 py-0.5 rounded bg-[#0E1115]/90 border border-white/10 font-mono text-[10px] tabular-nums text-[#F3F5F8]">
            {hoveredEffect} {activePercent}%
          </div>
        )}

        <div
          className={`flex items-center justify-center w-full ${
            isFullDesktop ? 'h-[280px]' : ''
          }`}
        >
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`${count}-effect logical clock chart for ${strain.name}`}
            className="overflow-visible select-none max-w-full h-auto"
          >
          <defs>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={cx}
              y1={cy - maxRadius}
              x2={cx}
              y2={cy + maxRadius}
            >
              <stop offset="0%" stopColor={DAY_NIGHT_TOP} />
              <stop offset="50%" stopColor={DAY_NIGHT_MID} />
              <stop offset="100%" stopColor={DAY_NIGHT_BOT} />
            </linearGradient>
          </defs>

          {/* Concentric web rings */}
          {rings.map((ring) => {
            const r = (ring / 100) * maxRadius;
            const ringPts = EFFECT_CLOCK_ORDER.map((_, i) => {
              const p = getPoint(i, r);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(' ');
            return (
              <polygon
                key={ring}
                points={ringPts}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={ring === 100 ? 1.1 : 0.8}
                strokeDasharray={ring === 50 ? '2 3' : undefined}
              />
            );
          })}

          {/* Vertical 12-to-6 stimulating/sedating reference spine */}
          <line
            x1={cx}
            y1={cy - maxRadius}
            x2={cx}
            y2={cy + maxRadius}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />

          {/* Spokes */}
          {vertices.map((v) => (
            <line
              key={`spoke-${v.effect}`}
              x1={cx}
              y1={cy}
              x2={v.axisEndX}
              y2={v.axisEndY}
              stroke="rgba(255,255,255,0.09)"
              strokeWidth={0.9}
            />
          ))}

          {/* Data Polygon with Day-to-Night semantic vertical gradient */}
          <polygon
            points={polygonPoints}
            fill={`url(#${gradientId})`}
            fillOpacity={0.26}
            stroke={`url(#${gradientId})`}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Vertices + Hit Targets + Labels */}
          {vertices.map((v) => {
            const isHovered = hoveredEffect === v.effect;
            const isEmphasized = v.isHighlighted || isHovered;

            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            if (v.angleDeg > 15 && v.angleDeg < 170) textAnchor = 'start';
            if (v.angleDeg > 190 && v.angleDeg < 345) textAnchor = 'end';

            const labelOffsetX =
              textAnchor === 'start' ? -4 : textAnchor === 'end' ? 4 : 0;

            return (
              <g
                key={v.effect}
                onMouseEnter={() => setHoveredEffect(v.effect)}
                onMouseLeave={() => setHoveredEffect(null)}
                onClick={() =>
                  setHoveredEffect((prev) =>
                    prev === v.effect ? null : v.effect
                  )
                }
                className="cursor-pointer"
              >
                {/* Wide invisible hit target along the spoke so 0% effects remain easy to inspect */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={v.axisEndX}
                  y2={v.axisEndY}
                  stroke="transparent"
                  strokeWidth={14}
                />
                {isEmphasized && (
                  <circle
                    cx={v.x}
                    cy={v.y}
                    r={7.5}
                    fill={v.pointColor}
                    fillOpacity={0.3}
                  />
                )}
                {(!v.isZero || isEmphasized) && (
                  <circle
                    cx={v.x}
                    cy={v.y}
                    r={isEmphasized ? 4 : 2.6}
                    fill={
                      isEmphasized
                        ? v.isZero
                          ? '#15181D'
                          : '#F3F5F8'
                        : v.pointColor
                    }
                    stroke={v.pointColor}
                    strokeWidth={isEmphasized ? 2 : 1}
                  />
                )}
                {!v.isZero && (
                  <circle cx={v.x} cy={v.y} r={12} fill="transparent" />
                )}
                <text
                  x={v.labelX + labelOffsetX}
                  y={v.labelY}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  style={{
                    fontSize: compact || minimal ? '10px' : '11px',
                    fontWeight: isEmphasized ? 600 : 400,
                    fill: isEmphasized
                      ? v.highlightedLabelColor
                      : v.labelColor,
                  }}
                >
                  {v.effect}
                </text>
              </g>
            );
          })}
          </svg>
        </div>
      </div>

      {secondaryEffects.length > 0 && (
        <div
          className={
            minimal
              ? 'w-full px-1'
              : 'pt-2.5 border-t border-white/[0.06] self-start w-full'
          }
        >
          <p
            className={`text-center text-[#858F9B] ${
              minimal
                ? 'text-[11px] leading-snug'
                : 'py-0.5 text-xs leading-relaxed'
            }`}
          >
            <span>Smokers also mention: </span>
            {secondaryEffects.map((item, idx) => {
              const isHighlighted = highlightedEffects.includes(item.effect);
              return (
                <React.Fragment key={item.effect}>
                  {idx > 0 && <span>, </span>}
                  <span
                    className={
                      isHighlighted
                        ? 'font-medium text-emerald-300'
                        : 'text-[#C2CBD5]'
                    }
                  >
                    {item.effect}{' '}
                    <span className="font-mono tabular-nums text-[10.5px]">
                      ({item.percent}%)
                    </span>
                  </span>
                </React.Fragment>
              );
            })}
          </p>
        </div>
      )}
    </div>
  );
};
