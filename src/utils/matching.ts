import {
  ALL_EFFECT_KEYS,
  EFFECT_CLOCK_ORDER,
  FLAVOR_ORDER,
  SECONDARY_EFFECT_KEYS,
} from '../data/strains';
import {
  ChartFlavorItem,
  ComparisonNote,
  EffectKey,
  FlavorKey,
  MatchResult,
  SelectionCriterion,
  SimilarStrainEntry,
  Strain,
  TraitType,
} from '../types/strain';

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function flavorVector(strain: Strain): number[] {
  return FLAVOR_ORDER.map((k) => strain.flavorProfile[k] ?? 0);
}

function effectVector(strain: Strain): number[] {
  return ALL_EFFECT_KEYS.map((k) => strain.effectsProfile[k] ?? 0);
}

/** Overall intrinsic similarity between two strains (0..1) */
export function computeStrainPairSimilarity(ref: Strain, candidate: Strain): number {
  const flavorSim = cosineSimilarity(flavorVector(ref), flavorVector(candidate));
  const effectSim = cosineSimilarity(effectVector(ref), effectVector(candidate));
  const sativaSim = 1 - Math.abs(ref.sativaRatio - candidate.sativaRatio) / 100;
  const durationSim = Math.max(
    0,
    1 - Math.abs(ref.durationWeeks.median - candidate.durationWeeks.median) / 6
  );
  const easeSim = Math.max(
    0,
    1 - Math.abs(ref.easeOfGrowing.easy - candidate.easeOfGrowing.easy) / 100
  );
  const seedBonus = ref.seedType === candidate.seedType ? 1 : 0.65;

  return (
    flavorSim * 0.32 +
    effectSim * 0.34 +
    sativaSim * 0.14 +
    durationSim * 0.08 +
    easeSim * 0.06 +
    seedBonus * 0.06
  );
}

/** Score a candidate strain against a single user criterion (0..1) */
function scoreCriterion(
  candidate: Strain,
  criterion: SelectionCriterion,
  refStrain?: Strain
): number {
  switch (criterion.type) {
    case 'flavor': {
      if (criterion.subValues.length > 0) {
        const totalFlavor =
          Object.values(candidate.flavorProfile).reduce(
            (acc, val) => acc + (val ?? 0),
            0
          ) || 100;
        const chosenPercent = criterion.subValues.reduce((acc, f) => {
          return (
            acc +
            ((candidate.flavorProfile[f as FlavorKey] ?? 0) / totalFlavor) * 100
          );
        }, 0);
        // Normalize: having 28%+ in chosen flavor(s) scores near 1.0
        const directScore = Math.min(1, chosenPercent / 32);
        if (refStrain) {
          const refSim = cosineSimilarity(
            flavorVector(refStrain),
            flavorVector(candidate)
          );
          return directScore * 0.68 + refSim * 0.32;
        }
        return directScore;
      }
      if (refStrain) {
        return cosineSimilarity(flavorVector(refStrain), flavorVector(candidate));
      }
      return 0.7;
    }

    case 'effects': {
      if (criterion.subValues.length > 0) {
        const shares = getEffectShares(candidate);
        const maxRaw = Math.max(
          ...ALL_EFFECT_KEYS.map((k) => candidate.effectsProfile[k] ?? 0),
          1
        );
        const avgTarget =
          criterion.subValues.reduce((acc, e) => {
            const key = e as EffectKey;
            const share = shares[key]?.exactPercent ?? 0;
            const raw = candidate.effectsProfile[key] ?? 0;
            // Blend share-of-mentions with strength relative to the strain's top effect
            const score =
              0.5 * Math.min(1, share / 20) + 0.5 * Math.min(1, raw / maxRaw);
            return acc + score;
          }, 0) / criterion.subValues.length;
        const directScore = Math.min(1, avgTarget);
        if (refStrain) {
          const refSim = cosineSimilarity(
            effectVector(refStrain),
            effectVector(candidate)
          );
          return directScore * 0.68 + refSim * 0.32;
        }
        return directScore;
      }
      if (refStrain) {
        return cosineSimilarity(effectVector(refStrain), effectVector(candidate));
      }
      return 0.7;
    }

    case 'ease': {
      const easyNorm = candidate.easeOfGrowing.easy / 92;
      const hardPenalty = candidate.easeOfGrowing.hard / 100;
      return Math.max(0.1, Math.min(1, easyNorm - hardPenalty * 0.4));
    }

    case 'duration': {
      const med = candidate.durationWeeks.median;
      const pref = criterion.subValues[0];
      if (pref === 'Express (<9 wks)') {
        return Math.max(0.1, Math.min(1, (11.5 - med) / 4.2));
      }
      if (pref === 'Fast (9–10 wks)') {
        return Math.max(0.2, Math.min(1, 1 - Math.abs(med - 9.2) / 3.5));
      }
      // General fast growing
      return Math.max(0.15, Math.min(1, (13 - med) / 6));
    }

    case 'yield': {
      const pref = criterion.subValues[0];
      if (pref === 'Outdoor (g/plant)') {
        return Math.max(
          0.15,
          Math.min(1, (candidate.yieldOutdoorGPlant.median - 60) / 1450)
        );
      }
      // Indoor or Either
      return Math.max(
        0.15,
        Math.min(1, (candidate.yieldIndoorGm2.median - 200) / 480)
      );
    }

    case 'height': {
      const med = candidate.heightCm.median;
      const pref = criterion.subValues[0];
      if (pref === 'Stealth / Micro (<80 cm)') {
        return Math.max(0.1, Math.min(1, (125 - med) / 68));
      }
      if (pref === 'Standard Tent (80–120 cm)') {
        return Math.max(0.2, Math.min(1, 1 - Math.abs(med - 98) / 55));
      }
      return Math.max(0.15, Math.min(1, (150 - med) / 90));
    }

    case 'autoflower': {
      return candidate.seedType === 'Autoflower' ? 1 : 0.22;
    }

    case 'low-odor': {
      if (candidate.odorLevel === 'Low') return 1;
      if (candidate.odorLevel === 'Medium') return 0.56;
      return 0.18;
    }
  }
}

