import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  Check,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import {
  EFFECT_CLOCK_ORDER,
  FLAVOR_COLORS,
  FLAVOR_ORDER,
  STRAINS,
} from '../data/strains';
import {
  SelectionCriterion,
  Strain,
  TraitType,
} from '../types/strain';

interface ConversationalFinderProps {
  referenceStrain?: Strain;
  referenceSkipped: boolean;
  criteria: SelectionCriterion[];
  onSelectReferenceStrain: (strainId: string) => void;
  onSkipReferenceStrain: () => void;
  onClearReferenceStrain: () => void;
  onUpsertCriterion: (criterion: SelectionCriterion) => void;
  onRemoveCriterion: (type: TraitType) => void;
  onResetAll: () => void;
  isMobileLayout?: boolean;
}

interface TraitOptionDef {
  type: TraitType;
  label: string;
  subQuestion?: string;
  subOptions?: string[];
  multiSelect?: boolean;
}

interface FlyingPill {
  id: number;
  traitType: TraitType;
  subValue: string;
  label: string;
  swatchColor?: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface InFlightSubValue {
  id: number;
  traitType: TraitType;
  value: string;
}

const TRAIT_OPTIONS: TraitOptionDef[] = [
  {
    type: 'flavor',
    label: 'Flavor',
    subQuestion: 'Which flavor notes stand out most to you?',
    subOptions: FLAVOR_ORDER,
    multiSelect: true,
  },
  {
    type: 'effects',
    label: 'Type of Effects',
    subQuestion: 'What kind of effects are you looking for?',
    subOptions: EFFECT_CLOCK_ORDER,
    multiSelect: true,
  },
  {
    type: 'ease',
    label: 'Easy Growing',
  },
  {
    type: 'duration',
    label: 'Fast Growing',
    subQuestion: 'What grow cycle pace fits your schedule?',
    subOptions: ['Express (<9 wks)', 'Fast (9–10 wks)', 'Standard (10–12 wks)'],
    multiSelect: false,
  },
  {
    type: 'yield',
    label: 'High Yield',
    subQuestion: 'Where do you plan to grow?',
    subOptions: ['Indoor (g/m²)', 'Outdoor (g/plant)', 'Either'],
    multiSelect: false,
  },
  {
    type: 'height',
    label: 'Compact Height',
    subQuestion: 'How much vertical space are you working with?',
    subOptions: [
      'Stealth / Micro (<80 cm)',
      'Standard Tent (80–120 cm)',
      'Open / Outdoor',
    ],
    multiSelect: false,
  },
  {
    type: 'autoflower',
    label: 'Autoflower',
  },
  {
    type: 'low-odor',
    label: 'Low Odor',
  },
];

/** Fast typewriter reveal that notifies when finished, respecting prefers-reduced-motion */
const TypedPrompt: React.FC<{
  text: string;
  onComplete: (completedText: string) => void;
}> = ({ text, onComplete }) => {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState(prefersReducedMotion ? text : '');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayed(text);
      onCompleteRef.current(text);
      return;
    }

    setDisplayed('');
    let idx = 0;
    let finished = false;
    const step = () => {
      idx += 2;
      if (idx >= text.length) {
        setDisplayed(text);
        if (!finished) {
          finished = true;
          window.clearInterval(interval);
          onCompleteRef.current(text);
        }
        return;
      }
      setDisplayed(text.slice(0, idx));
    };

    const interval = window.setInterval(step, 18);
    return () => window.clearInterval(interval);
  }, [text, prefersReducedMotion]);

  const isTyping = displayed.length < text.length;

  return (
    <p className="text-[15px] leading-relaxed text-[#F3F5F8] font-medium min-h-[24px]">
      {displayed}
      {isTyping && (
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-4 ml-0.5 align-middle bg-emerald-400"
        />
      )}
    </p>
  );
};

