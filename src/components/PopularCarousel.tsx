import React, { useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { CAROUSEL_CATEGORIES, STRAINS } from '../data/strains';
import { CarouselCategoryId } from '../types/strain';

interface PopularCarouselProps {
  onSelectStrain: (strainId: string) => void;
  onViewMoreCategory: (categoryId: CarouselCategoryId) => void;
  isMobileLayout?: boolean;
}

export const PopularCarousel: React.FC<PopularCarouselProps> = ({
  onSelectStrain,
  onViewMoreCategory,
  isMobileLayout = false,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScrollBy = (direction: 'left' | 'right') => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = isMobileLayout ? el.clientWidth - 24 : el.clientWidth * 0.68;
    el.scrollBy({
      left: direction === 'right' ? step : -step,
      behavior: 'smooth',
    });
  };

  const handleScrollSync = () => {
    const el = scrollerRef.current;
    if (!el || !isMobileLayout) return;
    const cardWidth = el.clientWidth * 0.86;
    if (cardWidth > 0) {
      const idx = Math.round(el.scrollLeft / cardWidth);
      setActiveIndex(Math.max(0, Math.min(CAROUSEL_CATEGORIES.length - 1, idx)));
    }
  };

  return (
    <section aria-label="Popular strain lists" className="w-full">
      <div className="flex items-end justify-between gap-4 mb-3.5">
        <div>
          <h2
            className={`font-display font-semibold text-[#F3F5F8] tracking-tight ${
              isMobileLayout ? 'text-lg' : 'text-xl'
            }`}
          >
            Popular Seed Lists
          </h2>
          <p className="text-xs sm:text-sm text-[#969FA9] mt-0.5">
            Curated grower rankings across {CAROUSEL_CATEGORIES.length} categories
            {' '}· Swipe or browse left and right
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleScrollBy('left')}
            aria-label="Scroll strain lists left"
            className="min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg bg-[#15181D] border border-white/10 text-[#C6CDD6] hover:text-[#F3F5F8] hover:bg-[#1C2026] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollBy('right')}
            aria-label="Scroll strain lists right"
            className="min-h-[38px] min-w-[38px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg bg-[#15181D] border border-white/10 text-[#C6CDD6] hover:text-[#F3F5F8] hover:bg-[#1C2026] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div
        ref={scrollerRef}
        onScroll={handleScrollSync}
        className={`flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 ${
          isMobileLayout ? 'no-scrollbar -mx-1 px-1' : 'studio-scroll'
        }`}
      >
        {CAROUSEL_CATEGORIES.map((category) => {
          const topFive = category.filterAndSort(STRAINS).slice(0, 5);

          return (
            <article
              key={category.id}
              className={`snap-start shrink-0 rounded-xl bg-[#15181D] border border-white/[0.08] flex flex-col justify-between ${
                isMobileLayout
                  ? 'w-[86%] p-4'
                  : 'w-[82%] sm:w-[46%] lg:w-[calc((100%-28px)/3)] p-4'
              }`}
            >
              <div>
                <div className="flex items-baseline justify-between gap-2 pb-2.5 mb-2 border-b border-white/[0.07]">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-[#F3F5F8] truncate">
                      {category.title}
                    </h3>
                    <p className="text-xs text-[#8B95A1] truncate">
                      {category.subtitle}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#7D8793] shrink-0">
                    {category.metricLabel}
                  </span>
                </div>

                <ol className="divide-y divide-white/[0.05]">
                  {topFive.map((strain, idx) => (
                    <li key={strain.id}>
                      <button
                        type="button"
                        onClick={() => onSelectStrain(strain.id)}
                        className={`w-full flex items-center justify-between gap-2.5 text-left group hover:bg-white/[0.03] -mx-2 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                          isMobileLayout ? 'py-2.5 min-h-[48px]' : 'py-2'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="font-mono text-xs tabular-nums text-[#6E7782] pt-0.5 w-4 shrink-0">
                            {idx + 1}.
                          </span>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-[#ECEFF4] group-hover:text-emerald-300 transition-colors block truncate">
                              {strain.name}
                            </span>
                            <span className="text-xs text-[#858F9B] block truncate">
                              {strain.breederName}
                            </span>
                          </div>
                        </div>

                        <span className="font-mono text-xs tabular-nums text-[#A5AEB9] shrink-0">
                          {category.formatMetric(strain)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="pt-3 mt-2 border-t border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => onViewMoreCategory(category.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors min-h-[32px] whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
                >
                  <span>View more</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Mobile index indicator */}
      {isMobileLayout && (
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          {CAROUSEL_CATEGORIES.map((cat, idx) => (
            <span
              key={cat.id}
              className={`h-1 rounded-full transition-all duration-200 ${
                idx === activeIndex ? 'w-4 bg-emerald-400' : 'w-1.5 bg-white/15'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
