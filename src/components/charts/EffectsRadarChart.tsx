import React, { useState } from 'react';
import { EFFECT_CLOCK_ORDER } from '../../data/strains';
import { EffectKey, Strain } from '../../types/strain';

interface EffectsRadarChartProps {
  strain: Strain;
  highlightedEffects?: string[];
  accentColor?: string;
  compact?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  minimal?: boolean;
}

export const EffectsRadarChart: React.FC<EffectsRadarChartProps> = ({
  strain,
  highlightedEffects = [],
  accentColor = '#34D399',
  compact = false,
  showHeader = true,
  headerTitle,
  minimal = false,
}) => {
  const [hoveredEffect, setHoveredEffect] = useState<EffectKey | null>(null);

  const width = minimal ? (compact ? 248 : 268) : compact ? 256 : 300;
  const height = minimal ? (compact ? 216 : 228) : compact ? 240 : 276;
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = minimal ? (compact ? 66 : 74) : compact ? 74 : 92;
  const labelRadius = maxRadius + (compact || minimal ? 20 : 26);

  const count = EFFECT_CLOCK_ORDER.length;
  const rings = [25, 50, 75, 100];

  const getPoint = (index: number, radius: number) => {
    const angleDeg = (index * 360) / count; // 0 = 12 o'clock (Energetic), 180 = 6 o'clock (Sleepy)
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
      angleDeg,
    };
  };

  const vertices = EFFECT_CLOCK_ORDER.map((effect, i) => {
    const val = strain.effectsProfile[effect] ?? 0;
    const r = (val / 100) * maxRadius;
    const pt = getPoint(i, r);
    const axisEnd = getPoint(i, maxRadius);
    const labelPt = getPoint(i, labelRadius);
    return {
      effect,
      value: val,
      x: pt.x,
      y: pt.y,
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
  const activeValue = activeEffect ? strain.effectsProfile[activeEffect] : null;

  return (
    <div className="flex flex-col gap-2">
      {showHeader && !minimal && (
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#F3F5F8] truncate">
              {headerTitle ?? `${strain.name} [${strain.breederCode}]`}
            </h4>
            <p className="text-xs text-[#969FA9]">
              Effects Dial · {strain.reviewTier} reviews
            </p>
          </div>
          {activeEffect && activeValue !== null && (
            <span className="font-mono text-xs tabular-nums text-[#F3F5F8] shrink-0">
              {activeEffect} {activeValue}%
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col items-center">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`10-effect logical clock chart for ${strain.name}`}
          className="overflow-visible select-none max-w-full"
        >
          {/* Concentric 10-sided web rings */}
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
          {vertices.map((v) => {
            const isActive = v.isHighlighted || hoveredEffect === v.effect;
            return (
              <line
                key={`spoke-${v.effect}`}
                x1={cx}
                y1={cy}
                x2={v.axisEndX}
                y2={v.axisEndY}
                stroke={isActive ? accentColor : 'rgba(255,255,255,0.09)'}
                strokeWidth={isActive ? 1.8 : 0.9}
                strokeOpacity={isActive ? 0.85 : 1}
              />
            );
          })}

          {/* Data Polygon */}
          <polygon
            points={polygonPoints}
            fill={accentColor}
            fillOpacity={0.2}
            stroke={accentColor}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Vertices + Hit Targets + Labels */}
          {vertices.map((v) => {
            const isHovered = hoveredEffect === v.effect;
            const isEmphasized = v.isHighlighted || isHovered;

            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            if (v.angleDeg > 15 && v.angleDeg < 165) textAnchor = 'start';
            if (v.angleDeg > 195 && v.angleDeg < 345) textAnchor = 'end';

            const labelOffsetX =
              textAnchor === 'start' ? -4 : textAnchor === 'end' ? 4 : 0;

            return (
              <g
                key={v.effect}
                onMouseEnter={() => setHoveredEffect(v.effect)}
                onMouseLeave={() => setHoveredEffect(null)}
                className="cursor-pointer"
              >
                {isEmphasized && (
                  <circle
                    cx={v.x}
                    cy={v.y}
                    r={7.5}
                    fill={accentColor}
                    fillOpacity={0.28}
                  />
                )}
                <circle
                  cx={v.x}
                  cy={v.y}
                  r={isEmphasized ? 4 : 2.6}
                  fill={isEmphasized ? '#F3F5F8' : accentColor}
                  stroke={accentColor}
                  strokeWidth={isEmphasized ? 2 : 1}
                />
                <circle cx={v.x} cy={v.y} r={12} fill="transparent" />
                <text
                  x={v.labelX + labelOffsetX}
                  y={v.labelY}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  style={{
                    fontSize: compact || minimal ? '10px' : '11px',
                    fontWeight: isEmphasized ? 600 : 400,
                    fill: isEmphasized
                      ? '#F3F5F8'
                      : v.effect === 'Energetic' || v.effect === 'Sleepy'
                        ? '#D1D7DF'
                        : '#969FA9',
                  }}
                >
                  {v.effect}
                </text>
              </g>
            );
          })}
        </svg>

        {!minimal && (
          <div className="flex items-center justify-between w-full px-1 text-[11px] text-[#7D8793]">
            <span>12:00 Stimulating</span>
            <span>6:00 Sedating</span>
          </div>
        )}
      </div>
    </div>
  );
};