export const ConversationalFinder: React.FC<ConversationalFinderProps> = ({
  referenceStrain,
  referenceSkipped,
  criteria,
  onSelectReferenceStrain,
  onSkipReferenceStrain,
  onClearReferenceStrain,
  onUpsertCriterion,
  onRemoveCriterion,
  onResetAll,
  isMobileLayout = false,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [activeSubTrait, setActiveSubTrait] = useState<TraitType | null>(null);
  const [completedQuestion, setCompletedQuestion] = useState<string | null>(null);
  const [dismissingTrait, setDismissingTrait] = useState<TraitType | null>(null);
  const [flyingPills, setFlyingPills] = useState<FlyingPill[]>([]);
  const [inFlightSubValues, setInFlightSubValues] = useState<InFlightSubValue[]>(
    []
  );

  const finderContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const subValueContainerRefs = useRef<
    Partial<Record<TraitType, HTMLDivElement | null>>
  >({});
  const subValueTextRefs = useRef<
    Partial<Record<TraitType, HTMLSpanElement | null>>
  >({});
  const flightIdRef = useRef(0);
  const dismissTimerRef = useRef<number | null>(null);

  const step1Done = Boolean(referenceStrain) || referenceSkipped;

  // Filtered auto-suggestions
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [...STRAINS]
        .sort((a, b) => b.popularityViews - a.popularityViews)
        .slice(0, 7);
    }
    return STRAINS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.breederName.toLowerCase().includes(q) ||
        s.breederCode.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  useEffect(() => {
    setHighlightedIdx(0);
  }, [suggestions.length, searchQuery]);

  // If the currently open sub-trait was removed externally, close it & prune in-flight state
  useEffect(() => {
    if (
      activeSubTrait &&
      !criteria.some((c) => c.type === activeSubTrait)
    ) {
      setActiveSubTrait(null);
    }
    setInFlightSubValues((prev) =>
      prev.filter((item) => criteria.some((c) => c.type === item.traitType))
    );
  }, [criteria, activeSubTrait]);

  // Cleanup dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const handleFlightComplete = (pill: FlyingPill) => {
    setFlyingPills((prev) => prev.filter((p) => p.id !== pill.id));
    setInFlightSubValues((prev) => prev.filter((item) => item.id !== pill.id));
  };

  const activeSubDef = activeSubTrait
    ? TRAIT_OPTIONS.find((t) => t.type === activeSubTrait)
    : undefined;

  const activeSubCriterion = activeSubTrait
    ? criteria.find((c) => c.type === activeSubTrait)
    : undefined;

  const remainingTraits = TRAIT_OPTIONS.filter(
    (opt) => !criteria.some((c) => c.type === opt.type)
  );

  const handlePickStrain = (strain: Strain) => {
    setSearchQuery('');
    setDropdownOpen(false);
    onSelectReferenceStrain(strain.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setDropdownOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        Math.min(suggestions.length - 1, prev + 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter' && suggestions[highlightedIdx]) {
      e.preventDefault();
      handlePickStrain(suggestions[highlightedIdx]);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

  const commitTraitSelection = (opt: TraitOptionDef) => {
    onUpsertCriterion({
      id: opt.type,
      type: opt.type,
      label: opt.label,
      subValues: [],
    });

    if (opt.subOptions && opt.subOptions.length > 0) {
      setActiveSubTrait(opt.type);
    } else {
      setActiveSubTrait(null);
    }
  };

  const handleChooseTrait = (opt: TraitOptionDef) => {
    if (dismissingTrait === opt.type) return;

    if (prefersReducedMotion) {
      commitTraitSelection(opt);
      return;
    }

    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current);
    }
    setDismissingTrait(opt.type);
    dismissTimerRef.current = window.setTimeout(() => {
      dismissTimerRef.current = null;
      setDismissingTrait(null);
      commitTraitSelection(opt);
    }, 110);
  };

  const handleToggleSubOption = (
    opt: TraitOptionDef,
    value: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const existing = criteria.find((c) => c.type === opt.type);
    const currentValues = existing?.subValues ?? [];
    const isDeselecting = Boolean(opt.multiSelect && currentValues.includes(value));

    if (!isDeselecting && !prefersReducedMotion) {
      const containerEl = finderContainerRef.current;
      const targetContainerEl = subValueContainerRefs.current[opt.type];
      if (containerEl && targetContainerEl) {
        const containerRect = containerEl.getBoundingClientRect();
        const btnRect = e.currentTarget.getBoundingClientRect();
        const targetContainerRect = targetContainerEl.getBoundingClientRect();
        const textEl = subValueTextRefs.current[opt.type];

        const fromX = btnRect.left - containerRect.left - containerEl.clientLeft;
        const fromY = btnRect.top - containerRect.top - containerEl.clientTop;

        let toX =
          targetContainerRect.left -
          containerRect.left -
          containerEl.clientLeft -
          8;
        let toY =
          targetContainerRect.top -
          containerRect.top -
          containerEl.clientTop -
          (btnRect.height - targetContainerRect.height) / 2;

        if (opt.multiSelect && textEl && currentValues.length > 0) {
          const textRect = textEl.getBoundingClientRect();
          const maxX = Math.max(
            toX,
            containerRect.width - Math.min(btnRect.width, 130) - 24
          );
          toX = Math.min(
            textRect.right - containerRect.left - containerEl.clientLeft + 4,
            maxX
          );
          toY =
            textRect.top -
            containerRect.top -
            containerEl.clientTop -
            (btnRect.height - textRect.height) / 2;
        }

        const flightId = ++flightIdRef.current;
        const flavorSwatch =
          opt.type === 'flavor'
            ? FLAVOR_COLORS[value as keyof typeof FLAVOR_COLORS]
            : undefined;

        setInFlightSubValues((prev) => [
          ...prev,
          { id: flightId, traitType: opt.type, value },
        ]);
        setFlyingPills((prev) => [
          ...prev,
          {
            id: flightId,
            traitType: opt.type,
            subValue: value,
            label: value,
            swatchColor: flavorSwatch,
            fromX,
            fromY,
            toX,
            toY,
          },
        ]);
      }
    }

    if (opt.multiSelect) {
      const exists = currentValues.includes(value);
      const nextValues = exists
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value].slice(-3); // up to 3 highlighted notes
      onUpsertCriterion({
        id: opt.type,
        type: opt.type,
        label: opt.label,
        subValues: nextValues,
      });
    } else {
      onUpsertCriterion({
        id: opt.type,
        type: opt.type,
        label: opt.label,
        subValues: [value],
      });
      setActiveSubTrait(null);
    }
  };

  // Current conversational question text
  const currentQuestion = useMemo(() => {
    if (!step1Done) {
      return 'Can you provide the name of a strain you tried and liked?';
    }
    if (activeSubDef?.subQuestion) {
      return activeSubDef.subQuestion;
    }
    if (criteria.length === 0) {
      return referenceStrain
        ? `What did you like the most about ${referenceStrain.name} [${referenceStrain.breederCode}]?`
        : 'What is the most important thing you look for in a strain?';
    }
    if (remainingTraits.length === 0) {
      return 'You have added every available characteristic. Click any match on the right to compare, or edit your picks above.';
    }
    return referenceStrain
      ? `What else did you like about ${referenceStrain.name} [${referenceStrain.breederCode}]?`
      : 'What else is important to you in a strain?';
  }, [
    step1Done,
    activeSubDef,
    criteria.length,
    referenceStrain,
    remainingTraits.length,
  ]);

  const hasAnyInput = step1Done || criteria.length > 0;

  return (
    <div
      ref={finderContainerRef}
      className="relative rounded-xl bg-[#15181D] border border-white/[0.08] flex flex-col"
    >
      {/* Header */}
      <div
        className={`flex justify-between gap-3 px-4 sm:px-5 border-b border-white/[0.07] ${
          hasAnyInput ? 'items-center py-3.5' : 'items-start py-4'
        }`}
      >
        <div className="min-w-0">
          <h1 className="font-display text-lg sm:text-xl font-semibold text-[#F3F5F8] tracking-tight">
            Find Your Next Perfect Grow
          </h1>
          {!hasAnyInput && (
            <p className="text-xs sm:text-[13px] leading-relaxed text-[#969FA9] mt-1">
              Start with a strain you enjoyed or jump straight into the traits
              that matter most to you — matches and comparison charts update
              live.
            </p>
          )}
        </div>

        {hasAnyInput && (
          <button
            type="button"
            onClick={() => {
              if (dismissTimerRef.current !== null) {
                window.clearTimeout(dismissTimerRef.current);
                dismissTimerRef.current = null;
              }
              setDismissingTrait(null);
              setActiveSubTrait(null);
              setSearchQuery('');
              setFlyingPills([]);
              setInFlightSubValues([]);
              onResetAll();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#969FA9] hover:text-[#F3F5F8] px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start over</span>
          </button>
        )}
      </div>

      {/* Conversation thread */}
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Unified numbered results summary */}
        {hasAnyInput && (
          <ul className="flex flex-col gap-2 pb-3.5 border-b border-white/[0.06]">
            {step1Done && (
              <li className="flex items-center justify-between gap-2 bg-[#1C2026]/70 border border-white/[0.06] rounded-lg px-3 py-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <span className="font-mono text-xs text-[#7D8793] pt-0.5 w-4 shrink-0 tabular-nums">
                    1.
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-[#F3F5F8] block leading-snug">
                      The strain you enjoyed
                    </span>
                    <div className="text-xs mt-0.5 leading-snug">
                      {referenceStrain ? (
                        <>
                          <span className="font-medium text-emerald-300">
                            {referenceStrain.name}
                          </span>{' '}
                          <span className="font-mono text-[11px] text-[#8B95A1]">
                            [{referenceStrain.breederCode}]
                          </span>
                        </>
                      ) : (
                        <span className="text-[#8B95A1]">Not selected</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubTrait(null);
                      onClearReferenceStrain();
                      setTimeout(() => searchInputRef.current?.focus(), 40);
                    }}
                    className="text-xs text-[#969FA9] hover:text-[#F3F5F8] px-1.5 py-1 rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                  >
                    {referenceStrain ? 'Change' : 'Select'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubTrait(null);
                      if (referenceStrain && criteria.length > 0) {
                        onSkipReferenceStrain();
                      } else {
                        onClearReferenceStrain();
                      }
                    }}
                    aria-label={
                      referenceStrain
                        ? 'Cancel selected strain'
                        : 'Reset strain step'
                    }
                    className="p-1 text-[#8B95A1] hover:text-rose-300 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            )}

            <AnimatePresence initial={false}>
              {criteria.map((c, idx) => {
                const optDef = TRAIT_OPTIONS.find((t) => t.type === c.type);
                const isEditingThis = activeSubTrait === c.type;
                const hasSubOptions = Boolean(optDef?.subOptions?.length);
                const visibleSubValues = c.subValues.filter(
                  (v) =>
                    !inFlightSubValues.some(
                      (f) => f.traitType === c.type && f.value === v
                    )
                );
                const hasVisibleValues = visibleSubValues.length > 0;

                return (
                  <motion.li
                    key={c.id}
                    initial={
                      prefersReducedMotion
                        ? false
                        : { opacity: 0, height: 0 }
                    }
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={
                      prefersReducedMotion
                        ? undefined
                        : { opacity: 0, height: 0 }
                    }
                    transition={{
                      duration: 0.18,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 bg-[#1C2026]/70 border border-white/[0.06] rounded-lg px-3 py-2.5">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="font-mono text-xs text-[#7D8793] pt-0.5 w-4 shrink-0 tabular-nums">
                          {idx + 2}.
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm font-semibold text-[#F3F5F8] block leading-snug">
                            {c.label}
                          </span>
                          {hasSubOptions && (
                            <div
                              ref={(el) => {
                                subValueContainerRefs.current[c.type] = el;
                              }}
                              className="text-xs mt-0.5 leading-snug"
                            >
                              {hasVisibleValues ? (
                                <motion.span
                                  ref={(el) => {
                                    subValueTextRefs.current[c.type] = el;
                                  }}
                                  key={visibleSubValues.join('|')}
                                  initial={
                                    prefersReducedMotion
                                      ? false
                                      : { opacity: 0.35, y: 2 }
                                  }
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.15,
                                    ease: [0.16, 1, 0.3, 1],
                                  }}
                                  className="font-medium text-emerald-300 inline-block"
                                >
                                  {visibleSubValues.join(', ')}
                                </motion.span>
                              ) : (
                                <span
                                  ref={(el) => {
                                    subValueTextRefs.current[c.type] = el;
                                  }}
                                  className="text-[#8B95A1]"
                                >
                                  Not selected
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasSubOptions && !isEditingThis && (
                          <button
                            type="button"
                            onClick={() => setActiveSubTrait(c.type)}
                            className="text-xs text-[#969FA9] hover:text-[#F3F5F8] px-1.5 py-1 rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                          >
                            {hasVisibleValues ? 'Edit' : 'Select'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFlyingPills((prev) =>
                              prev.filter((p) => p.traitType !== c.type)
                            );
                            setInFlightSubValues((prev) =>
                              prev.filter((item) => item.traitType !== c.type)
                            );
                            onRemoveCriterion(c.type);
                          }}
                          aria-label={`Remove ${c.label}`}
                          className="p-1 text-[#8B95A1] hover:text-rose-300 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}

        {/* Active Typed Question */}
        <div className="flex flex-col gap-3.5">
          <TypedPrompt
            key={currentQuestion}
            text={currentQuestion}
            onComplete={setCompletedQuestion}
          />

          {/* STEP 1 INPUT: Search field appears first, then Skip row */}
          {!step1Done &&
            (Boolean(prefersReducedMotion) ||
              completedQuestion === currentQuestion) && (
              <div className="flex flex-col gap-3">
                <motion.div
                  initial={
                    prefersReducedMotion ? false : { opacity: 0, y: 6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.18,
                    delay: 0.04,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative"
                >
                  <Search className="w-4 h-4 text-[#858F9B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => {
                      window.setTimeout(() => setDropdownOpen(false), 160);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a strain or breeder (e.g. Afghan Kush, Fast Buds)..."
                    aria-label="Search for a strain you tried and liked"
                    aria-expanded={dropdownOpen}
                    className={`w-full pl-10 pr-4 bg-[#0D0F12] border border-white/15 rounded-lg text-sm text-[#F3F5F8] placeholder:text-[#6E7782] focus:outline-none focus:border-emerald-400/80 focus:ring-1 focus:ring-emerald-400/50 transition-colors ${
                      isMobileLayout ? 'min-h-[46px]' : 'h-11'
                    }`}
                  />

                  {dropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-xl bg-[#181C22] border border-white/12 shadow-2xl overflow-hidden max-h-64 overflow-y-auto studio-scroll">
                      {suggestions.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-[#969FA9]">
                          No strains match “{searchQuery}”. Try another name or
                          click “Skip”.
                        </div>
                      ) : (
                        <ul role="listbox">
                          {suggestions.map((strain, idx) => (
                            <li
                              key={strain.id}
                              role="option"
                              aria-selected={idx === highlightedIdx}
                            >
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handlePickStrain(strain);
                                }}
                                onMouseEnter={() => setHighlightedIdx(idx)}
                                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors ${
                                  idx === highlightedIdx
                                    ? 'bg-emerald-400/12 text-[#F3F5F8]'
                                    : 'text-[#D8DEE6] hover:bg-white/[0.04]'
                                }`}
                              >
                                <div className="min-w-0">
                                  <span className="text-sm font-medium block truncate">
                                    {strain.name}
                                  </span>
                                  <span className="text-xs text-[#8B95A1] block truncate">
                                    {strain.breederName} · {strain.seedType}
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-[#7D8793] shrink-0">
                                  [{strain.breederCode}]
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={
                    prefersReducedMotion ? false : { opacity: 0, y: 6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.18,
                    delay: 0.22,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-xs text-[#7D8793]">
                    Or skip to choose by traits directly
                  </span>
                  <button
                    type="button"
                    onClick={onSkipReferenceStrain}
                    className={`px-4 py-2 text-xs font-medium text-[#D8DEE6] bg-[#1C2026] hover:bg-[#242A32] border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      isMobileLayout ? 'min-h-[44px]' : ''
                    }`}
                  >
                    Skip
                  </button>
                </motion.div>
              </div>
            )}

          {/* STEP 2B: Sub-Question Option Pills (staggered one by one after typing finishes) */}
          {step1Done &&
            activeSubDef?.subOptions &&
            (Boolean(prefersReducedMotion) ||
              completedQuestion === currentQuestion) && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {activeSubDef.subOptions.map((val, idx) => {
                    const isSelected =
                      activeSubCriterion?.subValues.includes(val) ?? false;
                    const flavorSwatch =
                      activeSubDef.type === 'flavor'
                        ? FLAVOR_COLORS[val as keyof typeof FLAVOR_COLORS]
                        : undefined;

                    return (
                      <motion.button
                        key={val}
                        type="button"
                        initial={
                          prefersReducedMotion
                            ? false
                            : { opacity: 0, y: 6, scale: 0.96 }
                        }
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                          duration: 0.16,
                          delay: prefersReducedMotion ? 0 : idx * 0.036,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        onClick={(e) =>
                          handleToggleSubOption(activeSubDef, val, e)
                        }
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                          isMobileLayout ? 'min-h-[44px]' : 'min-h-[36px]'
                        } ${
                          isSelected
                            ? 'bg-emerald-400/18 border-emerald-400 text-emerald-200'
                            : 'bg-[#1C2026] border-white/10 text-[#D8DEE6] hover:border-white/25 hover:text-[#F3F5F8]'
                        }`}
                      >
                        {flavorSwatch && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: flavorSwatch }}
                          />
                        )}
                        <span>{val}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>

                {activeSubDef.multiSelect && (
                  <motion.div
                    initial={
                      prefersReducedMotion ? false : { opacity: 0, y: 4 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      delay: prefersReducedMotion
                        ? 0
                        : activeSubDef.subOptions.length * 0.036 + 0.05,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-center justify-between gap-2 pt-1"
                  >
                    <span className="text-xs text-[#858F9B]">
                      Select up to 3 notes · charts update immediately
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveSubTrait(null)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-400 text-[#0B1410] hover:bg-emerald-300 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                        isMobileLayout ? 'min-h-[44px]' : ''
                      }`}
                    >
                      {(activeSubCriterion?.subValues.length ?? 0) > 0
                        ? 'Continue'
                        : 'Any note works'}
                    </button>
                  </motion.div>
                )}
              </div>
            )}

          {/* STEP 2 & STEP 3: Main Characteristic Option Pills (staggered one by one) */}
          {step1Done &&
            !activeSubDef &&
            remainingTraits.length > 0 &&
            (Boolean(prefersReducedMotion) ||
              completedQuestion === currentQuestion) && (
              <div className="flex flex-wrap gap-2">
                {remainingTraits.map((opt, idx) => {
                  const isDismissing = dismissingTrait === opt.type;

                  return (
                    <motion.button
                      key={opt.type}
                      type="button"
                      layout={prefersReducedMotion ? false : 'position'}
                      initial={
                        prefersReducedMotion
                          ? false
                          : { opacity: 0, y: 6, scale: 0.96 }
                      }
                      animate={
                        isDismissing
                          ? { opacity: 0, scale: 0.85 }
                          : { opacity: 1, y: 0, scale: 1 }
                      }
                      transition={
                        isDismissing
                          ? { duration: 0.11, ease: 'easeOut' }
                          : {
                              duration: 0.16,
                              delay: prefersReducedMotion ? 0 : idx * 0.04,
                              ease: [0.16, 1, 0.3, 1],
                              layout: {
                                duration: 0.16,
                                ease: [0.16, 1, 0.3, 1],
                              },
                            }
                      }
                      onClick={() => handleChooseTrait(opt)}
                      className={`px-3.5 py-2 rounded-full text-xs font-medium bg-[#1C2026] hover:bg-[#252B34] border border-white/10 hover:border-white/25 text-[#ECEFF4] transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                        isMobileLayout ? 'min-h-[44px]' : 'min-h-[38px]'
                      }`}
                    >
                      {opt.label}
                    </motion.button>
                  );
                })}
              </div>
            )}
        </div>

        <div ref={scrollEndRef} />
      </div>

      {/* Airborne flying pills gliding into their numbered summary slots */}
      {!prefersReducedMotion && flyingPills.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-40 overflow-visible"
        >
          {flyingPills.map((pill) => {
            const dx = pill.toX - pill.fromX;
            const dy = pill.toY - pill.fromY;
            const arcOffset = Math.abs(dx) < 90 ? (dx >= 0 ? -14 : 14) : 0;
            const midX = pill.fromX + dx * 0.45 + arcOffset;
            const midY = pill.fromY + dy * 0.56;

            return (
              <motion.div
                key={pill.id}
                initial={{
                  x: pill.fromX,
                  y: pill.fromY,
                  scale: 1,
                  opacity: 1,
                }}
                animate={{
                  x: [pill.fromX, midX, pill.toX],
                  y: [pill.fromY, midY, pill.toY],
                  scale: [1, 1.05, 0.88],
                  opacity: [1, 1, 0.9, 0],
                }}
                transition={{
                  duration: 0.34,
                  ease: [0.22, 1, 0.36, 1],
                  x: {
                    duration: 0.34,
                    times: [0, 0.48, 1],
                    ease: [0.22, 1, 0.36, 1],
                  },
                  y: {
                    duration: 0.34,
                    times: [0, 0.48, 1],
                    ease: [0.22, 1, 0.36, 1],
                  },
                  scale: {
                    duration: 0.34,
                    times: [0, 0.4, 1],
                    ease: [0.22, 1, 0.36, 1],
                  },
                  opacity: {
                    duration: 0.34,
                    times: [0, 0.68, 0.88, 1],
                    ease: 'linear',
                  },
                }}
                onAnimationComplete={() => handleFlightComplete(pill)}
                className="absolute top-0 left-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium bg-[#1A2924] border border-emerald-400/75 text-emerald-200 shadow-lg whitespace-nowrap will-change-transform"
              >
                {pill.swatchColor && (
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: pill.swatchColor }}
                  />
                )}
                <span>{pill.label}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
