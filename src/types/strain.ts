export type ReviewTier = '5+' | '20+' | '50+' | '100+';

export type SeedType = 'Autoflower' | 'Photoperiod';

export type GeneticsType = 'Indica-dominant' | 'Hybrid' | 'Sativa-dominant';

export type OdorLevel = 'Low' | 'Medium' | 'High';

export type FlavorKey =
  | 'Earthy'
  | 'Citrus'
  | 'Herbs'
  | 'Pine'
  | 'Woody'
  | 'Fruity'
  | 'Flowery'
  | 'Berries'
  | 'Sweet'
  | 'Diesel';

/**
 * 10 effects arranged clockwise on a 12-hour dial:
 * 12:00 Energetic -> 1:12 Uplifted -> 2:24 Focused -> 3:36 Giggly -> 4:48 Hungry
 * -> 6:00 Sleepy -> 7:12 Relaxed -> 8:24 Happy -> 9:36 Euphoric -> 10:48 Creative
 */
export type EffectKey =
  | 'Energetic'
  | 'Uplifted'
  | 'Focused'
  | 'Giggly'
  | 'Hungry'
  | 'Sleepy'
  | 'Relaxed'
  | 'Happy'
  | 'Euphoric'
  | 'Creative';

export interface DistributionRange {
  min: number;
  typicalLow: number;
  median: number;
  typicalHigh: number;
  max: number;
}

export interface EaseBreakdown {
  easy: number;
  medium: number;
  hard: number;
}

export interface Strain {
  id: string;
  name: string;
  breederName: string;
  breederCode: string;
  geneticsType: GeneticsType;
  /** 0 = pure indica, 100 = pure sativa */
  sativaRatio: number;
  seedType: SeedType;
  rating: number;
  reviewTier: ReviewTier;
  popularityViews: number;
  trendingScore: number;
  odorLevel: OdorLevel;
  flavorProfile: Partial<Record<FlavorKey, number>>;
  effectsProfile: Record<EffectKey, number>;
  easeOfGrowing: EaseBreakdown;
  /** Seed-to-harvest total weeks for autos; flowering weeks for photos */
  durationWeeks: DistributionRange;
  yieldIndoorGm2: DistributionRange;
  yieldOutdoorGPlant: DistributionRange;
  heightCm: DistributionRange;
  tags: Array<'purple' | 'lemony' | 'auto' | 'beginner' | 'stealth' | 'heavy'>;
  shortNote: string;
}

export type CarouselCategoryId =
  | 'most-viewed'
  | 'trending'
  | 'highest-rated'
  | 'top-autos'
  | 'fastest-harvest'
  | 'purple-strains'
  | 'lemony-citrus';

export interface CarouselCategory {
  id: CarouselCategoryId;
  title: string;
  subtitle: string;
  metricLabel: string;
  filterAndSort: (strains: Strain[]) => Strain[];
  formatMetric: (strain: Strain) => string;
}

export type TraitType =
  | 'flavor'
  | 'effects'
  | 'ease'
  | 'duration'
  | 'yield'
  | 'height'
  | 'autoflower'
  | 'low-odor';

export interface SelectionCriterion {
  id: string;
  type: TraitType;
  label: string;
  subValues: string[];
  subLabel?: string;
}

export interface MatchResult {
  strain: Strain;
  matchPercent: number;
  traitScores: Partial<Record<TraitType, number>>;
}

export type ComparisonNoteTone = 'positive' | 'neutral' | 'negative';

export interface ComparisonNote {
  label: string;
  tone: ComparisonNoteTone;
}

export interface SimilarStrainEntry {
  strain: Strain;
  matchPercent: number;
  notes: ComparisonNote[];
}

export type ActiveView =
  | { type: 'home' }
  | { type: 'category'; categoryId: CarouselCategoryId | 'all' }
  | { type: 'strain'; strainId: string };
