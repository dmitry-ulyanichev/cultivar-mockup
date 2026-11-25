import {
  EFFECT_CLOCK_ORDER,
  FLAVOR_ORDER,
} from '../data/strains';
import {
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
  return EFFECT_CLOCK_ORDER.map((k) => strain.effectsProfile[k] ?? 0);
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
        const chosenSum = criterion.subValues.reduce((acc, f) => {
          return acc + (candidate.flavorProfile[f as FlavorKey] ?? 0);
        }, 0);
        // Normalize: having 28%+ in chosen flavor(s) scores near 1.0
        const directScore = Math.min(1, chosenSum / 32);
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
        const avgTarget =
          criterion.subValues.reduce((acc, e) => {
            return acc + (candidate.effectsProfile[e as EffectKey] ?? 0);
          }, 0) / criterion.subValues.length;
        const directScore = Math.min(1, avgTarget / 92);
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

export function getSortedFlavors(
  strain: Strain
): Array<{ flavor: FlavorKey; percent: number }> {
  return (Object.entries(strain.flavorProfile) as Array<[FlavorKey, number]>)
    .filter(([, val]) => val > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([flavor, percent]) => ({ flavor, percent }));
}
