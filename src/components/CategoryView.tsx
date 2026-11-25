import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react';
import { CAROUSEL_CATEGORIES, STRAINS } from '../data/strains';
import { CarouselCategoryId, Strain } from '../types/strain';

interface CategoryViewProps {
  categoryId: CarouselCategoryId | 'all';
  onChangeCategory: (id: CarouselCategoryId | 'all') => void;
  onSelectStrain: (strainId: string) => void;
  onBack: () => void;
  isMobileLayout?: boolean;
}

type SortKey = 'default' | 'rating' | 'fastest' | 'easiest' | 'yield';

export const CategoryView: React.FC<CategoryViewProps> = ({
  categoryId,
  onChangeCategory,
  onSelectStrain,
  onBack,
  isMobileLayout = false,
}) => {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('default');

  const activeCategory =
    categoryId === 'all'
      ? undefined
      : CAROUSEL_CATEGORIES.find((c) => c.id === categoryId);

  const filteredStrains = useMemo(() => {
    const base: Strain[] = activeCategory
      ? activeCategory.filterAndSort(STRAINS)
      : [...STRAINS].sort((a, b) => b.popularityViews - a.popularityViews);

    const q = query.trim().toLowerCase();
    const matched = q
      ? base.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.breederName.toLowerCase().includes(q) ||
            s.breederCode.toLowerCase().includes(q)
        )
      : base;

    if (sortBy === 'default') return matched;

    return [...matched].sort((a, b) => {
      if (sortBy === 'rating') {
        return b.rating - a.rating || b.popularityViews - a.popularityViews;
      }
      if (sortBy === 'fastest') {
        return a.durationWeeks.median - b.durationWeeks.median;
      }
      if (sortBy === 'easiest') {
        return b.easeOfGrowing.easy - a.easeOfGrowing.easy;
      }
      if (sortBy === 'yield') {
        return b.yieldIndoorGm2.median - a.yieldIndoorGm2.median;
      }
      return 0;
    });
  }, [activeCategory, query, sortBy]);

  return (
    <div className="flex flex-col gap-5">
      {/* Header & Back */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#969FA9] hover:text-[#F3F5F8] w-fit transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 rounded"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Seed Finder</span>
        </button>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1
              className={`font-display font-semibold text-[#F3F5F8] tracking-tight ${
                isMobileLayout ? 'text-xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {activeCategory ? activeCategory.title : 'All Catalog Strains'}
            </h1>
            <p className="text-sm text-[#969FA9] mt-1">
              {activeCategory
                ? `${activeCategory.subtitle} · ${filteredStrains.length} breeder strains`
                : `Every seed line meeting the 5+ review cutoff · ${filteredStrains.length} strains`}
            </p>
          </div>
        </div>
      </div>

      {/* Category switcher tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => {
            onChangeCategory('all');
            setSortBy('default');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
            categoryId === 'all'
              ? 'bg-emerald-400/18 text-emerald-200 border border-emerald-400/40'
              : 'bg-[#15181D] text-[#A5AEB9] border border-white/[0.08] hover:text-[#F3F5F8]'
          }`}
        >
          All Strains
        </button>
        {CAROUSEL_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              onChangeCategory(cat.id);
              setSortBy('default');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
              categoryId === cat.id
                ? 'bg-emerald-400/18 text-emerald-200 border border-emerald-400/40'
                : 'bg-[#15181D] text-[#A5AEB9] border border-white/[0.08] hover:text-[#F3F5F8]'
            }`}
          >
            {cat.title}
          </button>
        ))}
      </div>

      {/* Search & Sort Controls */}
      <div
        className={`flex gap-3 ${
          isMobileLayout ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between'
        }`}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#858F9B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by strain or breeder..."
            aria-label="Filter strains in list"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#15181D] border border-white/10 text-sm text-[#F3F5F8] placeholder:text-[#6E7782] focus:outline-none focus:border-emerald-400/70"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[#15181D] border border-white/[0.08] overflow-x-auto no-scrollbar">
          {(
            [
              ['default', 'List Order'],
              ['rating', 'Top Rated'],
              ['fastest', 'Fastest'],
              ['easiest', 'Easiest'],
              ['yield', 'Yield'],
            ] as Array<[SortKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                sortBy === key
                  ? 'bg-[#232830] text-[#F3F5F8]'
                  : 'text-[#8B95A1] hover:text-[#D8DEE6]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Strain Table / List */}
      <div className="rounded-xl bg-[#15181D] border border-white/[0.08] overflow-hidden">
        {!isMobileLayout && (
          <div className="hidden md:grid grid-cols-[44px_minmax(0,2fr)_110px_90px_90px_110px_80px] gap-3 px-5 py-2.5 text-xs text-[#858F9B] border-b border-white/[0.07]">
            <span>#</span>
            <span>Strain & Breeder</span>
            <span>Type</span>
            <span className="text-right">Cycle</span>
            <span className="text-right">Ease</span>
            <span className="text-right">Indoor Yield</span>
            <span className="text-right">Rating</span>
          </div>
        )}

        {filteredStrains.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#969FA9]">
            No strains matched “{query}”.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {filteredStrains.map((strain, idx) => (
              <li key={strain.id}>
                <button
                  type="button"
                  onClick={() => onSelectStrain(strain.id)}
                  className={`w-full text-left hover:bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-400 ${
                    isMobileLayout
                      ? 'px-4 py-3.5 flex items-center justify-between gap-3'
                      : 'px-4 md:px-5 py-3 flex md:grid md:grid-cols-[44px_minmax(0,2fr)_110px_90px_90px_110px_80px] items-center justify-between gap-3'
                  }`}
                >
                  {!isMobileLayout && (
                    <span className="hidden md:block font-mono text-xs tabular-nums text-[#6E7782]">
                      {idx + 1}.
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isMobileLayout && (
                        <span className="font-mono text-xs tabular-nums text-[#6E7782] w-5 shrink-0">
                          {idx + 1}.
                        </span>
                      )}
                      <span className="text-sm font-semibold text-[#F3F5F8] truncate">
                        {strain.name}
                      </span>
                      <span className="font-mono text-[11px] text-[#7D8793] shrink-0">
                        [{strain.breederCode}]
                      </span>
                    </div>
                    <div
                      className={`text-xs text-[#8B95A1] truncate mt-0.5 ${
                        isMobileLayout ? 'pl-7' : ''
                      }`}
                    >
                      <span>{strain.breederName}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{strain.reviewTier} reviews</span>
                      {isMobileLayout && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            {strain.durationWeeks.median} wks
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">
                            {strain.easeOfGrowing.easy}% easy
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {!isMobileLayout ? (
                    <>
                      <span className="hidden md:block text-xs text-[#C6CDD6]">
                        {strain.seedType}
                      </span>
                      <span className="hidden md:block text-right font-mono text-xs tabular-nums text-[#D8DEE6]">
                        {strain.durationWeeks.median} wks
                      </span>
                      <span className="hidden md:block text-right font-mono text-xs tabular-nums text-emerald-300">
                        {strain.easeOfGrowing.easy}% easy
                      </span>
                      <span className="hidden md:block text-right font-mono text-xs tabular-nums text-[#D8DEE6]">
                        {strain.yieldIndoorGm2.median} g/m²
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[#F3F5F8] text-right shrink-0">
                        {strain.rating.toFixed(1)} / 5
                      </span>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-xs tabular-nums text-[#F3F5F8]">
                        {strain.rating.toFixed(1)}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#7D8793]" />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