/**
 * Compute ranked matches for the conversational selection engine.
 */
export function computeRankedMatches(
  allStrains: Strain[],
  referenceStrain: Strain | undefined,
  criteria: SelectionCriterion[]
): MatchResult[] {
  const candidates = referenceStrain
    ? allStrains.filter((s) => s.id !== referenceStrain.id)
    : allStrains;

  const results: MatchResult[] = candidates.map((candidate) => {
    const traitScores: Partial<Record<TraitType, number>> = {};
    criteria.forEach((c) => {
      traitScores[c.type] = scoreCriterion(candidate, c, referenceStrain);
    });

    let combined = 0;

    if (referenceStrain && criteria.length === 0) {
      combined = computeStrainPairSimilarity(referenceStrain, candidate);
    } else if (referenceStrain && criteria.length > 0) {
      const baseSim = computeStrainPairSimilarity(referenceStrain, candidate);
      const avgCriteria =
        criteria.reduce((sum, c) => sum + (traitScores[c.type] ?? 0.5), 0) /
        criteria.length;
      // Blend reference strain affinity with explicit traits (explicit traits take priority)
      combined = avgCriteria * 0.65 + baseSim * 0.35;
    } else if (criteria.length > 0) {
      const avgCriteria =
        criteria.reduce((sum, c) => sum + (traitScores[c.type] ?? 0.5), 0) /
        criteria.length;
      // Tie-break gently with community rating
      const ratingFactor = (candidate.rating - 4.0) / 1.0;
      combined = avgCriteria * 0.9 + Math.max(0, ratingFactor) * 0.1;
    }

    // Calibrate into realistic 42%..98% percentage spread
    const matchPercent = Math.round(
      Math.max(42, Math.min(98, 38 + combined * 61))
    );

    return {
      strain: candidate,
      matchPercent,
      traitScores,
    };
  });

  return results.sort(
    (a, b) =>
      b.matchPercent - a.matchPercent ||
      b.strain.rating - a.strain.rating ||
      b.strain.popularityViews - a.strain.popularityViews
  );
}

const ODOR_RANK: Record<Strain['odorLevel'], number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

/**
 * Generates semantic comparison notes (positive, neutral, negative)
 * comparing a similar candidate strain against the currently viewed strain.
 */
