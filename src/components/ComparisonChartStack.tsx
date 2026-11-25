import React from 'react';
import { SelectionCriterion, Strain } from '../types/strain';
import { EffectsRadarChart } from './charts/EffectsRadarChart';
import { FlavorPieComparison } from './charts/FlavorPieChart';
import { DensityRangeBar, EaseStackedBar } from './charts/GrowMetricCharts';

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
 * - Every side-by-side pair clearly distinguishes "Match" vs "Your reference".
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
  role: 'Match' | 'Your reference';
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
      {strain.name} [{strain.breederCode}]
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

    case 'effects':
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
              minimal
            />
          </div>

          {referenceStrain && (
            <div className={`${rightColClass} flex flex-col items-center`}>
              <SideLabel
                role="Your reference"
                strain={referenceStrain}
                align={isMobileLayout ? 'left' : 'center'}
              />
              <EffectsRadarChart
                strain={referenceStrain}
                highlightedEffects={criterion.subValues}
                accentColor="#60A5FA"
                compact={isMobileLayout || Boolean(referenceStrain)}
                minimal
              />
            </div>
          )}
        </div>
      );

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
              <SideLabel role="Your reference" strain={referenceStrain} />
              <EaseStackedBar ease={referenceStrain.easeOfGrowing} />
            </div>
          )}
        </div>
      );

    case 'duration':
      return (
        <div className={pairGridClass}>
          <div>
            {referenceStrain && (
              <SideLabel role="Match" strain={matchedStrain} />
            )}
            <DensityRangeBar
              range={matchedStrain.durationWeeks}
              scaleMin={5}
              scaleMax={15}
              unit="wks"
              sublabel={
                matchedStrain.seedType === 'Autoflower'
                  ? 'Seed-to-harvest'
                  : 'Flowering'
              }
              accentHex="#34D399"
              ticks={[5, 7, 9, 11, 13, 15]}
            />
          </div>

          {referenceStrain && (
            <div className={rightColClass}>
              <SideLabel role="Your reference" strain={referenceStrain} />
              <DensityRangeBar
                range={referenceStrain.durationWeeks}
                scaleMin={5}
                scaleMax={15}
                unit="wks"
                sublabel={
                  referenceStrain.seedType === 'Autoflower'
                    ? 'Seed-to-harvest'
                    : 'Flowering'
                }
                accentHex="#60A5FA"
                ticks={[5, 7, 9, 11, 13, 15]}
              />
            </div>
          )}
        </div>
      );

    case 'yield': {
      const outdoor = criterion.subValues[0] === 'Outdoor (g/plant)';
      const scaleMin = outdoor ? 0 : 150;
      const scaleMax = outdoor ? 2400 : 850;
      const unit = outdoor ? 'g/plant' : 'g/m²';
      const ticks = outdoor
        ? [0, 600, 1200, 1800, 2400]
        : [150, 325, 500, 675, 850];

      return (
        <div className={pairGridClass}>
          <div>
            {referenceStrain && (
              <SideLabel role="Match" strain={matchedStrain} />
            )}
            <DensityRangeBar
              range={
                outdoor
                  ? matchedStrain.yieldOutdoorGPlant
                  : matchedStrain.yieldIndoorGm2
              }
              scaleMin={scaleMin}
              scaleMax={scaleMax}
              unit={unit}
              sublabel={outdoor ? 'Outdoor yield' : 'Indoor yield'}
              accentHex="#34D399"
              ticks={ticks}
            />
          </div>

          {referenceStrain && (
            <div className={rightColClass}>
              <SideLabel role="Your reference" strain={referenceStrain} />
              <DensityRangeBar
                range={
                  outdoor
                    ? referenceStrain.yieldOutdoorGPlant
                    : referenceStrain.yieldIndoorGm2
                }
                scaleMin={scaleMin}
                scaleMax={scaleMax}
                unit={unit}
                sublabel={outdoor ? 'Outdoor yield' : 'Indoor yield'}
                accentHex="#60A5FA"
                ticks={ticks}
              />
            </div>
          )}
        </div>
      );
    }

    case 'height':
      return (
        <div className={pairGridClass}>
          <div>
            {referenceStrain && (
              <SideLabel role="Match" strain={matchedStrain} />
            )}
            <DensityRangeBar
              range={matchedStrain.heightCm}
              scaleMin={35}
              scaleMax={215}
              unit="cm"
              sublabel="Plant height"
              accentHex="#34D399"
              ticks={[40, 80, 120, 160, 200]}
            />
          </div>

          {referenceStrain && (
            <div className={rightColClass}>
              <SideLabel role="Your reference" strain={referenceStrain} />
              <DensityRangeBar
                range={referenceStrain.heightCm}
                scaleMin={35}
                scaleMax={215}
                unit="cm"
                sublabel="Plant height"
                accentHex="#60A5FA"
                ticks={[40, 80, 120, 160, 200]}
              />
            </div>
          )}
        </div>
      );

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
              <SideLabel role="Your reference" strain={referenceStrain} />
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
