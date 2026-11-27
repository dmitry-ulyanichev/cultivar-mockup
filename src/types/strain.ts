export type ReviewTier = '5+' | '20+' | '50+' | '100+';

export type SeedType = 'Autoflower' | 'Photoperiod';

export type GeneticsType = 'Indica-dominant' | 'Hybrid' | 'Sativa-dominant';

export type OdorLevel = 'Low' | 'Medium' | 'High';

export type FlavorKey =
  | 'Berries'
  | 'Caramel'
  | 'Cheese'
  | 'Chocolate'
  | 'Citrus'
  | 'Cream'
  | 'Diesel'
  | 'Earthy'
  | 'Flowery'
  | 'Fruity'
  | 'Herbs'
  | 'Mint'
  | 'Nutty'
  | 'Pine'
  | 'Pungent'
  | 'Sour'
  | 'Sweet'
  | 'Tropical'
  | 'Woody';

export type ChartFlavorKey = FlavorKey | 'Other';

export interface ChartFlavorItem {
  flavor: ChartFlavorKey;
  percent: number;
  exactPercent: number;
  otherBreakdown?: Array<{ flavor: FlavorKey; percent: number }>;
}

/**
 * 8 primary effects arranged clockwise on an octagonal dial:
 * 12:00 Energetic -> 1:30 Uplifted -> 3:00 Creative -> 4:30 Hungry
 * -> 6:00 Sleepy -> 7:30 Relaxed -> 9:00 Happy -> 10:30 Euphoric
 */
export type PrimaryEffectKey =
  | 'Energetic'
  | 'Uplifted'
  | 'Creative'
  | 'Hungry'
  | 'Sleepy'
  | 'Relaxed'
  | 'Happy'
  | 'Euphoric';

/** Additional effects surfaced beneath the dial as "Smokers also mention" */
export type SecondaryEffectKey = 'Giggly' | 'Talkative';

export type EffectKey = PrimaryEffectKey | SecondaryEffectKey;

export interface DistributionBucket {
  /** Point value (e.g. week 10) or interval start when `end` is provided (e.g. 60 for 60–80 cm) */
  value: number;
  /** Optional interval upper bound for binned continuous data (e.g. 80 for 60–80 cm) */
  end?: number;
  count: number;
}

export interface DistributionRange {
  min: number;
  typicalLow: number;
  median: number;
  /** Arithmetic mean; falls back to median when omitted */
  average?: number;
  typicalHigh: number;
  max: number;
  /** Optional empirical bucket counts (e.g. grower diary counts per week) */
  buckets?: DistributionBucket[];
  /** Optional exact continuous measurements (e.g. cm, g/plant) for bin-free distribution ridges */
  rawValues?: number[];
}

export interface EaseBreakdown {
  easy: number;
  medium: number;
  hard: number;
}

export interface SmellBreakdown {
  /** Counts or percentages for flowering-stage smell intensity */
  none: number;
  weak: number;
  medium: number;
  strong: number;
}

export interface SativaIndicaVote {
  /** 0 = 100% Sativa, 50 = 50/50 Balanced, 100 = 100% Indica */
  indicaPercent: number;
  count: number;
}

export interface Strain {
  id: string;
  name: string;
  breederName: string;
  breederCode: string;
  geneticsType: GeneticsType;
  /** 0 = pure indica, 100 = pure sativa */
  sativaRatio: number;
  /** Optional empirical Sativa–Indica balance votes from smoke reports */
  sativaIndicaVotes?: SativaIndicaVote[];
  seedType: SeedType;
  rating: number;
  reviewTier: ReviewTier;
  popularityViews: number;
  trendingScore: number;
  odorLevel: OdorLevel;
  /** Optional empirical grower breakdown of smell level during flowering */
  smellDuringFlowering?: SmellBreakdown;
  flavorProfile: Partial<Record<FlavorKey, number>>;
  effectsProfile: Partial<Record<EffectKey, number>>;
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