export function buildComparisonNotes(
  base: Strain,
  candidate: Strain
): ComparisonNote[] {
  const notes: ComparisonNote[] = [];

  // Neutral genetics / seed-type notes
  if (candidate.sativaRatio - base.sativaRatio >= 15) {
    notes.push({ label: 'More Sativa-like', tone: 'neutral' });
  } else if (base.sativaRatio - candidate.sativaRatio >= 15) {
    notes.push({ label: 'More Indica-like', tone: 'neutral' });
  }

  if (candidate.seedType !== base.seedType) {
    notes.push({
      label: candidate.seedType === 'Autoflower' ? 'Autoflower' : 'Photoperiod',
      tone: 'neutral',
    });
  }

  // Positive notes
  if (candidate.rating > base.rating + 0.05) {
    notes.push({ label: 'Higher-Rated', tone: 'positive' });
  }
  if (candidate.popularityViews > base.popularityViews * 1.15) {
    notes.push({ label: 'More Popular', tone: 'positive' });
  }
  if (base.durationWeeks.median - candidate.durationWeeks.median >= 0.8) {
    notes.push({ label: 'Shorter Cycle', tone: 'positive' });
  }
  if (ODOR_RANK[candidate.odorLevel] < ODOR_RANK[base.odorLevel]) {
    notes.push({ label: 'Lower Odor', tone: 'positive' });
  }
  if (candidate.easeOfGrowing.easy - base.easeOfGrowing.easy >= 10) {
    notes.push({ label: 'Easier to Grow', tone: 'positive' });
  }
  if (candidate.yieldIndoorGm2.median - base.yieldIndoorGm2.median >= 70) {
    notes.push({ label: 'Higher Yield', tone: 'positive' });
  }

  // Negative / trade-off notes
  if (candidate.heightCm.median - base.heightCm.median >= 18) {
    notes.push({ label: 'Taller Plants', tone: 'negative' });
  }
  if (base.yieldIndoorGm2.median - candidate.yieldIndoorGm2.median >= 70) {
    notes.push({ label: 'Lower Yield', tone: 'negative' });
  }
  if (candidate.durationWeeks.median - base.durationWeeks.median >= 1.2) {
    notes.push({ label: 'Longer Cycle', tone: 'negative' });
  }
  if (ODOR_RANK[candidate.odorLevel] > ODOR_RANK[base.odorLevel]) {
    notes.push({ label: 'Stronger Odor', tone: 'negative' });
  }

  // Keep concise: at most 4 high-signal notes, balancing positive/neutral/negative
  return notes.slice(0, 4);
}

export function getSimilarStrains(
  base: Strain,
  allStrains: Strain[],
  limit = 6
): SimilarStrainEntry[] {
  return allStrains
    .filter((s) => s.id !== base.id)
    .map((candidate) => {
      const sim = computeStrainPairSimilarity(base, candidate);
      const matchPercent = Math.round(Math.max(58, Math.min(96, 42 + sim * 55)));
      return {
        strain: candidate,
        matchPercent,
        notes: buildComparisonNotes(base, candidate),
      };
    })
    .sort((a, b) => b.matchPercent - a.matchPercent || b.strain.rating - a.strain.rating)
    .slice(0, limit);
}

/**
 * Returns every flavor note with normalized percentage shares (supports both raw review counts and 100-based profiles).
 */
export function getSortedFlavors(
  strain: Strain
): Array<{ flavor: FlavorKey; percent: number; exactPercent: number }> {
  const entries = (
    Object.entries(strain.flavorProfile) as Array<[FlavorKey, number]>
  ).filter(([, val]) => val > 0);
  const total = entries.reduce((sum, [, val]) => sum + val, 0) || 100;

  return entries
    .map(([flavor, raw]) => {
      const exactPercent = (raw / total) * 100;
      return {
        flavor,
        percent: Math.max(1, Math.round(exactPercent)),
        exactPercent,
      };
    })
    .sort((a, b) => b.exactPercent - a.exactPercent);
}

/**
 * Largest-remainder rounding so pie slice percentages always sum cleanly to 100%.
 */
