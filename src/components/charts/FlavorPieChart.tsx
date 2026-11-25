import React, { useState } from 'react';
import { FLAVOR_COLORS } from '../../data/strains';
import { FlavorKey, Strain } from '../../types/strain';
import { getSortedFlavors } from '../../utils/matching';

interface SliceData {
  flavor: FlavorKey;
  percent: number;
  color: string;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  path: string;
  labelX: number;
  labelY: number;
  isHighlighted: boolean;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function createSlicePath(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  }
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function buildSlices(
  strain: Strain,
  cx: number,
  cy: number,
  radius: number,
  labelRadius: number,
  highlightedFlavors: string[]
): SliceData[] {
  const items = getSortedFlavors(strain);
  const total = items.reduce((sum, item) => sum + item.percent, 0) || 100;

  let currentAngle = 0;
  const raw = items.map((item) => {
    const angle = (item.percent / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = startAngle + angle / 2;
    currentAngle = endAngle;

    return {
      flavor: item.flavor,
      percent: item.percent,
      color: FLAVOR_COLORS[item.flavor],
      startAngle,
      endAngle,
      midAngle,
      path: createSlicePath(cx, cy, radius, startAngle, endAngle),
      isHighlighted: highlightedFlavors.includes(item.flavor),
    };
  });

  // Compute outer percentage label coordinates with gentle anti-collision for tiny slices (e.g. around 11:00)
  const placed: Array<{ x: number; y: number; angle: number }> = [];
  return raw.map((slice) => {
    let r = labelRadius;
    let angle = slice.midAngle;
    let pos = polarToCartesian(cx, cy, r, angle);

    if (placed.length > 0) {
      const prev = placed[placed.length - 1];
      const dist = Math.hypot(pos.x - prev.x, pos.y - prev.y);
      if (dist < 17) {
        r = labelRadius + 7;
        pos = polarToCartesian(cx, cy, r, angle);
      }
    }

    placed.push({ x: pos.x, y: pos.y, angle });

    return {
      ...slice,
      labelX: pos.x,
      labelY: pos.y,
    };
  });
}

interface PieSvgProps {
  strain: Strain;
  highlightedFlavors: string[];
  hoveredFlavor: FlavorKey | null;
  onHoverFlavor: (flavor: FlavorKey | null) => void;
  size: number;
  radius: number;
  labelRadius: number;
}

const PieSvg: React.FC<PieSvgProps> = ({
  strain,
  highlightedFlavors,
  hoveredFlavor,
  onHoverFlavor,
  size,
  radius,
  labelRadius,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const hasHighlight = highlightedFlavors.length > 0;
  const slices = buildSlices(
    strain,
    cx,
    cy,
    radius,
    labelRadius,
    highlightedFlavors
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Flavor profile pie chart for ${strain.name}`}
      className="overflow-visible select-none shrink-0"
    >
      {slices.map((slice) => {
        const isHovered = hoveredFlavor === slice.flavor;
        const isPopped = slice.isHighlighted || isHovered;
        const isDimmed =
          (hoveredFlavor && !isHovered) ||
          (!hoveredFlavor && hasHighlight && !slice.isHighlighted);

        const popDist = isPopped ? 6 : 0;
        const popRad = ((slice.midAngle - 90) * Math.PI) / 180;
        const dx = Math.cos(popRad) * popDist;
        const dy = Math.sin(popRad) * popDist;

        return (
          <g
            key={slice.flavor}
            transform={`translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`}
            style={{
              transition:
                'transform 180ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease',
              opacity: isDimmed ? 0.38 : 1,
              cursor: 'pointer',
            }}
            onMouseEnter={() => onHoverFlavor(slice.flavor)}
            onMouseLeave={() => onHoverFlavor(null)}
          >
            <path
              d={slice.path}
              fill={slice.color}
              stroke={isPopped ? '#F3F5F8' : '#15181D'}
              strokeWidth={isPopped ? 1.8 : 1.1}
              strokeLinejoin="round"
            />
            <text
              x={slice.labelX}
              y={slice.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-mono tabular-nums pointer-events-none"
              style={{
                fontSize: size <= 200 ? '10px' : '11px',
                fontWeight: isPopped ? 600 : 500,
                fill: isPopped ? '#F3F5F8' : '#C6CDD6',
              }}
            >
              {slice.percent}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

interface FlavorPieChartProps {
  strain: Strain;
  highlightedFlavors?: string[];
  compact?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
}

export const FlavorPieChart: React.FC<FlavorPieChartProps> = ({
  strain,
  highlightedFlavors = [],
  compact = false,
  showHeader = true,
  headerTitle,
}) => {
  const [hoveredFlavor, setHoveredFlavor] = useState<FlavorKey | null>(null);

  const items = getSortedFlavors(strain);
  const hasHighlight = highlightedFlavors.length > 0;
  const size = compact ? 196 : 228;
  const radius = compact ? 64 : 78;
  const labelRadius = radius + (compact ? 18 : 21);

  const activeFlavor =
    hoveredFlavor ??
    (highlightedFlavors.length === 1
      ? (highlightedFlavors[0] as FlavorKey)
      : null);
  const activeItem = items.find((i) => i.flavor === activeFlavor);

  return (
    <div className="flex flex-col gap-3">
      {showHeader && (
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#F3F5F8] truncate">
              {headerTitle ?? `${strain.name} [${strain.breederCode}]`}
            </h4>
            <p className="text-xs text-[#969FA9]">
              Flavor Profile · {strain.reviewTier} reviews
            </p>
          </div>
          {activeItem && (
            <span className="font-mono text-xs tabular-nums text-[#F3F5F8] shrink-0">
              {activeItem.flavor} {activeItem.percent}%
            </span>
          )}
        </div>
      )}

      <div
        className={`flex items-center ${
          compact ? 'flex-col gap-3' : 'flex-row gap-6 justify-center'
        }`}
      >
        {/* Color-coded rectangle flavor list on the left */}
        <ul
          className={
            compact
              ? 'grid grid-cols-3 gap-x-2.5 gap-y-1.5 w-full order-2'
              : 'flex flex-col gap-1.5 shrink-0 order-1 min-w-[116px]'
          }
        >
          {items.map((item) => {
            const isHighlighted = highlightedFlavors.includes(item.flavor);
            const isHovered = hoveredFlavor === item.flavor;
            const isDimmed =
              (hoveredFlavor && !isHovered) ||
              (!hoveredFlavor && hasHighlight && !isHighlighted);

            return (
              <li key={item.flavor}>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredFlavor(item.flavor)}
                  onMouseLeave={() => setHoveredFlavor(null)}
                  onFocus={() => setHoveredFlavor(item.flavor)}
                  onBlur={() => setHoveredFlavor(null)}
                  className={`flex items-center gap-2 w-full text-left rounded px-1 py-0.5 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                    isDimmed ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <span
                    className="w-4 h-2.5 rounded-[2px] shrink-0"
                    style={{
                      backgroundColor: FLAVOR_COLORS[item.flavor],
                      boxShadow: isHighlighted
                        ? '0 0 0 1.5px #F3F5F8'
                        : undefined,
                    }}
                  />
                  <span
                    className={`text-xs truncate ${
                      isHighlighted || isHovered
                        ? 'text-[#F3F5F8] font-semibold'
                        : 'text-[#C6CDD6]'
                    }`}
                  >
                    {item.flavor}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-center order-1 sm:order-2">
          <PieSvg
            strain={strain}
            highlightedFlavors={highlightedFlavors}
            hoveredFlavor={hoveredFlavor}
            onHoverFlavor={setHoveredFlavor}
            size={size}
            radius={radius}
            labelRadius={labelRadius}
          />
        </div>
      </div>
    </div>
  );
};

interface FlavorPiePairProps {
  matchedStrain: Strain;
  referenceStrain?: Strain;
  highlightedFlavors?: string[];
  isMobileLayout?: boolean;
}

/**
 * Unified Flavor Pie view for the expanded match row:
 * - Single shared color-coded rectangle list on the left serving BOTH charts.
 * - Hovering any flavor highlights that slice on both charts simultaneously.
 * - All slice percentages (including smaller slices near 11:00) stay visible.
 * - Matching strain pie on the left, Reference strain pie on the right, side-by-side on desktop.
 */
export const FlavorPieComparison: React.FC<FlavorPiePairProps> = ({
  matchedStrain,
  referenceStrain,
  highlightedFlavors = [],
  isMobileLayout = false,
}) => {
  const [hoveredFlavor, setHoveredFlavor] = useState<FlavorKey | null>(null);

  const hasHighlight = highlightedFlavors.length > 0;

  // Build union of all flavors present across matched (and reference) strains, ordered by combined share
  const flavorUnion: FlavorKey[] = (() => {
    const map = new Map<FlavorKey, number>();
    getSortedFlavors(matchedStrain).forEach(({ flavor, percent }) => {
      map.set(flavor, (map.get(flavor) ?? 0) + percent);
    });
    if (referenceStrain) {
      getSortedFlavors(referenceStrain).forEach(({ flavor, percent }) => {
        map.set(flavor, (map.get(flavor) ?? 0) + percent);
      });
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([flavor]) => flavor);
  })();

  const pieSize = isMobileLayout ? 176 : referenceStrain ? 196 : 220;
  const pieRadius = isMobileLayout ? 56 : referenceStrain ? 65 : 75;
  const labelRadius = pieRadius + (isMobileLayout ? 16 : 18);

  if (isMobileLayout) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center">
            {referenceStrain && (
              <div className="text-xs font-medium text-emerald-300 mb-1.5 self-start">
                Match · {matchedStrain.name} [{matchedStrain.breederCode}]
              </div>
            )}
            <PieSvg
              strain={matchedStrain}
              highlightedFlavors={highlightedFlavors}
              hoveredFlavor={hoveredFlavor}
              onHoverFlavor={setHoveredFlavor}
              size={pieSize}
              radius={pieRadius}
              labelRadius={labelRadius}
            />
          </div>

          {referenceStrain && (
            <div className="flex flex-col items-center pt-3 border-t border-white/[0.06]">
              <div className="text-xs font-medium text-sky-300/90 mb-1.5 self-start">
                Your pick · {referenceStrain.name} [{referenceStrain.breederCode}]
              </div>
              <PieSvg
                strain={referenceStrain}
                highlightedFlavors={highlightedFlavors}
                hoveredFlavor={hoveredFlavor}
                onHoverFlavor={setHoveredFlavor}
                size={pieSize}
                radius={pieRadius}
                labelRadius={labelRadius}
              />
            </div>
          )}
        </div>

        {/* Shared color-coded flavor key */}
        <ul className="grid grid-cols-3 gap-x-2 gap-y-1.5 pt-2 border-t border-white/[0.06]">
          {flavorUnion.map((flavor) => {
            const isHighlighted = highlightedFlavors.includes(flavor);
            const isHovered = hoveredFlavor === flavor;
            const isDimmed =
              (hoveredFlavor && !isHovered) ||
              (!hoveredFlavor && hasHighlight && !isHighlighted);

            return (
              <li key={flavor}>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredFlavor(flavor)}
                  onMouseLeave={() => setHoveredFlavor(null)}
                  onClick={() =>
                    setHoveredFlavor((prev) => (prev === flavor ? null : flavor))
                  }
                  className={`flex items-center gap-1.5 w-full text-left rounded py-0.5 transition-opacity ${
                    isDimmed ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <span
                    className="w-3.5 h-2.5 rounded-[2px] shrink-0"
                    style={{
                      backgroundColor: FLAVOR_COLORS[flavor],
                      boxShadow: isHighlighted
                        ? '0 0 0 1.5px #F3F5F8'
                        : undefined,
                    }}
                  />
                  <span
                    className={`text-[11px] truncate ${
                      isHighlighted || isHovered
                        ? 'text-[#F3F5F8] font-semibold'
                        : 'text-[#C6CDD6]'
                    }`}
                  >
                    {flavor}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // Desktop layout: Shared color-rectangle list on the left + 1 or 2 full-size pies side-by-side
  return (
    <div className="flex items-center gap-4 lg:gap-5">
      {/* Shared Flavor List with Color Rectangles */}
      <ul className="flex flex-col gap-1.5 shrink-0 w-[108px]">
        {flavorUnion.map((flavor) => {
          const isHighlighted = highlightedFlavors.includes(flavor);
          const isHovered = hoveredFlavor === flavor;
          const isDimmed =
            (hoveredFlavor && !isHovered) ||
            (!hoveredFlavor && hasHighlight && !isHighlighted);

          return (
            <li key={flavor}>
              <button
                type="button"
                onMouseEnter={() => setHoveredFlavor(flavor)}
                onMouseLeave={() => setHoveredFlavor(null)}
                onFocus={() => setHoveredFlavor(flavor)}
                onBlur={() => setHoveredFlavor(null)}
                className={`flex items-center gap-2 w-full text-left rounded px-1 py-0.5 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                  isDimmed ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <span
                  className="w-4 h-2.5 rounded-[2px] shrink-0"
                  style={{
                    backgroundColor: FLAVOR_COLORS[flavor],
                    boxShadow: isHighlighted
                      ? '0 0 0 1.5px #F3F5F8'
                      : undefined,
                  }}
                />
                <span
                  className={`text-xs truncate ${
                    isHighlighted || isHovered
                      ? 'text-[#F3F5F8] font-semibold'
                      : 'text-[#C6CDD6]'
                  }`}
                >
                  {flavor}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Side-by-side Pie Charts (Matching on left, Reference on right) */}
      <div
        className={
          referenceStrain
            ? 'flex-1 grid grid-cols-2 gap-3 items-center divide-x divide-white/[0.06]'
            : 'flex-1 flex justify-center'
        }
      >
        <div className="flex flex-col items-center">
          {referenceStrain && (
            <div className="text-center mb-1.5 max-w-[200px]">
              <span className="text-[11px] font-semibold text-emerald-300 block">
                Match
              </span>
              <span className="text-xs text-[#D8DEE6] block truncate">
                {matchedStrain.name} [{matchedStrain.breederCode}]
              </span>
            </div>
          )}
          <PieSvg
            strain={matchedStrain}
            highlightedFlavors={highlightedFlavors}
            hoveredFlavor={hoveredFlavor}
            onHoverFlavor={setHoveredFlavor}
            size={pieSize}
            radius={pieRadius}
            labelRadius={labelRadius}
          />
        </div>

        {referenceStrain && (
          <div className="flex flex-col items-center pl-3">
            <div className="text-center mb-1.5 max-w-[200px]">
              <span className="text-[11px] font-semibold text-sky-300/90 block">
                Your reference
              </span>
              <span className="text-xs text-[#A5AEB9] block truncate">
                {referenceStrain.name} [{referenceStrain.breederCode}]
              </span>
            </div>
            <PieSvg
              strain={referenceStrain}
              highlightedFlavors={highlightedFlavors}
              hoveredFlavor={hoveredFlavor}
              onHoverFlavor={setHoveredFlavor}
              size={pieSize}
              radius={pieRadius}
              labelRadius={labelRadius}
            />
          </div>
        )}
      </div>
    </div>
  );
};
