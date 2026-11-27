import React from 'react';
import { SelectionCriterion, Strain } from '../types/strain';
import { getEffectRadarScaleMax } from '../utils/matching';
import { EffectsRadarChart } from './charts/EffectsRadarChart';
import { FlavorPieComparison } from './charts/FlavorPieChart';
import {
  DensityRangeBar,
  DensityRangeLegend,
  EaseStackedBar,
  getAdaptiveRangeScale,
} from './charts/GrowMetricCharts';

interface ComparisonChartStackProps {
  referenceStrain?: Strain;
  matchedStrain: Strain;
  criteria: SelectionCriterion[];
  isMobileLayout?: boolean;
}

/**
 * Inline stacked comparison charts inside the expanded Ranked Matches row:
 * - Matching strain always on the LEFT, Reference strain on the RIGHT (side-by-side on desktop).
 * - Without reference strain: Matching strain chart only.
 * - Flavor pairs share a single unified color-coded flavor list on the left.
 * - Every side-by-side pair clearly distinguishes "Match" vs "Your pick".
 */
export const ComparisonChartStack: React.FC<ComparisonChartStackProps> = ({
  referenceStrain,
  matchedStrain,
  criteria,
  isMobileLayout = false,
}) => {
  if (criteria.length === 0) return null;

  const isSideBySide = Boolean(referenceStrain);
  const pairGridClass =
    isSideBySide && !isMobileLayout
      ? 'grid grid-cols-2 gap-4 divide-x divide-white/[0.06]'
      : 'flex flex-col gap-4';

  const rightColClass = isSideBySide && !isMobileLayout ? 'pl-4' : '';

  return (
    <div className="flex flex-col gap-5">
      {criteria.map((criterion, idx) => (
        <div
          key={criterion.id}
          className={idx > 0 ? 'pt-5 border-t border-white/[0.06]' : ''}
        >
          {renderCriterionChart(
            criterion,
            matchedStrain,
            referenceStrain,
            pairGridClass,
            rightColClass,
            isMobileLayout
          )}
        </div>
      ))}
    </div>
  );
};

const SideLabel: React.FC<{
  role: 'Match' | 'Your pick';
  strain: Strain;
  align?: 'left' | 'center';
}> = ({ role, strain, align = 'left' }) => (
  <div
    className={`mb-2 ${align === 'center' ? 'text-center' : 'text-left'}`}
  >
    <span
      className={`text-[11px] font-semibold block ${
        role === 'Match' ? 'text-emerald-300' : 'text-sky-300/90'
      }`}
    >
      {role}
    </span>
    <span className="text-xs text-[#C6CDD6] block truncate">
      {strain.name} ({strain.breederCode})
    </span>
  </div>
);

