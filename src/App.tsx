/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  MessageSquare,
  Monitor,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { CategoryView } from './components/CategoryView';
import { ConversationalFinder } from './components/ConversationalFinder';
import { MatchResultsPanel } from './components/MatchResultsPanel';
import { PopularCarousel } from './components/PopularCarousel';
import { StrainDetailView } from './components/StrainDetailView';
import { getStrainById, STRAINS } from './data/strains';
import {
  ActiveView,
  CarouselCategoryId,
  SelectionCriterion,
  TraitType,
} from './types/strain';
import { computeRankedMatches } from './utils/matching';

export default function App() {
  // Navigation state
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'home' });
  const [previousView, setPreviousView] = useState<ActiveView>({ type: 'home' });

  // Dual mockup preview mode (Desktop default vs interactive 390px Mobile mockup)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isNativeMobile, setIsNativeMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<'finder' | 'matches'>('finder');

  // Shared Conversational Finder & Matching State
  const [referenceStrainId, setReferenceStrainId] = useState<string | null>(null);
  const [referenceSkipped, setReferenceSkipped] = useState(false);
  const [criteria, setCriteria] = useState<SelectionCriterion[]>([]);
  const [comparedMatchId, setComparedMatchId] = useState<string | null>(null);

  const finderSectionRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkViewport = () => {
      setIsNativeMobile(window.innerWidth < 768);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const isMobileUI = isNativeMobile || previewMode === 'mobile';

  const referenceStrain = useMemo(
    () => getStrainById(referenceStrainId),
    [referenceStrainId]
  );

  const rankedMatches = useMemo(() => {
    if (!referenceStrain && criteria.length === 0) return [];
    return computeRankedMatches(STRAINS, referenceStrain, criteria);
  }, [referenceStrain, criteria]);

  // Keep comparedMatchId pinned to top #1 whenever criteria/reference changes and current isn't valid
  useEffect(() => {
    if (rankedMatches.length === 0) {
      setComparedMatchId(null);
      return;
    }
    const stillExists = rankedMatches.some(
      (m) => m.strain.id === comparedMatchId
    );
    if (!stillExists) {
      setComparedMatchId(rankedMatches[0].strain.id);
    }
  }, [rankedMatches, comparedMatchId]);

  const scrollToTop = () => {
    if (previewMode === 'mobile' && !isNativeMobile && mobileScrollRef.current) {
      mobileScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Navigation handlers
  const navigateTo = (next: ActiveView) => {
    setPreviousView(activeView);
    setActiveView(next);
    scrollToTop();
  };

  const handleOpenStrain = (strainId: string) => {
    navigateTo({ type: 'strain', strainId });
  };

  const handleOpenCategory = (categoryId: CarouselCategoryId | 'all') => {
    navigateTo({ type: 'category', categoryId });
  };

  const handleGoBack = () => {
    if (previousView.type !== activeView.type) {
      setActiveView(previousView);
    } else {
      setActiveView({ type: 'home' });
    }
    scrollToTop();
  };

  const handleExploreInFinder = (strainId: string) => {
    setReferenceStrainId(strainId);
    setReferenceSkipped(false);
    setCriteria([]);
    setComparedMatchId(null);
    setActiveView({ type: 'home' });
    setMobileTab('finder');
    window.setTimeout(() => {
      finderSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  };

  // Finder state mutations
  const handleSelectReferenceStrain = (strainId: string) => {
    setReferenceStrainId(strainId);
    setReferenceSkipped(false);
    setComparedMatchId(null);
  };

  const handleSkipReferenceStrain = () => {
    setReferenceStrainId(null);
    setReferenceSkipped(true);
    setComparedMatchId(null);
  };

  const handleClearReferenceStrain = () => {
    setReferenceStrainId(null);
    setReferenceSkipped(false);
    setComparedMatchId(null);
  };

  const handleUpsertCriterion = (next: SelectionCriterion) => {
    setCriteria((prev) => {
      const idx = prev.findIndex((item) => item.type === next.type);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [...prev, next];
    });
    // Reset compared match so the newly computed #1 rises to the top comparison slot
    setComparedMatchId(null);
  };

  const handleRemoveCriterion = (type: TraitType) => {
    setCriteria((prev) => prev.filter((item) => item.type !== type));
    setComparedMatchId(null);
  };

  const handleResetFinder = () => {
    setReferenceStrainId(null);
    setReferenceSkipped(false);
    setCriteria([]);
    setComparedMatchId(null);
    setActiveView({ type: 'home' });
    setMobileTab('finder');
  };

  const handleLoadPreset = (
    preset: 'afghan-flavor' | 'beginner-auto' | 'citrus-day'
  ) => {
    if (preset === 'afghan-flavor') {
      setReferenceStrainId('afghan-kush-auto-fb');
      setReferenceSkipped(false);
      setCriteria([
        {
          id: 'flavor',
          type: 'flavor',
          label: 'Flavor',
          subValues: ['Earthy'],
        },
        {
          id: 'effects',
          type: 'effects',
          label: 'Type of Effects',
          subValues: ['Relaxed', 'Sleepy'],
        },
      ]);
      setComparedMatchId(null);
    } else if (preset === 'citrus-day') {
      setReferenceStrainId(null);
      setReferenceSkipped(true);
      setCriteria([
        {
          id: 'flavor',
          type: 'flavor',
          label: 'Flavor',
          subValues: ['Citrus'],
        },
        {
          id: 'effects',
          type: 'effects',
          label: 'Type of Effects',
          subValues: ['Energetic', 'Creative'],
        },
      ]);
      setComparedMatchId(null);
    } else {
      setReferenceStrainId(null);
      setReferenceSkipped(true);
      setCriteria([
        { id: 'ease', type: 'ease', label: 'Easy Growing', subValues: [] },
        {
          id: 'duration',
          type: 'duration',
          label: 'Fast Growing',
          subValues: ['Express (<9 wks)'],
        },
        {
          id: 'height',
          type: 'height',
          label: 'Compact Height',
          subValues: ['Stealth / Micro (<80 cm)'],
        },
      ]);
      setComparedMatchId(null);
    }
  };

  const activeStrainDetail =
    activeView.type === 'strain'
      ? getStrainById(activeView.strainId)
      : undefined;

  const hasLiveMatches = rankedMatches.length > 0;

  // Render the dedicated Mobile Experience (either inside the 390px mockup frame or full-bleed on phones)
  const renderMobileExperience = () => (
    <div
      className={
        isNativeMobile
          ? 'min-h-screen flex flex-col bg-[#0D0F12]'
          : 'w-[390px] h-[790px] rounded-[28px] bg-[#0D0F12] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.65)] overflow-hidden flex flex-col relative'
      }
    >
      {/* Compact Mobile Top Bar (52px — well within 15% sticky budget) */}
      <header className="h-[52px] shrink-0 px-4 bg-[#12151A]/95 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between gap-2 z-20">
        {activeView.type === 'home' ? (
          <button
            type="button"
            onClick={() => {
              setActiveView({ type: 'home' });
              setMobileTab('finder');
            }}
            className="font-display text-lg font-bold tracking-tight text-[#F3F5F8] whitespace-nowrap shrink-0"
          >
            Cultivar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D8DEE6] min-h-[44px] -ml-1 px-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        <div className="flex items-center gap-1.5">
          {activeView.type === 'home' && (
            <button
              type="button"
              onClick={() => handleOpenCategory('all')}
              className="text-xs font-medium text-[#969FA9] hover:text-[#F3F5F8] px-2 py-1.5 rounded-md whitespace-nowrap"
            >
              All Seeds
            </button>
          )}
          <button
            type="button"
            onClick={handleResetFinder}
            aria-label="Reset finder"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#969FA9] hover:text-[#F3F5F8] hover:bg-white/[0.06]"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Scrollable Body */}
      <div
        ref={mobileScrollRef}
        className="flex-1 overflow-y-auto studio-scroll px-4 py-4 pb-6"
      >
        {activeView.type === 'home' && mobileTab === 'finder' && (
          <div className="flex flex-col gap-5">
            <PopularCarousel
              onSelectStrain={handleOpenStrain}
              onViewMoreCategory={(id) => handleOpenCategory(id)}
              isMobileLayout
            />

            <div ref={finderSectionRef}>
              <ConversationalFinder
                referenceStrain={referenceStrain}
                referenceSkipped={referenceSkipped}
                criteria={criteria}
                onSelectReferenceStrain={handleSelectReferenceStrain}
                onSkipReferenceStrain={handleSkipReferenceStrain}
                onClearReferenceStrain={handleClearReferenceStrain}
                onUpsertCriterion={handleUpsertCriterion}
                onRemoveCriterion={handleRemoveCriterion}
                onResetAll={handleResetFinder}
                isMobileLayout
              />
            </div>
          </div>
        )}

        {activeView.type === 'home' && mobileTab === 'matches' && (
          <MatchResultsPanel
            referenceStrain={referenceStrain}
            criteria={criteria}
            matches={rankedMatches}
            comparedMatchId={comparedMatchId}
            onSelectComparedMatch={setComparedMatchId}
            onOpenStrainProfile={handleOpenStrain}
            onRemoveCriterion={handleRemoveCriterion}
            onLoadPreset={handleLoadPreset}
            isMobileLayout
          />
        )}

        {activeView.type === 'category' && (
          <CategoryView
            categoryId={activeView.categoryId}
            onChangeCategory={(id) =>
              setActiveView({ type: 'category', categoryId: id })
            }
            onSelectStrain={handleOpenStrain}
            onBack={handleGoBack}
            isMobileLayout
          />
        )}

        {activeView.type === 'strain' && activeStrainDetail && (
          <StrainDetailView
            strain={activeStrainDetail}
            onSelectStrain={handleOpenStrain}
            onExploreInFinder={handleExploreInFinder}
            onBack={handleGoBack}
            isMobileLayout
          />
        )}
      </div>

      {/* Single contextual thumb-zone button once matches exist (60px height; 52+60 = 112px < 15% cap) */}
      {activeView.type === 'home' &&
        (hasLiveMatches || mobileTab === 'matches') && (
          <nav
            aria-label="Mobile workspace action"
            className="h-[60px] shrink-0 px-4 flex items-center bg-[#12151A]/95 backdrop-blur-md border-t border-white/[0.08] z-20"
          >
            {mobileTab === 'finder' ? (
              <button
                type="button"
                onClick={() => {
                  setMobileTab('matches');
                  scrollToTop();
                }}
                className="w-full h-[44px] px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#0B1410] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                <BarChart3 className="w-4 h-4 shrink-0" />
                <span className="tabular-nums">
                  See Matches ({rankedMatches.length})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMobileTab('finder');
                  scrollToTop();
                }}
                className="w-full h-[44px] px-4 rounded-xl bg-[#1C2026] hover:bg-[#252B34] border border-white/15 text-[#F3F5F8] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors active:scale-[0.99] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-emerald-300" />
                <span>Continue Selection</span>
              </button>
            )}
          </nav>
        )}
    </div>
  );

  // Native smartphone renders mobile layout full-screen
  if (isNativeMobile) {
    return renderMobileExperience();
  }

  return (
    <div className="min-h-screen bg-[#0D0F12] text-[#F3F5F8] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#0D0F12]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveView({ type: 'home' })}
            className="font-display text-xl font-bold tracking-tight text-[#F3F5F8] hover:text-emerald-300 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded"
          >
            Cultivar
          </button>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-7 text-sm font-medium text-[#A5AEB9]"
          >
            <button
              type="button"
              onClick={() => setActiveView({ type: 'home' })}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F3F5F8] ${
                activeView.type === 'home' ? 'text-[#F3F5F8]' : ''
              }`}
            >
              Seed Finder
            </button>
            <button
              type="button"
              onClick={() => handleOpenCategory('most-viewed')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F3F5F8] ${
                activeView.type === 'category' && activeView.categoryId !== 'all'
                  ? 'text-[#F3F5F8]'
                  : ''
              }`}
            >
              Popular Lists
            </button>
            <button
              type="button"
              onClick={() => handleOpenCategory('all')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#F3F5F8] ${
                activeView.type === 'category' && activeView.categoryId === 'all'
                  ? 'text-[#F3F5F8]'
                  : ''
              }`}
            >
              All Strains
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleResetFinder}
              className="px-4 py-2 text-xs font-semibold text-[#0B1410] bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              New Search
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Sub-Bar: Interactive Desktop / Mobile 390px Mockup Switcher */}
      <div className="border-b border-white/[0.06] bg-[#111418]">
        <div className="max-w-[1360px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="text-xs text-[#8B95A1] truncate">
            <span>Seed Selection Studio</span>
            <span aria-hidden="true"> · </span>
            <span>36 breeder cultivars</span>
            <span aria-hidden="true"> · </span>
            <span>5+ review cutoff</span>
          </div>

          <div
            role="group"
            aria-label="Mockup viewport preview mode"
            className="flex items-center gap-1 p-1 rounded-lg bg-[#0D0F12] border border-white/[0.08] shrink-0"
          >
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                previewMode === 'desktop'
                  ? 'bg-[#1F242C] text-[#F3F5F8]'
                  : 'text-[#8B95A1] hover:text-[#D8DEE6]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop View</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                previewMode === 'mobile'
                  ? 'bg-[#1F242C] text-[#F3F5F8]'
                  : 'text-[#8B95A1] hover:text-[#D8DEE6]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile 390px</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-6 py-7">
        {isMobileUI ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <p className="text-xs text-[#8B95A1] text-center max-w-md">
              Interactive 390px mobile mockup sharing live state with Desktop
              View. Switch tabs at the bottom of the frame to test Finder and
              Matches & Charts.
            </p>
            {renderMobileExperience()}
          </div>
        ) : (
          <>
            {activeView.type === 'home' && (
              <div className="flex flex-col gap-9">
                {/* Top Popular Strains Carousel */}
                <PopularCarousel
                  onSelectStrain={handleOpenStrain}
                  onViewMoreCategory={(id) => handleOpenCategory(id)}
                />

                {/* Main Split-View Selection Block */}
                <section
                  ref={finderSectionRef}
                  aria-label="Interactive strain selection workspace"
                  className="pt-6 border-t border-white/[0.07]"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[385px_minmax(0,1fr)] gap-6 items-start">
                    {/* Left: Conversational Selection Block */}
                    <div className="lg:sticky lg:top-24">
                      <ConversationalFinder
                        referenceStrain={referenceStrain}
                        referenceSkipped={referenceSkipped}
                        criteria={criteria}
                        onSelectReferenceStrain={handleSelectReferenceStrain}
                        onSkipReferenceStrain={handleSkipReferenceStrain}
                        onClearReferenceStrain={handleClearReferenceStrain}
                        onUpsertCriterion={handleUpsertCriterion}
                        onRemoveCriterion={handleRemoveCriterion}
                        onResetAll={handleResetFinder}
                      />
                    </div>

                    {/* Right: Live Ranked Matches & Stacked Side-by-Side Comparison Charts */}
                    <MatchResultsPanel
                      referenceStrain={referenceStrain}
                      criteria={criteria}
                      matches={rankedMatches}
                      comparedMatchId={comparedMatchId}
                      onSelectComparedMatch={setComparedMatchId}
                      onOpenStrainProfile={handleOpenStrain}
                      onRemoveCriterion={handleRemoveCriterion}
                      onLoadPreset={handleLoadPreset}
                    />
                  </div>
                </section>
              </div>
            )}

            {activeView.type === 'category' && (
              <CategoryView
                categoryId={activeView.categoryId}
                onChangeCategory={(id) =>
                  setActiveView({ type: 'category', categoryId: id })
                }
                onSelectStrain={handleOpenStrain}
                onBack={handleGoBack}
              />
            )}

            {activeView.type === 'strain' && activeStrainDetail && (
              <StrainDetailView
                strain={activeStrainDetail}
                onSelectStrain={handleOpenStrain}
                onExploreInFinder={handleExploreInFinder}
                onBack={handleGoBack}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-white/[0.06] mt-12">
        <div className="max-w-[1360px] mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[#7D8793]">
          <span>Cultivar · Interactive Seed Selection Mockup</span>
          <span>Grower-reported catalog · 5+ review threshold</span>
        </div>
      </footer>
    </div>
  );
}
