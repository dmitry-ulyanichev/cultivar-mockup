import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, Star, TrendingDown, TrendingUp } from 'lucide-react';
import {
  MatchResult,
  SelectionCriterion,
  Strain,
  TraitType,
} from '../types/strain';
import { getFinderRowHighlights } from '../utils/matching';
import { ComparisonChartStack } from './ComparisonChartStack';

interface MatchResultsPanelProps {
  referenceStrain?: Strain;
  criteria: SelectionCriterion[];
  matches: MatchResult[];
  comparedMatchId: string | null;
  onSelectComparedMatch: (strainId: string) => void;
  onOpenStrainProfile: (strainId: string) => void;
  onRemoveCriterion: (type: TraitType) => void;
  isMobileLayout?: boolean;
}

export const MatchResultsPanel: React.FC<MatchResultsPanelProps> = ({
  referenceStrain,
  criteria,
  matches,
  comparedMatchId,
  onSelectComparedMatch,
  onOpenStrainProfile,
  isMobileLayout = false,
}) => {
  const [showAll, setShowAll] = useState(false);
  const rowRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const pendingScrollIdRef = useRef<string | null>(null);

  const hasFeedback = Boolean(referenceStrain) || criteria.length > 0;
  const activeMatch =
    matches.find((m) => m.strain.id === comparedMatchId) ?? matches[0];
  const visibleMatches = showAll ? matches.slice(0, 18) : matches.slice(0, 8);
  const hasTraits = criteria.length > 0;

  // On mobile, after collapsing one row's charts and expanding another, keep the newly selected strain header right at the top of the screen
  useLayoutEffect(() => {
    const targetId = pendingScrollIdRef.current;
    if (!targetId || !isMobileLayout || !hasTraits) return;
    if (activeMatch?.strain.id !== targetId) return;

    pendingScrollIdRef.current = null;
    const rowEl = rowRefs.current[targetId];
    if (!rowEl) return;

    const findScrollContainer = (el: HTMLElement): HTMLElement | null => {
      let parent = el.parentElement;
      while (parent && parent !== document.body) {
        const overflowY = window.getComputedStyle(parent).overflowY;
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          parent.scrollHeight > parent.clientHeight + 2
        ) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    };

    const isFirstMatch = matches[0]?.strain.id === targetId;
    const scrollContainer = findScrollContainer(rowEl);

    if (scrollContainer) {
      if (isFirstMatch) {
        scrollContainer.scrollTop = 0;
      } else {
        const containerRect = scrollContainer.getBoundingClientRect();
        const rowRect = rowEl.getBoundingClientRect();
        scrollContainer.scrollTop = Math.max(
          0,
          scrollContainer.scrollTop + (rowRect.top - containerRect.top) - 8
        );
      }
    } else {
      if (isFirstMatch) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        const rowRect = rowEl.getBoundingClientRect();
        window.scrollTo({
          top: Math.max(0, window.scrollY + rowRect.top - 60),
          behavior: 'auto',
        });
      }
    }
  }, [activeMatch?.strain.id, isMobileLayout, hasTraits, matches]);

  if (!hasFeedback) {
    return null;
  }

  return (
    <div className="rounded-xl bg-[#15181D] border border-white/[0.08] overflow-hidden">
      {isMobileLayout ? (
        <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between gap-2 text-xs font-medium text-[#858F9B]">
          <span className="pl-8">Strain</span>
          <span className="pr-[50px]">Match</span>
        </div>
      ) : (
        <div className="px-4 sm:px-5 py-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
          <h4 className="font-display text-sm sm:text-base font-semibold text-[#F3F5F8]">
            Ranked Matches
          </h4>
          <span className="text-xs text-[#858F9B]">
            {hasTraits
              ? 'Click any strain to expand charts'
              : 'Click a row to inspect profile'}
          </span>
        </div>
      )}

      <ul className="divide-y divide-white/[0.06]">
        {visibleMatches.map((item, idx) => {
          const isExpanded = hasTraits && activeMatch?.strain.id === item.strain.id;
          const rowHighlights =
            hasTraits && !isExpanded
              ? getFinderRowHighlights(item.strain, criteria, referenceStrain)
              : [];

          return (
            <li
              key={item.strain.id}
              ref={(el) => {
                rowRefs.current[item.strain.id] = el;
              }}
              className={`transition-colors ${
                isExpanded ? 'bg-emerald-400/[0.04]' : 'hover:bg-white/[0.025]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                <button
                  type="button"
                  onClick={() => {
                    if (hasTraits) {
                      if (isMobileLayout && !isExpanded) {
                        pendingScrollIdRef.current = item.strain.id;
                      }
                      onSelectComparedMatch(item.strain.id);
                    } else {
                      onOpenStrainProfile(item.strain.id);
                    }
                  }}
                  aria-expanded={hasTraits ? isExpanded : undefined}
                  className="flex-1 flex items-center justify-between gap-3 text-left min-w-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="font-mono text-xs tabular-nums text-[#6E7782] pt-0.5 w-5 shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span
                        className={`text-sm font-semibold block truncate ${
                          isExpanded ? 'text-emerald-300' : 'text-[#F3F5F8]'
                        }`}
                      >
                        {item.strain.name}
                      </span>
                      <div className="flex items-center gap-2.5 text-xs text-[#8B95A1] mt-0.5 min-w-0">
                        <span className="truncate">{item.strain.breederName}</span>
                        {!isMobileLayout && (
                          <>
                            <span className="inline-flex items-center gap-0.5 font-mono tabular-nums text-[#C6CDD6] shrink-0">
                              <Star
                                aria-hidden="true"
                                className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0 -translate-y-[0.5px]"
                              />
                              {item.strain.rating.toFixed(1)}/5
                            </span>
                            <span className="font-mono tabular-nums shrink-0">
                              {item.strain.reviewTier} reviews
                            </span>
                          </>
                        )}
                      </div>

                      {rowHighlights.length > 0 && (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs">
                          {rowHighlights.map((hl, hIdx) => (
                            <React.Fragment
                              key={`${item.strain.id}-${hl.label}-${hIdx}`}
                            >
                              {hIdx > 0 && (
                                <span
                                  aria-hidden="true"
                                  className="text-[#5C6672] select-none"
                                >
                                  ·
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 font-medium whitespace-nowrap ${
                                  hl.tone === 'positive'
                                    ? 'text-emerald-300'
                                    : 'text-rose-300/90'
                                }`}
                              >
                                {hl.tone === 'positive' ? (
                                  <TrendingUp
                                    aria-hidden="true"
                                    className="w-3 h-3 shrink-0"
                                  />
                                ) : (
                                  <TrendingDown
                                    aria-hidden="true"
                                    className="w-3 h-3 shrink-0"
                                  />
                                )}
                                <span>{hl.label}</span>
                              </span>
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-sm font-semibold tabular-nums text-emerald-300 whitespace-nowrap">
                      {isMobileLayout
                        ? `${item.matchPercent}%`
                        : `${item.matchPercent}% match`}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenStrainProfile(item.strain.id)}
                  aria-label={`View full profile for ${item.strain.name}`}
                  className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#8B95A1] hover:text-[#F3F5F8] hover:bg-white/[0.06] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                  title="Full strain profile"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded inline comparison charts inside the selected/top match row */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-white/[0.05] bg-[#111418]/65">
                  <ComparisonChartStack
                    referenceStrain={referenceStrain}
                    matchedStrain={item.strain}
                    criteria={criteria}
                    isMobileLayout={isMobileLayout}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {matches.length > 8 && (
        <div className="px-4 sm:px-5 py-3 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
          >
            {showAll
              ? 'Show fewer matches'
              : `Show more matches (${Math.min(18, matches.length)} of ${matches.length})`}
          </button>
        </div>
      )}
    </div>
  );
};
