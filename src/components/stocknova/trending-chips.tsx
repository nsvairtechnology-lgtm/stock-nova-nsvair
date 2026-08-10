'use client'

import * as React from 'react'
import { TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { useStockStore } from '@/lib/store'

export function TrendingChips() {
  const runSearch = useStockStore((s) => s.runSearch)
  const { data, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: async () => {
      const r = await fetch('/api/trending')
      const j = await r.json()
      return (j.trending as string[]) ?? []
    },
  })

  const trending = data ?? []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <TrendingUp className="size-3.5 text-amber-400" />
        <span>Trending now</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))
          : trending.map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => runSearch({ query: kw })}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                {kw}
              </button>
            ))}
      </div>
    </div>
  )
}
