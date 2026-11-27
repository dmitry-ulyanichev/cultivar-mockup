import React, { useState } from 'react';
import { FLAVOR_COLORS, OTHER_FLAVOR_COLOR } from '../../data/strains';
import { ChartFlavorItem, ChartFlavorKey, Strain } from '../../types/strain';
import { getChartFlavors } from '../../utils/matching';

function getFlavorColor(flavor: ChartFlavorKey): string {
  return flavor === 'Other' ? OTHER_FLAVOR_COLOR : FLAVOR_COLORS[flavor];
}

interface SliceData {
  flavor: ChartFlavorKey;
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
  items: ChartFlavorItem[],
  cx: number,
  cy: number,
  radius: number,
  labelRadius: number,
  highlightedFlavors: string[]
): SliceData[] {
  const total = items.reduce((sum, item) => sum + item.exactPercent, 0) || 100;

  let currentAngle = 0;
  const raw = items.map((item) => {
    const angle = (item.exactPercent / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const midAngle = startAngle + angle / 2;
    currentAngle = endAngle;

    return {
      flavor: item.flavor,
      percent: item.percent,
      color: getFlavorColor(item.flavor),
      startAngle,
      endAngle,
      midAngle,
      path: createSlicePath(cx, cy, radius, startAngle, endAngle),
      isHighlighted:
        item.flavor !== 'Other' && highlightedFlavors.includes(item.flavor),
    };
  });

  // Compute outer percentage label coordinates with gentle anti-collision for small slices
  const placed: Array<{ x: number; y: number; angle: number }> = [];
  return raw.map((slice) => {
    let r = labelRadius;
    const angle = slice.midAngle;
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
  strainName: string;
  items: ChartFlavorItem[];
  highlightedFlavors: string[];
  hoveredFlavor: ChartFlavorKey | null;
  onHoverFlavor: (flavor: ChartFlavorKey | null) => void;
  size: number;
  radius: number;
  labelRadius: number;
}

const PieSvg: React.FC<PieSvgProps> = ({
  strainName,
  items,
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
    items,
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
      aria-label={`Flavor profile pie chart for ${strainName}`}
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
            onClick={() =>
              onHoverFlavor(hoveredFlavor === slice.flavor ? null : slice.flavor)
            }
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
  const [hoveredFlavor, setHoveredFlavor] = useState<ChartFlavorKey | null>(
    null
  );

  const items = getChartFlavors(strain, highlightedFlavors, 3);
  const hasHighlight = highlightedFlavors.length > 0;
  const size = compact ? 196 : 228;
  const radius = compact ? 64 : 78;
  const labelRadius = radius + (compact ? 18 : 21);

  const activeFlavor: ChartFlavorKey | null =
    hoveredFlavor ??
    (highlightedFlavors.length === 1
      ? (highlightedFlavors[0] as ChartFlavorKey)
      : null);
  const activeItem = items.find((i) => i.flavor === activeFlavor);
  const otherItem = items.find((i) => i.flavor === 'Other');
  const legendItems = otherItem?.otherBreakdown
    ? items.filter((i) => i.flavor !== 'Other')
    : items;
  const isOtherHovered = hoveredFlavor === 'Other';
  const isOtherDimmed =
    (hoveredFlavor !== null && !isOtherHovered) ||
    (!hoveredFlavor && hasHighlight);

  return (
    <div className={`flex flex-col gap-3 ${!compact ? 'md:contents' : ''}`}>
      {showHeader && (
        <div className="flex items-baseline justify-between gap-2 self-start w-full">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#F3F5F8] truncate">
              {headerTitle ?? `${strain.name} (${strain.breederCode})`}
            </h4>
          </div>
          {activeItem && (
            <span className="font-mono text-xs tabular-nums text-[#F3F5F8] shrink-0">
              {activeItem.flavor} {activeItem.percent}%
            </span>
          )}
        </div>
      )}

      <div className={!compact ? '@container min-w-0 w-full self-start' : ''}>
        <div
          className={`flex items-center ${
            compact
              ? 'flex-col gap-3'
              : 'flex-col gap-3 @[360px]:flex-row @[360px]:gap-4 @[440px]:gap-6 @[360px]:min-h-[280px] justify-center'
          }`}
        >
          {/* Color-coded rectangle flavor list on the left (or grid below when card is narrow) */}
          <ul
            className={
              compact
                ? 'grid grid-cols-3 gap-x-2.5 gap-y-1.5 w-full order-2'
                : 'grid grid-cols-3 gap-x-2.5 gap-y-1.5 w-full order-2 @[360px]:flex @[360px]:flex-col @[360px]:gap-1.5 @[360px]:w-auto @[360px]:shrink-0 @[360px]:order-1 @[360px]:min-w-[108px]'
            }
          >
            {legendItems.map((item) => {
              const isHighlighted =
                item.flavor !== 'Other' &&
                highlightedFlavors.includes(item.flavor);
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
                    onClick={() =>
                      setHoveredFlavor((prev) =>
                        prev === item.flavor ? null : item.flavor
                      )
                    }
                    className={`flex items-center gap-2 w-full text-left rounded px-1 py-0.5 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                      isDimmed ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    <span
                      className="w-4 h-2.5 rounded-[2px] shrink-0 transition-shadow duration-150"
                      style={{
                        backgroundColor: getFlavorColor(item.flavor),
                        boxShadow:
                          isHighlighted || isHovered
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

          <div
            className={`flex items-center justify-center order-1 ${
              compact ? '' : 'h-[280px] @[360px]:h-auto @[360px]:order-2'
            }`}
          >
            <PieSvg
              strainName={strain.name}
              items={items}
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

      {/* Always-visible interactive minor-notes breakdown at the bottom */}
      {otherItem?.otherBreakdown && (
        <div className="pt-2.5 border-t border-white/[0.06] self-start w-full">
          <button
            type="button"
            onMouseEnter={() => setHoveredFlavor('Other')}
            onMouseLeave={() => setHoveredFlavor(null)}
            onFocus={() => setHoveredFlavor('Other')}
            onBlur={() => setHoveredFlavor(null)}
            onClick={() =>
              setHoveredFlavor((prev) => (prev === 'Other' ? null : 'Other'))
            }
            className={`w-full text-left rounded px-1 py-0.5 text-xs leading-relaxed transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
              isOtherDimmed ? 'opacity-40' : 'opacity-100'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 mr-1 align-baseline">
              <span
                className="inline-block w-4 h-2.5 rounded-[2px] shrink-0 translate-y-[0.5px] transition-shadow duration-150"
                style={{
                  backgroundColor: getFlavorColor('Other'),
                  boxShadow: isOtherHovered
                    ? '0 0 0 1.5px #F3F5F8'
                    : undefined,
                }}
              />
              <span
                className={
                  isOtherHovered
                    ? 'font-semibold text-[#F3F5F8]'
                    : 'font-medium text-[#C6CDD6]'
                }
              >
                Other:
              </span>
            </span>
            <span
              className={
                isOtherHovered ? 'text-[#CBD5E1]' : 'text-[#8B95A1]'
              }
            >
              {otherItem.otherBreakdown.map((b, idx) => (
                <span key={b.flavor}>
                  {idx > 0 && ' · '}
                  {b.flavor}{' '}
                  <span
                    className={`font-mono tabular-nums text-[11px] ${
                      isOtherHovered ? 'text-[#B4BEC9]' : 'text-[#78828E]'
                    }`}
                  >
                    {b.percent}%
                  </span>
                </span>
              ))}
            </span>
          </button>
        </div>
      )}
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
 * - Groups minor notes (<3%) into a single "Other" slice (while promoting any user-selected flavor out of "Other").
 * - Single shared color-coded rectangle list on the left serving BOTH charts ("Other" always pinned last).
 * - Hovering or tapping "Other" reveals the exact breakdown of minor notes underneath.
 * - Matching strain pie on the left, User's pick pie on the right, side-by-side on desktop.
 */
export const FlavorPieComparison: React.FC<FlavorPiePairProps> = ({
  matchedStrain,
  referenceStrain,
  highlightedFlavors = [],
  isMobileLayout = false,
}) => {
  const [hoveredFlavor, setHoveredFlavor] = useState<ChartFlavorKey | null>(
    null
  );

  const hasHighlight = highlightedFlavors.length > 0;
  const matchedItems = getChartFlavors(matchedStrain, highlightedFlavors, 3);
  const refItems = referenceStrain
    ? getChartFlavors(referenceStrain, highlightedFlavors, 3)
    : [];

  // Build union of displayed chart flavors across matched (and user's pick) strains, pinning "Other" last
  const flavorUnion: ChartFlavorKey[] = (() => {
    const map = new Map<ChartFlavorKey, number>();
    let hasOther = false;

    const addItems = (list: ChartFlavorItem[]) => {
      list.forEach(({ flavor, exactPercent }) => {
        if (flavor === 'Other') {
          hasOther = true;
        } else {
          map.set(flavor, (map.get(flavor) ?? 0) + exactPercent);
        }
      });
    };

    addItems(matchedItems);
    addItems(refItems);

    const sortedNamed = [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([flavor]) => flavor);

    return hasOther ? [...sortedNamed, 'Other'] : sortedNamed;
  })();

  const matchedOther = matchedItems.find((i) => i.flavor === 'Other');
  const refOther = refItems.find((i) => i.flavor === 'Other');
  const showOtherDetail =
    hoveredFlavor === 'Other' &&
    Boolean(matchedOther?.otherBreakdown || refOther?.otherBreakdown);

  const pieSize = isMobileLayout ? 176 : referenceStrain ? 196 : 220;
  const pieRadius = isMobileLayout ? 56 : referenceStrain ? 65 : 75;
  const labelRadius = pieRadius + (isMobileLayout ? 16 : 18);

  const otherDetailBlock = showOtherDetail ? (
    <div className="text-[11px] leading-relaxed text-[#969FA9] pt-2 border-t border-white/[0.06] flex flex-col gap-1">
      {matchedOther?.otherBreakdown && (
        <div>
          <span className="font-medium text-[#C6CDD6]">
            {referenceStrain
              ? `${matchedStrain.name} — Other: `
              : 'Other: '}
          </span>
          {matchedOther.otherBreakdown.map((b, idx) => (
            <span key={b.flavor}>
              {idx > 0 && ' · '}
              {b.flavor}{' '}
              <span className="font-mono tabular-nums text-[#858F9B]">
                {b.percent}%
              </span>
            </span>
          ))}
        </div>
      )}
      {referenceStrain && refOther?.otherBreakdown && (
        <div>
          <span className="font-medium text-[#C6CDD6]">
            {referenceStrain.name} — Other:{' '}
          </span>
          {refOther.otherBreakdown.map((b, idx) => (
            <span key={b.flavor}>
              {idx > 0 && ' · '}
              {b.flavor}{' '}
              <span className="font-mono tabular-nums text-[#858F9B]">
                {b.percent}%
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  ) : null;

  if (isMobileLayout) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center">
            {referenceStrain && (
              <div className="text-xs font-medium text-emerald-300 mb-1.5 self-start">
                Match · {matchedStrain.name} ({matchedStrain.breederCode})
              </div>
            )}
            <PieSvg
              strainName={matchedStrain.name}
              items={matchedItems}
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
                Your pick · {referenceStrain.name} ({referenceStrain.breederCode})
              </div>
              <PieSvg
                strainName={referenceStrain.name}
                items={refItems}
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
            const isHighlighted =
              flavor !== 'Other' && highlightedFlavors.includes(flavor);
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
                      backgroundColor: getFlavorColor(flavor),
                      boxShadow: isHighlighted
                        ? '0 0 0 1.5px #F3F5F8'
                        : undefined,
                    }}
                  />
                  <span
                    className={`text-[11px] truncate ${
                      isHighlighted || isHovered
                        ? 'text-[#F3F5F8] font-semibold'
                        : flavor === 'Other'
                          ? 'text-[#969FA9]'
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

        {otherDetailBlock}
      </div>
    );
  }

  // Desktop layout: Shared color-rectangle list on the left + 1 or 2 full-size pies side-by-side
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 lg:gap-5">
        {/* Shared Flavor List with Color Rectangles */}
        <ul className="flex flex-col gap-1.5 shrink-0 w-[108px]">
          {flavorUnion.map((flavor) => {
            const isHighlighted =
              flavor !== 'Other' && highlightedFlavors.includes(flavor);
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
                  onClick={() =>
                    setHoveredFlavor((prev) => (prev === flavor ? null : flavor))
                  }
                  className={`flex items-center gap-2 w-full text-left rounded px-1 py-0.5 transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                    isDimmed ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <span
                    className="w-4 h-2.5 rounded-[2px] shrink-0"
                    style={{
                      backgroundColor: getFlavorColor(flavor),
                      boxShadow: isHighlighted
                        ? '0 0 0 1.5px #F3F5F8'
                        : undefined,
                    }}
                  />
                  <span
                    className={`text-xs truncate ${
                      isHighlighted || isHovered
                        ? 'text-[#F3F5F8] font-semibold'
                        : flavor === 'Other'
                          ? 'text-[#969FA9]'
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

        {/* Side-by-side Pie Charts (Matching on left, Your pick on right) */}
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
                  {matchedStrain.name} ({matchedStrain.breederCode})
                </span>
              </div>
            )}
            <PieSvg
              strainName={matchedStrain.name}
              items={matchedItems}
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
                  Your pick
                </span>
                <span className="text-xs text-[#A5AEB9] block truncate">
                  {referenceStrain.name} ({referenceStrain.breederCode})
                </span>
              </div>
              <PieSvg
                strainName={referenceStrain.name}
                items={refItems}
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

      {otherDetailBlock}
    </div>
  );
};
