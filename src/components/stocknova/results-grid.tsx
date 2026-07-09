'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchX, Loader2, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { AssetCard } from './asset-card'
import { FilterRail } from './filter-rail'
import { useStockStore } from '@/lib/store'
import type { Asset } from '@/lib/types'

function sortResults(results: Asset[], sort: 'relevance' | 'newest'): Asset[] {
  if (sort === 'newest') {
    return [...results].sort((a, b) => {
      const da = parseDate(a.meta?.date)
      const db = parseDate(b.meta?.date)
      if (da && db) return db - da
      if (da) return -1
      if (db) return 1
      return 0
    })
  }
  return results
}

function parseDate(d: unknown): number | null {
  if (!d || typeof d !== 'string') return null
  const t = Date.parse(d)
  return Number.isNaN(t) ? null : t
}

export function ResultsGrid() {
  const loading = useStockStore((s) => s.loading)
  const results = useStockStore((s) => s.results)
  const filterKind = useStockStore((s) => s.filterKind)
  const sort = useStockStore((s) => s.sort)
  const lastQuery = useStockStore((s) => s.lastQuery)
  const lastMs = useStockStore((s) => s.lastMs)
  const hasSearched = useStockStore((s) => s.hasSearched)
  const error = useStockStore((s) => s.error)

  const filtered = React.useMemo(() => {
    const base =
      filterKind === 'all'
        ? results
        : results.filter((r) => r.kind === filterKind)
    return sortResults(base, sort)
  }, [results, filterKind, sort])

  if (!hasSearched && !loading) {
    return null
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <FilterRail />

        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                {loading
                  ? 'Searching…'
                  : error
                    ? 'No results'
                    : `Results for “${lastQuery}”`}
              </h2>
              {!loading && !error && (
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-zinc-400">
                  {filtered.length} {filtered.length === 1 ? 'asset' : 'assets'}
                </span>
              )}
            </div>
            {!loading && !error && lastMs !== null && (
              <span className="text-xs text-zinc-500">
                <Sparkles className="mr-1 inline size-3 text-emerald-400" />
                {lastMs < 1000
                  ? `${lastMs}ms`
                  : `${(lastMs / 1000).toFixed(1)}s`}{' '}
                · via ZAI
              </span>
            )}
          </div>

          {/* States */}
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="sn-glass overflow-hidden rounded-2xl"
                  >
                    <Skeleton className="aspect-[4/3] w-full rounded-none bg-white/5" />
                    <div className="space-y-2 p-3">
                      <Skeleton className="h-3 w-3/4 bg-white/5" />
                      <Skeleton className="h-3 w-1/2 bg-white/5" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-20 text-center"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-400/30">
                  <SearchX className="size-5 text-red-300" />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    Search failed
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-zinc-400">{error}</p>
                </div>
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-20 text-center"
              >
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <SearchX className="size-5 text-zinc-400" />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    No assets found
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-zinc-400">
                    Try a different keyword, switch the format, or change the
                    source. Some sources may be slow — retry in a moment.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`grid-${filterKind}-${sort}-${lastQuery}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
              >
                {filtered.map((a, i) => (
                  <AssetCard key={a.assetId} asset={a} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
