'use client'

import * as React from 'react'
import { Search, Sparkles, Loader2, AlertCircle, X, BadgeCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { motion } from 'framer-motion'
import { useStockStore } from '@/lib/store'
import { TrendingChips } from './trending-chips'
import type { SearchType, SourceKey } from '@/lib/types'
import { cn } from '@/lib/utils'

const FORMAT_CHIPS: { key: SearchType; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Sparkles className="size-3.5" /> },
  { key: 'image', label: 'Images', icon: <span className="text-[10px] font-bold">IMG</span> },
  { key: 'video', label: 'Videos', icon: <span className="text-[10px] font-bold">VID</span> },
  { key: 'audio', label: 'Audio', icon: <span className="text-[10px] font-bold">AUD</span> },
  { key: 'pdf', label: 'PDF', icon: <span className="text-[10px] font-bold">PDF</span> },
  { key: 'doc', label: 'Docs', icon: <span className="text-[10px] font-bold">DOC</span> },
  { key: 'social', label: 'Social', icon: <span className="text-[10px] font-bold">SOC</span> },
  { key: 'web', label: 'Web', icon: <span className="text-[10px] font-bold">WEB</span> },
]

const SOURCE_OPTIONS: { key: SourceKey; label: string }[] = [
  { key: 'all', label: 'All Sources' },
  { key: 'google', label: 'Google' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'web', label: 'Web' },
  { key: 'images', label: 'Image Sites' },
]

export function HeroSearch() {
  const query = useStockStore((s) => s.query)
  const setQuery = useStockStore((s) => s.setQuery)
  const type = useStockStore((s) => s.type)
  const setType = useStockStore((s) => s.setType)
  const sources = useStockStore((s) => s.sources)
  const setSources = useStockStore((s) => s.setSources)
  const runSearch = useStockStore((s) => s.runSearch)
  const loading = useStockStore((s) => s.loading)
  const error = useStockStore((s) => s.error)
  const freeOnly = useStockStore((s) => s.freeOnly)
  const setFreeOnly = useStockStore((s) => s.setFreeOnly)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch()
  }

  const onToggleFree = (checked: boolean) => {
    setFreeOnly(checked)
    // Re-run search with the new free flag (defer to next tick so state has
    // updated before runSearch reads it).
    setTimeout(() => {
      void runSearch()
    }, 0)
  }

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
            <Sparkles className="size-3.5 sn-pulse" />
            Universal stock media discovery
          </div>
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            The universe of media,
            <br className="hidden sm:block" />{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-amber-300 bg-clip-text text-transparent">
              one search away.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-sm text-zinc-400 sm:text-base">
            Type a keyword and instantly discover stock-relevant images, videos,
            audio, PDFs, documents and web/social content — sourced from across
            the whole web.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          onSubmit={onSubmit}
          className="mx-auto mt-8 w-full max-w-3xl"
          role="search"
          aria-label="StockNova universal search"
        >
          <div className="sn-glass-strong flex items-center gap-2 rounded-2xl p-2 shadow-2xl">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anything: 'mountain landscape', 'lofi music free', 'pitch deck'…"
                className="h-12 border-0 bg-transparent pl-10 pr-9 text-base shadow-none focus-visible:ring-0"
                aria-label="Search query"
                enterKeyHint="search"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="h-12 gap-2 rounded-xl bg-emerald-500 px-6 text-emerald-950 hover:bg-emerald-400"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              <span className="hidden sm:inline">
                {loading ? 'Searching…' : 'Search'}
              </span>
            </Button>
          </div>

          {/* Royalty-free headline toggle row */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <label
              htmlFor="royalty-free-toggle"
              className={cn(
                'inline-flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-all',
                freeOnly
                  ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_18px_-4px] shadow-emerald-500/40'
                  : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10',
              )}
            >
              <BadgeCheck
                className={cn(
                  'size-4',
                  freeOnly ? 'text-emerald-300' : 'text-zinc-400',
                )}
              />
              <span>Royalty-free / Copyright-free</span>
              <Switch
                id="royalty-free-toggle"
                checked={freeOnly}
                onCheckedChange={onToggleFree}
                aria-label="Toggle royalty-free / copyright-free results"
                className={cn(
                  'data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-zinc-700',
                )}
              />
            </label>
          </div>

          <p className="mt-2 text-center text-[11px] text-zinc-500">
            Tip: toggle{' '}
            <span className="text-emerald-400">Royalty-free</span> for
            copyright-free results you can download directly.
          </p>

          {/* Format chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {FORMAT_CHIPS.map((chip) => {
              const active = type === chip.key
              return (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setType(chip.key)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    active
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_-2px] shadow-emerald-500/30'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10',
                  )}
                >
                  {chip.icon}
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* Source selector */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-zinc-400">
            <span className="mr-1">Sources:</span>
            {SOURCE_OPTIONS.map((s) => {
              const active = sources === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSources(s.key)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-md px-2 py-1 transition-all',
                    active
                      ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
                  )}
                >
                  {s.label}
                </button>
              )
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </motion.form>

        <div className="mx-auto mt-8 w-full max-w-3xl">
          <TrendingChips />
        </div>
      </div>
    </section>
  )
}
