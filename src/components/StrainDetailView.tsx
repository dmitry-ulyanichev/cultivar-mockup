import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { STRAINS } from '../data/strains';
import { ComparisonNote, Strain } from '../types/strain';
import { getSimilarStrains } from '../utils/matching';
import { EffectsRadarChart } from './charts/EffectsRadarChart';
import { FlavorPieChart } from './charts/FlavorPieChart';
import { DensityRangeBar, EaseStackedBar } from './charts/GrowMetricCharts';

interface StrainDetailViewProps {
  strain: Strain;
  onSelectStrain: (strainId: string) => void;
  onExploreInFinder: (strainId: string) => void;
  onBack: () => void;
  isMobileLayout?: boolean;
}

function getNoteClass(note: ComparisonNote): string {
  switch (note.tone) {
    case 'positive':
      return 'text-emerald-300';
    case 'negative':
      return 'text-rose-300/90';
    case 'neutral':
      return 'text-[#9BA4B0]';
  }
}

function getNotePrefix(note: ComparisonNote): string {
  switch (note.tone) {
    case 'positive':
      return '+ ';
    case 'negative':
      return '− ';
    case 'neutral':
      return '';
  }
}

export const StrainDetailView: React.FC<StrainDetailViewProps> = ({
  strain,
  onSelectStrain,
  onExploreInFinder,
  onBack,
  isMobileLayout = false,
}) => {
  const similarList = useMemo(
    () => getSimilarStrains(strain, STRAINS, 6),
    [strain]
  );

  const indicaRatio = 100 - strain.sativaRatio;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Back & Identity */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#969FA9] hover:text-[#F3F5F8] w-fit transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="rounded-xl bg-[#15181D] border border-white/[0.08] p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h1
                className={`font-display font-semibold text-[#F3F5F8] tracking-tight ${
                  isMobileLayout ? 'text-2xl' : 'text-2xl sm:text-3xl'
                }`}
              >
                {strain.name}{' '}
                <span className="font-mono text-base sm:text-lg font-normal text-[#8B95A1]">
                  [{strain.breederCode}]
                </span>
              </h1>
              <p className="text-sm text-[#A5AEB9] mt-1">
                {strain.breederName}
                <span aria-hidden="true"> · </span>
                <span>{strain.seedType}</span>
                <span aria-hidden="true"> · </span>
                <span>
                  {strain.geneticsType} ({strain.sativaRatio}% Sativa /{' '}
                  {indicaRatio}% Indica)
                </span>
              </p>
            </div>

            <div className="flex items-baseline gap-3 text-sm">
              <span className="font-mono font-semibold tabular-nums text-emerald-300">
                {strain.rating.toFixed(1)} / 5
              </span>
              <span className="text-xs text-[#969FA9]">
                {strain.reviewTier} reviews
              </span>
            </div>
          </div>

          <p className="text-sm text-[#C6CDD6] leading-relaxed mt-3 max-w-3xl">
            {strain.shortNote}
          </p>

          {/* Compact unboxed grower quick facts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 mt-4 border-t border-white/[0.07] text-xs">
            <div>
              <span className="text-[#858F9B] block">
                {strain.seedType === 'Autoflower'
                  ? 'Seed to Harvest'
                  : 'Flowering Time'}
              </span>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#F3F5F8] mt-0.5 block">
                {strain.durationWeeks.typicalLow}–
                {strain.durationWeeks.typicalHigh} wks
              </span>
            </div>
            <div>
              <span className="text-[#858F9B] block">Indoor Yield</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#F3F5F8] mt-0.5 block">
                {strain.yieldIndoorGm2.typicalLow}–
                {strain.yieldIndoorGm2.typicalHigh} g/m²
              </span>
            </div>
            <div>
              <span className="text-[#858F9B] block">Typical Height</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#F3F5F8] mt-0.5 block">
                {strain.heightCm.typicalLow}–{strain.heightCm.typicalHigh} cm
              </span>
            </div>
            <div>
              <span className="text-[#858F9B] block">Grow-Room Odor</span>
              <span
                className={`text-sm font-semibold mt-0.5 block ${
                  strain.odorLevel === 'Low'
                    ? 'text-emerald-300'
                    : strain.odorLevel === 'Medium'
                      ? 'text-amber-300'
                      : 'text-rose-300'
                }`}
              >
                {strain.odorLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Charts: Flavor Pie & 10-Effect Clock Radar */}
      <div
        className={`grid gap-5 ${
          isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
        }`}
      >
        <section className="rounded-xl bg-[#15181D] border border-white/[0.08] p-5">
          <FlavorPieChart
            strain={strain}
            compact={isMobileLayout}
            headerTitle="Flavor Profile"
          />
        </section>

        <section className="rounded-xl bg-[#15181D] border border-white/[0.08] p-5">
          <EffectsRadarChart
            strain={strain}
            accentColor="#34D399"
            compact={isMobileLayout}
            headerTitle="Effects Profile"
          />
        </section>
      </div>

      {/* Beginner-Friendly Grow Metrics */}
      <section className="rounded-xl bg-[#15181D] border border-white/[0.08] p-5 sm:p-6 flex flex-col gap-6">
        <div className="border-b border-white/[0.07] pb-3">
          <h2 className="font-display text-lg font-semibold text-[#F3F5F8]">
            Grower-Reported Cultivation Profile
          </h2>
          <p className="text-xs text-[#969FA9] mt-0.5">
            Based on {strain.reviewTier} grow diaries · Shaded intensity bands
            highlight where most growers finish
          </p>
        </div>

        <EaseStackedBar
          ease={strain.easeOfGrowing}
          label="Ease of Growing"
          reviewTier={strain.reviewTier}
        />

        <div
          className={`grid gap-6 pt-2 ${
            isMobileLayout ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          <DensityRangeBar
            range={strain.durationWeeks}
            scaleMin={5}
            scaleMax={15}
            unit="wks"
            label={
              strain.seedType === 'Autoflower'
                ? 'Seed-to-Harvest Duration'
                : 'Flowering Duration'
            }
            accentHex="#34D399"
            ticks={[5, 7, 9, 11, 13, 15]}
          />

          <DensityRangeBar
            range={strain.heightCm}
            scaleMin={35}
            scaleMax={215}
            unit="cm"
            label="Mature Plant Height"
            accentHex="#60A5FA"
            ticks={[40, 80, 120, 160, 200]}
          />

          <DensityRangeBar
            range={strain.yieldIndoorGm2}
            scaleMin={150}
            scaleMax={850}
            unit="g/m²"
            label="Indoor Yield"
            accentHex="#F59E0B"
            ticks={[150, 325, 500, 675, 850]}
          />

          <DensityRangeBar
            range={strain.yieldOutdoorGPlant}
            scaleMin={0}
            scaleMax={2400}
            unit="g/plant"
            label="Outdoor Yield"
            accentHex="#A78BFA"
            ticks={[0, 600, 1200, 1800, 2400]}
          />
        </div>
      </section>

      {/* Similar Strains with Semantic Comparison Notes */}
      <section className="rounded-xl bg-[#15181D] border border-white/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <h2 className="font-display text-lg font-semibold text-[#F3F5F8]">
            Similar Strains to {strain.name}
          </h2>
          <p className="text-xs text-[#969FA9] mt-0.5">
            Key differences relative to {strain.name} [{strain.breederCode}] ·{' '}
            <span className="text-emerald-300">+ advantages</span>,{' '}
            <span className="text-[#9BA4B0]">neutral shifts</span>,{' '}
            <span className="text-rose-300/90">− trade-offs</span>
          </p>
        </div>

        <ul className="divide-y divide-white/[0.06]">
          {similarList.map(({ strain: candidate, matchPercent, notes }) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => onSelectStrain(candidate.id)}
                className="w-full px-5 py-3.5 text-left hover:bg-white/[0.03] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[#F3F5F8]">
                      {candidate.name}
                    </span>
                    <span className="font-mono text-xs text-[#858F9B]">
                      [{candidate.breederCode}]
                    </span>
                  </div>
                  <p className="text-xs text-[#8B95A1] mt-0.5">
                    {candidate.breederName} · {candidate.reviewTier} reviews
                  </p>

                  {notes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs">
                      {notes.map((note, idx) => (
                        <span
                          key={`${candidate.id}-${note.label}-${idx}`}
                          className={`font-medium ${getNoteClass(note)}`}
                        >
                          {getNotePrefix(note)}
                          {note.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                  <span className="font-mono text-sm font-semibold tabular-nums text-emerald-300">
                    {matchPercent}% match
                  </span>
                  <span className="text-xs text-[#7D8793]">View profile</span>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* Inviting CTA below Similar Strains list leading to home selection block */}
        <div className="px-5 py-4 bg-[#111418] border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-[#A5AEB9]">
            Want to compare {strain.name} side-by-side by specific flavors,
            effects, or tent height?
          </p>
          <button
            type="button"
            onClick={() => onExploreInFinder(strain.id)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-[#0B1410] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <span>Explore more in the Seed Finder</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