function renderCriterionChart(
  criterion: SelectionCriterion,
  matchedStrain: Strain,
  referenceStrain: Strain | undefined,
  pairGridClass: string,
  rightColClass: string,
  isMobileLayout: boolean
) {
  switch (criterion.type) {
    case 'flavor':
      return (
        <FlavorPieComparison
          matchedStrain={matchedStrain}
          referenceStrain={referenceStrain}
          highlightedFlavors={criterion.subValues}
          isMobileLayout={isMobileLayout}
        />
      );

    case 'effects': {
      const sharedScaleMax = getEffectRadarScaleMax(
        referenceStrain ? [matchedStrain, referenceStrain] : [matchedStrain]
      );
      return (
        <div className={pairGridClass}>
          <div className="flex flex-col items-center">
            {referenceStrain && (
              <SideLabel
                role="Match"
                strain={matchedStrain}
                align={isMobileLayout ? 'left' : 'center'}
              />
            )}
            <EffectsRadarChart
              strain={matchedStrain}
              highlightedEffects={criterion.subValues}
              accentColor="#34D399"
              compact={isMobileLayout || Boolean(referenceStrain)}
              scaleMax={sharedScaleMax}
              minimal
            />
          </div>

          {referenceStrain && (
            <div className={`${rightColClass} flex flex-col items-center`}>
              <SideLabel
                role="Your pick"
                strain={referenceStrain}
                align={isMobileLayout ? 'left' : 'center'}
              />
              <EffectsRadarChart
                strain={referenceStrain}
                highlightedEffects={criterion.subValues}
                accentColor="#60A5FA"
                compact={isMobileLayout || Boolean(referenceStrain)}
                scaleMax={sharedScaleMax}
                minimal
              />
            </div>
          )}
        </div>
      );
    }

    case 'ease':
      return (
        <div className={pairGridClass}>
          <div>
            {referenceStrain && (
              <SideLabel role="Match" strain={matchedStrain} />
            )}
            <EaseStackedBar ease={matchedStrain.easeOfGrowing} />
          </div>

          {referenceStrain && (
            <div className={rightColClass}>
              <SideLabel role="Your pick" strain={referenceStrain} />
              <EaseStackedBar ease={referenceStrain.easeOfGrowing} />
            </div>
          )}
        </div>
      );

    case 'duration': {
      const durationScale = getAdaptiveRangeScale(
        referenceStrain
          ? [matchedStrain.durationWeeks, referenceStrain.durationWeeks]
          : [matchedStrain.durationWeeks],
        'weeks'
      );
      return (
        <div className="flex flex-col gap-3">
          <div className={pairGridClass}>
            <div>
              {referenceStrain && (
                <SideLabel role="Match" strain={matchedStrain} />
              )}
              <DensityRangeBar
                range={matchedStrain.durationWeeks}
                scaleMin={durationScale.scaleMin}
                scaleMax={durationScale.scaleMax}
                unit="wks"
                sublabel={
                  matchedStrain.seedType === 'Autoflower'
                    ? 'Seed-to-harvest'
                    : 'Flowering'
                }
                accentHex="#34D399"
                ticks={durationScale.ticks}
              />
            </div>

            {referenceStrain && (
              <div className={rightColClass}>
                <SideLabel role="Your pick" strain={referenceStrain} />
                <DensityRangeBar
                  range={referenceStrain.durationWeeks}
                  scaleMin={durationScale.scaleMin}
                  scaleMax={durationScale.scaleMax}
                  unit="wks"
                  sublabel={
                    referenceStrain.seedType === 'Autoflower'
                      ? 'Seed-to-harvest'
                      : 'Flowering'
                  }
                  accentHex="#60A5FA"
                  ticks={durationScale.ticks}
                />
              </div>
            )}
          </div>
          <DensityRangeLegend />
        </div>
      );
    }

    case 'yield': {
      const outdoor = criterion.subValues[0] === 'Outdoor (g/plant)';
      const matchedUsesPerPlant =
        outdoor || matchedStrain.seedType === 'Autoflower';
      const refUsesPerPlant = referenceStrain
        ? outdoor || referenceStrain.seedType === 'Autoflower'
        : false;

      const matchedRange = matchedUsesPerPlant
        ? matchedStrain.yieldOutdoorGPlant
        : matchedStrain.yieldIndoorGm2;
      const refRange = referenceStrain
        ? refUsesPerPlant
          ? referenceStrain.yieldOutdoorGPlant
          : referenceStrain.yieldIndoorGm2
        : undefined;

      const sameUnit = !referenceStrain || matchedUsesPerPlant === refUsesPerPlant;
      const matchedScale = getAdaptiveRangeScale(
        sameUnit && refRange ? [matchedRange, refRange] : [matchedRange],
        matchedUsesPerPlant ? 'gplant' : 'gm2'
      );
      const refScale = refRange
        ? sameUnit
          ? matchedScale
          : getAdaptiveRangeScale([refRange], refUsesPerPlant ? 'gplant' : 'gm2')
        : undefined;

      const matchedSublabel =
        matchedStrain.seedType === 'Autoflower'
          ? 'Yield per plant'
          : outdoor
            ? 'Outdoor yield'
            : 'Indoor yield';
      const refSublabel =
        referenceStrain?.seedType === 'Autoflower'
          ? 'Yield per plant'
          : outdoor
            ? 'Outdoor yield'
            : 'Indoor yield';

      return (
        <div className="flex flex-col gap-3">
          <div className={pairGridClass}>
            <div>
              {referenceStrain && (
                <SideLabel role="Match" strain={matchedStrain} />
              )}
              <DensityRangeBar
                range={matchedRange}
                scaleMin={matchedScale.scaleMin}
                scaleMax={matchedScale.scaleMax}
                unit={matchedUsesPerPlant ? 'g/plant' : 'g/m²'}
                sublabel={matchedSublabel}
                accentHex="#34D399"
                ticks={matchedScale.ticks}
              />
            </div>

            {referenceStrain && refRange && refScale && (
              <div className={rightColClass}>
                <SideLabel role="Your pick" strain={referenceStrain} />
                <DensityRangeBar
                  range={refRange}
                  scaleMin={refScale.scaleMin}
                  scaleMax={refScale.scaleMax}
                  unit={refUsesPerPlant ? 'g/plant' : 'g/m²'}
                  sublabel={refSublabel}
                  accentHex="#60A5FA"
                  ticks={refScale.ticks}
                />
              </div>
            )}
          </div>
          <DensityRangeLegend />
        </div>
      );
    }

    case 'height': {
      const heightScale = getAdaptiveRangeScale(
        referenceStrain
          ? [matchedStrain.heightCm, referenceStrain.heightCm]
          : [matchedStrain.heightCm],
        'cm'
      );
      return (
        <div className="flex flex-col gap-3">
          <div className={pairGridClass}>
            <div>
              {referenceStrain && (
                <SideLabel role="Match" strain={matchedStrain} />
              )}
              <DensityRangeBar
                range={matchedStrain.heightCm}
                scaleMin={heightScale.scaleMin}
                scaleMax={heightScale.scaleMax}
                unit="cm"
                sublabel="Plant height"
                accentHex="#34D399"
                ticks={heightScale.ticks}
              />
            </div>

            {referenceStrain && (
              <div className={rightColClass}>
                <SideLabel role="Your pick" strain={referenceStrain} />
                <DensityRangeBar
                  range={referenceStrain.heightCm}
                  scaleMin={heightScale.scaleMin}
                  scaleMax={heightScale.scaleMax}
                  unit="cm"
                  sublabel="Plant height"
                  accentHex="#60A5FA"
                  ticks={heightScale.ticks}
                />
              </div>
            )}
          </div>
          <DensityRangeLegend />
        </div>
      );
    }

    case 'autoflower':
    case 'low-odor':
      return (
        <div className={pairGridClass}>
          <div className="flex flex-col gap-1">
            {referenceStrain && (
              <SideLabel role="Match" strain={matchedStrain} />
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="text-[#D8DEE6]">{matchedStrain.seedType}</span>
              <span className="font-mono tabular-nums text-[#C6CDD6]">
                {matchedStrain.durationWeeks.median} wks
              </span>
              <span
                className={
                  matchedStrain.odorLevel === 'Low'
                    ? 'text-emerald-300 font-medium'
                    : matchedStrain.odorLevel === 'Medium'
                      ? 'text-amber-300'
                      : 'text-rose-300'
                }
              >
                {matchedStrain.odorLevel} odor
              </span>
            </div>
          </div>

          {referenceStrain && (
            <div className={`${rightColClass} flex flex-col gap-1`}>
              <SideLabel role="Your pick" strain={referenceStrain} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="text-[#C6CDD6]">
                  {referenceStrain.seedType}
                </span>
                <span className="font-mono tabular-nums text-[#A5AEB9]">
                  {referenceStrain.durationWeeks.median} wks
                </span>
                <span
                  className={
                    referenceStrain.odorLevel === 'Low'
                      ? 'text-emerald-300 font-medium'
                      : referenceStrain.odorLevel === 'Medium'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                  }
                >
                  {referenceStrain.odorLevel} odor
                </span>
              </div>
            </div>
          )}
        </div>
      );
  }
}
