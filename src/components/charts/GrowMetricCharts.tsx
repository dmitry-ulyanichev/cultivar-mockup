import React from 'react';
import { DistributionRange, EaseBreakdown } from '../../types/strain';

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
 * Beginner-friendly Density Intensity Range Bar replacing scatter plots:
 * Color-fill intensity peaks over the typical grower sweet spot and softens
 * toward the outlier tails, anchored by a crisp median marker on a shared scale.
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
  const clampPct = (val: number) => {
    const pct = ((val - scaleMin) / (scaleMax - scaleMin)) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  const minPct = clampPct(range.min);
  const lowPct = clampPct(range.typicalLow);
  const medPct = clampPct(range.median);
  const highPct = clampPct(range.typicalHigh);
  const maxPct = clampPct(range.max);

  const gradId = `density-${label?.replace(/[^a-zA-Z0-9]/g, '') ?? 'bar'}-${range.median}-${scaleMax}`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
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
        <span className="font-mono text-xs tabular-nums text-[#F3F5F8] shrink-0">
          {range.typicalLow}–{range.typicalHigh} {unit}{' '}
          <span className="text-[#8B95A1]">typical</span>
        </span>
      </div>

      {/* Density heat-band track */}
      <div
        className="relative h-8 w-full rounded-md bg-[#111418] border border-white/[0.08] overflow-hidden"
        role="img"
        aria-label={`${label ?? 'Distribution'}: typical ${range.typicalLow} to ${range.typicalHigh} ${unit}, median ${range.median} ${unit}, full range ${range.min} to ${range.max} ${unit}`}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 32"
          preserveAspectRatio="none"
          className="block"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset={`${minPct}%`} stopColor={accentHex} stopOpacity="0" />
              <stop
                offset={`${Math.min(lowPct, minPct + 2)}%`}
                stopColor={accentHex}
                stopOpacity="0.22"
              />
              <stop offset={`${lowPct}%`} stopColor={accentHex} stopOpacity="0.58" />
              <stop offset={`${medPct}%`} stopColor={accentHex} stopOpacity="0.92" />
              <stop offset={`${highPct}%`} stopColor={accentHex} stopOpacity="0.58" />
              <stop
                offset={`${Math.max(highPct, maxPct - 2)}%`}
                stopColor={accentHex}
                stopOpacity="0.22"
              />
              <stop offset={`${maxPct}%`} stopColor={accentHex} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Subtle vertical scale grid lines */}
          {ticks.map((t) => {
            const tx = clampPct(t);
            return (
              <line
                key={t}
                x1={tx}
                y1={0}
                x2={tx}
                y2={32}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="0.4"
              />
            );
          })}

          {/* Soft cloud distribution fill */}
          <rect
            x={minPct}
            y={4}
            width={Math.max(1, maxPct - minPct)}
            height={24}
            rx={3}
            fill={`url(#${gradId})`}
          />

          {/* Core typical-range crisp outline bar */}
          <rect
            x={lowPct}
            y={8}
            width={Math.max(1.5, highPct - lowPct)}
            height={16}
            rx={2}
            fill={accentHex}
            fillOpacity={0.28}
            stroke={accentHex}
            strokeOpacity={0.75}
            strokeWidth="0.45"
          />
        </svg>

        {/* Crisp non-stretched median tick marker */}
        <div
          style={{ left: `${medPct}%` }}
          className="absolute top-0.5 bottom-0.5 w-0.5 -translate-x-1/2 bg-[#F3F5F8] shadow-[0_0_6px_rgba(255,255,255,0.7)] pointer-events-none"
          title={`Median: ${range.median} ${unit}`}
        />
      </div>

      {/* Scale axis ticks */}
      <div className="relative h-4 w-full text-[10px] font-mono tabular-nums text-[#7D8793] select-none">
        {ticks.map((t, idx) => {
          const pct = clampPct(t);
          const translateClass =
            idx === 0
              ? 'translate-x-0'
              : idx === ticks.length - 1
                ? '-translate-x-full'
                : '-translate-x-1/2';
          return (
            <span
              key={t}
              style={{ left: `${pct}%` }}
              className={`absolute top-0 ${translateClass}`}
            >
              {t}
              {idx === ticks.length - 1 ? ` ${unit}` : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
};
