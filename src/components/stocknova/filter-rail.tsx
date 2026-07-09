'use client'

import * as React from 'react'
import { SlidersHorizontal, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useStockStore } from '@/lib/store'
import type { AssetKind, SortKey } from '@/lib/types'
import { cn } from '@/lib/utils'

const KIND_FILTERS: { key: AssetKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' },
  { key: 'audio', label: 'Audio' },
  { key: 'pdf', label: 'PDFs' },
  { key: 'doc', label: 'Docs' },
  { key: 'social', label: 'Social' },
  { key: 'web', label: 'Web' },
]

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'newest', label: 'Newest' },
]

export function FilterRail() {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* Mobile: collapsible trigger */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-white/10 bg-white/5 text-zinc-200"
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[85vw] border-white/10 bg-zinc-950/95 p-0 text-zinc-100 sm:max-w-xs"
          >
            <SheetTitle className="px-4 pt-4 text-base">Filters</SheetTitle>
            <div className="p-4">
              <FilterRailContent onPick={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: sticky aside */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-20">
          <div className="sn-glass rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
              <SlidersHorizontal className="size-4 text-emerald-400" />
              Filters
            </div>
            <FilterRailContent />
          </div>
        </div>
      </aside>
    </>
  )
}

function FilterRailContent({ onPick }: { onPick?: () => void }) {
  const filterKind = useStockStore((s) => s.filterKind)
  const setFilterKind = useStockStore((s) => s.setFilterKind)
  const sort = useStockStore((s) => s.sort)
  const setSort = useStockStore((s) => s.setSort)
  const results = useStockStore((s) => s.results)
  const filterFree = useStockStore((s) => s.filterFree)
  const setFilterFree = useStockStore((s) => s.setFilterFree)
  const filterDirect = useStockStore((s) => s.filterDirect)
  const setFilterDirect = useStockStore((s) => s.setFilterDirect)

  // counts reflect the active client-side filters (free/direct) so the format
  // pills tell the truth about what the user is currently seeing.
  const counts = React.useMemo(() => {
    const base = results.filter((r) => {
      if (filterFree && !r.free) return false
      if (filterDirect && !r.directDownload) return false
      return true
    })
    const c: Record<string, number> = { all: base.length }
    for (const r of base) {
      c[r.kind] = (c[r.kind] ?? 0) + 1
    }
    return c
  }, [results, filterFree, filterDirect])

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Format
        </p>
        <div className="space-y-1">
          {KIND_FILTERS.map((f) => {
            const active = filterKind === f.key
            const n = counts[f.key] ?? 0
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilterKind(f.key)
                  onPick?.()
                }}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-all',
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                    : 'text-zinc-300 hover:bg-white/5',
                )}
              >
                <span>{f.label}</span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    active
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-white/5 text-zinc-500',
                  )}
                >
                  {n}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          License
        </p>
        <div className="space-y-1">
          <ToggleRow
            label="Free / Royalty-free"
            active={filterFree}
            onClick={() => {
              setFilterFree(!filterFree)
              onPick?.()
            }}
            tone="emerald"
          />
          <ToggleRow
            label="Direct download"
            active={filterDirect}
            onClick={() => {
              setFilterDirect(!filterDirect)
              onPick?.()
            }}
            tone="amber"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Sort by
        </p>
        <div className="space-y-1">
          {SORTS.map((s) => {
            const active = sort === s.key
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSort(s.key)
                  onPick?.()
                }}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-all',
                  active
                    ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30'
                    : 'text-zinc-300 hover:bg-white/5',
                )}
              >
                <span>{s.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {(filterKind !== 'all' ||
        sort !== 'relevance' ||
        filterFree ||
        filterDirect) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterKind('all')
            setSort('relevance')
            setFilterFree(false)
            setFilterDirect(false)
          }}
          className="w-full justify-center text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        >
          <X className="size-3.5" />
          Reset filters
        </Button>
      )}
    </div>
  )
}

function ToggleRow({
  label,
  active,
  onClick,
  tone,
}: {
  label: string
  active: boolean
  onClick: () => void
  tone: 'emerald' | 'amber'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-all',
        active
          ? tone === 'emerald'
            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
            : 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30'
          : 'text-zinc-300 hover:bg-white/5',
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'inline-flex size-4 items-center justify-center rounded-full border',
          active
            ? tone === 'emerald'
              ? 'border-emerald-400 bg-emerald-400 text-emerald-950'
              : 'border-amber-400 bg-amber-400 text-amber-950'
            : 'border-white/20 text-transparent',
        )}
      >
        <Check className="size-3" />
      </span>
    </button>
  )
}