function roundPercentagesTo100(exactValues: number[]): number[] {
  if (exactValues.length === 0) return [];
  const floors = exactValues.map((v) => Math.floor(v));
  let remainder = 100 - floors.reduce((sum, v) => sum + v, 0);

  const ranked = exactValues
    .map((v, idx) => ({ idx, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const result = [...floors];
  for (let i = 0; i < ranked.length && remainder > 0; i++) {
    result[ranked[i].idx] += 1;
    remainder -= 1;
  }
  return result;
}

/**
 * Builds an uncluttered chart-ready flavor breakdown:
 * - Keeps all flavors >= minPercent (default 3%), plus any flavor explicitly selected/highlighted by the user.
 * - Combines remaining minor notes (when 2 or more exist) into a single "Other" slice placed last,
 *   while preserving their exact breakdown for hover/tap inspection.
 */
export function getChartFlavors(
  strain: Strain,
  highlightedFlavors: string[] = [],
  minPercent = 3
): ChartFlavorItem[] {
  const sorted = getSortedFlavors(strain);
  if (sorted.length === 0) return [];

  const major: typeof sorted = [];
  const minor: typeof sorted = [];

  for (const item of sorted) {
    const isHighlighted = highlightedFlavors.includes(item.flavor);
    if (item.exactPercent >= minPercent || isHighlighted) {
      major.push(item);
    } else {
      minor.push(item);
    }
  }

  // Only fold into "Other" when 2+ minor notes exist; a single small note is clearer named directly
  if (minor.length === 1) {
    major.push(minor[0]);
    minor.length = 0;
  }

  const combinedExact: number[] = major.map((m) => m.exactPercent);
  const otherExact = minor.reduce((sum, m) => sum + m.exactPercent, 0);
  if (minor.length > 0) {
    combinedExact.push(otherExact);
  }

  const rounded = roundPercentagesTo100(combinedExact);

  const chartItems: ChartFlavorItem[] = major.map((m, idx) => ({
    flavor: m.flavor,
    percent: Math.max(1, rounded[idx]),
    exactPercent: m.exactPercent,
  }));

  if (minor.length > 0) {
    chartItems.push({
      flavor: 'Other',
      percent: rounded[rounded.length - 1],
      exactPercent: otherExact,
      otherBreakdown: minor.map((m) => ({
        flavor: m.flavor,
        percent: Math.max(1, Math.round(m.exactPercent)),
      })),
    });
  }

  return chartItems;
}

export interface EffectShareItem {
  effect: EffectKey;
  raw: number;
  percent: number;
  exactPercent: number;
}

/**
 * Converts raw effect review mention counts into normalized % shares of total effect mentions
 * across all effects (8 dial effects + Giggly & Talkative).
 * Tied mention counts always produce identical percentages; omitted/0 effects stay 0%.
 */
export function getEffectShares(
  strain: Strain
): Record<EffectKey, EffectShareItem> {
  const total = ALL_EFFECT_KEYS.reduce(
    (sum, key) => sum + Math.max(0, strain.effectsProfile[key] ?? 0),
    0
  );

  const result = {} as Record<EffectKey, EffectShareItem>;
  for (const effect of ALL_EFFECT_KEYS) {
    const raw = Math.max(0, strain.effectsProfile[effect] ?? 0);
    const exactPercent = total > 0 ? (raw / total) * 100 : 0;
    const percent = raw === 0 ? 0 : Math.max(1, Math.round(exactPercent));
    result[effect] = { effect, raw, percent, exactPercent };
  }
  return result;
}

/**
 * Returns non-zero secondary effects (Giggly, Talkative) sorted by mention share descending,
 * formatted for the "Smokers also mention" footnote beneath the 8-effect dial.
 */
export function getSecondaryEffectShares(strain: Strain): EffectShareItem[] {
  const shares = getEffectShares(strain);
  return SECONDARY_EFFECT_KEYS.map((key) => shares[key])
    .filter((item) => item.raw > 0)
    .sort((a, b) => b.exactPercent - a.exactPercent);
}

/**
 * Computes a clean outer-ring percentage ceiling (multiple of 5%, minimum 25%)
 * across the 8 primary dial spokes so polygons remain legible and share a consistent scale.
 */
export function getEffectRadarScaleMax(strains: Strain[]): number {
  let peak = 0;
  for (const strain of strains) {
    const shares = getEffectShares(strain);
    for (const effect of EFFECT_CLOCK_ORDER) {
      if (shares[effect].exactPercent > peak) {
        peak = shares[effect].exactPercent;
      }
    }
  }
  return Math.max(25, Math.min(100, Math.ceil(peak / 5) * 5));
}

export interface FinderHighlight {
  label: string;
  tone: 'positive' | 'negative';
}

function getFlavorExactPercent(strain: Strain, flavor: FlavorKey): number {
  const total = Object.values(strain.flavorProfile).reduce(
    (sum, val) => sum + Math.max(0, val ?? 0),
    0
  );
  if (total <= 0) return 0;
  return (Math.max(0, strain.flavorProfile[flavor] ?? 0) / total) * 100;
}

function odorToNumeric(strain: Strain): number {
  if (strain.smellDuringFlowering) {
    const { none, weak, medium, strong } = strain.smellDuringFlowering;
    const total = none + weak + medium + strong;
    if (total > 0) {
      return (weak * 1 + medium * 2 + strong * 3) / total;
    }
  }
  if (strain.odorLevel === 'Low') return 1.0;
  if (strain.odorLevel === 'Medium') return 1.8;
  return 2.6;
}

/**
 * Computes concise directional trait highlights for collapsed Finder match rows:
 * - Only emits meaningful positive/negative differences (never neutral "Similar" notes).
 * - No parenthetical numbers.
 * - Grouped strictly positive (green) first, followed by negative (red).
 * - Isolated from `getSimilarStrains` so the full strain profile's Similar Strains list is unaffected.
 */
export function getFinderRowHighlights(
  candidate: Strain,
  criteria: SelectionCriterion[],
  referenceStrain?: Strain
): FinderHighlight[] {
  if (criteria.length === 0) return [];

  const positives: FinderHighlight[] = [];
  const negatives: FinderHighlight[] = [];
  const seen = new Set<string>();

  const pushHighlight = (label: string, tone: 'positive' | 'negative') => {
    if (seen.has(label)) return;
    seen.add(label);
    if (tone === 'positive') {
      positives.push({ label, tone });
    } else {
      negatives.push({ label, tone });
    }
  };

  for (const criterion of criteria) {
    switch (criterion.type) {
      case 'flavor': {
        for (const sub of criterion.subValues) {
          const flavor = sub as FlavorKey;
          const candPct = getFlavorExactPercent(candidate, flavor);
          if (referenceStrain) {
            const refPct = getFlavorExactPercent(referenceStrain, flavor);
            const diff = candPct - refPct;
            if (diff >= 4 || (candPct >= 8 && refPct === 0)) {
              pushHighlight(`More ${flavor}`, 'positive');
            } else if (diff <= -4 || (candPct === 0 && refPct > 0)) {
              pushHighlight(`Less ${flavor}`, 'negative');
            }
          } else {
            if (candPct >= 14) {
              pushHighlight(`Strong ${flavor}`, 'positive');
            } else if (candPct >= 6) {
              pushHighlight(`${flavor} notes`, 'positive');
            } else if (candPct === 0) {
              pushHighlight(`No ${flavor}`, 'negative');
            }
          }
        }
        break;
      }

      case 'effects': {
        const candShares = getEffectShares(candidate);
        const refShares = referenceStrain
          ? getEffectShares(referenceStrain)
          : null;
        for (const sub of criterion.subValues) {
          const effect = sub as EffectKey;
          const candPct = candShares[effect]?.exactPercent ?? 0;
          if (refShares) {
            const refPct = refShares[effect]?.exactPercent ?? 0;
            const diff = candPct - refPct;
            if (diff >= 3.5 || (candPct >= 8 && refPct === 0)) {
              pushHighlight(`More ${effect}`, 'positive');
            } else if (diff <= -3.5 || (candPct === 0 && refPct > 0)) {
              pushHighlight(`Less ${effect}`, 'negative');
            }
          } else {
            if (candPct >= 14) {
              pushHighlight(`Strong ${effect}`, 'positive');
            } else if (candPct <= 3) {
              pushHighlight(`Low ${effect}`, 'negative');
            }
          }
        }
        break;
      }

      case 'ease': {
        if (referenceStrain) {
          const diff =
            candidate.easeOfGrowing.easy - referenceStrain.easeOfGrowing.easy;
          if (diff >= 7) {
            pushHighlight('Easier to grow', 'positive');
          } else if (diff <= -7) {
            pushHighlight('Harder to grow', 'negative');
          }
        } else {
          if (candidate.easeOfGrowing.easy >= 70) {
            pushHighlight('Easy to grow', 'positive');
          } else if (candidate.easeOfGrowing.easy < 45) {
            pushHighlight('More demanding', 'negative');
          }
        }
        break;
      }

      case 'duration': {
        const candWks =
          candidate.durationWeeks.average ?? candidate.durationWeeks.median;
        if (referenceStrain) {
          const refWks =
            referenceStrain.durationWeeks.average ??
            referenceStrain.durationWeeks.median;
          if (refWks - candWks >= 0.7) {
            pushHighlight('Faster harvest', 'positive');
          } else if (candWks - refWks >= 0.7) {
            pushHighlight('Longer cycle', 'negative');
          }
        } else {
          if (candWks <= 9.5) {
            pushHighlight('Fast harvest', 'positive');
          } else if (candWks >= 12) {
            pushHighlight('Longer cycle', 'negative');
          }
        }
        break;
      }

      case 'yield': {
        const outdoor = criterion.subValues[0] === 'Outdoor (g/plant)';
        const candPerPlant = outdoor || candidate.seedType === 'Autoflower';
        const refPerPlant = referenceStrain
          ? outdoor || referenceStrain.seedType === 'Autoflower'
          : candPerPlant;

        const candVal = candPerPlant
          ? (candidate.yieldOutdoorGPlant.average ??
            candidate.yieldOutdoorGPlant.median)
          : (candidate.yieldIndoorGm2.average ??
            candidate.yieldIndoorGm2.median);

        if (referenceStrain && candPerPlant === refPerPlant) {
          const refVal = refPerPlant
            ? (referenceStrain.yieldOutdoorGPlant.average ??
              referenceStrain.yieldOutdoorGPlant.median)
            : (referenceStrain.yieldIndoorGm2.average ??
              referenceStrain.yieldIndoorGm2.median);
          if (refVal > 0 && candVal / refVal >= 1.12) {
            pushHighlight('Higher yield', 'positive');
          } else if (refVal > 0 && candVal / refVal <= 0.88) {
            pushHighlight('Lower yield', 'negative');
          }
        } else {
          const highCut = candPerPlant ? 110 : 520;
          const lowCut = candPerPlant ? 65 : 380;
          if (candVal >= highCut) {
            pushHighlight('High yield', 'positive');
          } else if (candVal < lowCut) {
            pushHighlight('Modest yield', 'negative');
          }
        }
        break;
      }

      case 'height': {
        const candCm = candidate.heightCm.average ?? candidate.heightCm.median;
        if (referenceStrain) {
          const refCm =
            referenceStrain.heightCm.average ?? referenceStrain.heightCm.median;
          if (refCm - candCm >= 10) {
            pushHighlight('More compact', 'positive');
          } else if (candCm - refCm >= 10) {
            pushHighlight('Taller plant', 'negative');
          }
        } else {
          if (candCm <= 80) {
            pushHighlight('Compact height', 'positive');
          } else if (candCm >= 125) {
            pushHighlight('Tall plant', 'negative');
          }
        }
        break;
      }

      case 'autoflower': {
        if (candidate.seedType === 'Autoflower') {
          if (!referenceStrain || referenceStrain.seedType !== 'Autoflower') {
            pushHighlight('Autoflower', 'positive');
          }
        } else {
          pushHighlight('Photoperiod', 'negative');
        }
        break;
      }

      case 'low-odor': {
        const candOdor = odorToNumeric(candidate);
        if (referenceStrain) {
          const refOdor = odorToNumeric(referenceStrain);
          if (refOdor - candOdor >= 0.45) {
            pushHighlight('Lower odor', 'positive');
          } else if (candOdor - refOdor >= 0.45) {
            pushHighlight('Stronger odor', 'negative');
          }
        } else {
          if (candOdor <= 1.25) {
            pushHighlight('Low odor', 'positive');
          } else if (candOdor >= 2.3) {
            pushHighlight('Strong odor', 'negative');
          }
        }
        break;
      }
    }
  }

  return [...positives, ...negatives];
}
