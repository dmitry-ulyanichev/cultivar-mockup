import React, { useState } from 'react';
import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import {
  MatchResult,
  SelectionCriterion,
  Strain,
  TraitType,
} from '../types/strain';
import { ComparisonChartStack } from './ComparisonChartStack';

interface MatchResultsPanelProps {
  referenceStrain?: Strain;
  criteria: SelectionCriterion[];
  matches: MatchResult[];
  comparedMatchId: string | null;
  onSelectComparedMatch: (strainId: string) => void;
  onOpenStrainProfile: (strainId: string) => void;
  onRemoveCriterion: (type: TraitType) => void;
  onLoadPreset: (preset: 'afghan-flavor' | 'beginner-auto' | 'citrus-day') => void;
  isMobileLayout?: boolean;
}

export const MatchResultsPanel: React.FC<MatchResultsPanelProps> = ({
  referenceStrain,
  criteria,
  matches,
  comparedMatchId,
  onSelectComparedMatch,
  onOpenStrainProfile,
  onLoadPreset,
  isMobileLayout = false,
}) => {
  const [showAll, setShowAll] = useState(false);

  const hasFeedback = Boolean(referenceStrain) || criteria.length > 0;

  // Empty / Zero State before user provides any feedback
  if (!hasFeedback) {
    return (
      <div className="rounded-xl bg-[#15181D] border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-center min-h-[320px]">
        <div className="max-w-lg">
          <div className="w-10 h-10 rounded-lg bg-[#1C2026] border border-white/10 flex items-center justify-center text-emerald-300 mb-4">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg sm:text-xl font-semibold text-[#F3F5F8]">
            Live Matches & Comparison Charts
          </h3>
          <p className="text-sm text-[#969FA9] mt-2 leading-relaxed">
            As soon as you enter a strain you liked—or pick a characteristic like
            Flavor, Effects, or Easy Growing—your closest seed matches appear
            here with side-by-side visual comparisons.
          </p>

          <div className="mt-6 pt-5 border-t border-white/[0.07]">
            <p className="text-xs text-[#858F9B] mb-2.5">
              Or try a quick example scenario:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onLoadPreset('afghan-flavor')}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1C2026] hover:bg-[#252B34] border border-white/10 text-[#E5EAF0] transition-colors whitespace-nowrap min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Afghan Kush Auto [FB] + Earthy Flavor
              </button>
              <button
                type="button"
                onClick={() => onLoadPreset('citrus-day')}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1C2026] hover:bg-[#252B34] border border-white/10 text-[#E5EAF0] transition-colors whitespace-nowrap min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Citrus + Energetic Effects
              </button>
              <button
                type="button"
                onClick={() => onLoadPreset('beginner-auto')}
                className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1C2026] hover:bg-[#252B34] border border-white/10 text-[#E5EAF0] transition-colors whitespace-nowrap min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Easy + Fast + Compact Auto
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeMatch =
    matches.find((m) => m.strain.id === comparedMatchId) ?? matches[0];
  const visibleMatches = showAll ? matches.slice(0, 18) : matches.slice(0, 8);
  const hasTraits = criteria.length > 0;

  return (
    <div className="rounded-xl bg-[#15181D] border border-white/[0.08] overflow-hidden">
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

      <ul className="divide-y divide-white/[0.06]">
        {visibleMatches.map((item, idx) => {
          const isExpanded = hasTraits && activeMatch?.strain.id === item.strain.id;

          return (
            <li
              key={item.strain.id}
              className={`transition-colors ${
                isExpanded ? 'bg-emerald-400/[0.04]' : 'hover:bg-white/[0.025]'
              }`}
            >
              <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                <button
                  type="button"
                  onClick={() => {
                    if (hasTraits) {
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
                      <div className="text-xs text-[#8B95A1] truncate mt-0.5">
                        <span>{item.strain.breederName}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums text-[#C6CDD6]">
                          {item.strain.rating.toFixed(1)}/5
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span className="font-mono tabular-nums">
                          {item.strain.reviewTier} reviews
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-sm font-semibold tabular-nums block ${
                        item.matchPercent >= 85
                          ? 'text-emerald-300'
                          : item.matchPercent >= 72
                            ? 'text-[#F3F5F8]'
                            : 'text-[#A5AEB9]'
                      }`}
                    >
                      {item.matchPercent}%
                    </span>
                    <span className="text-[11px] text-[#7D8793]">match</span>
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
