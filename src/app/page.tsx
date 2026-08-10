'use client'

import * as React from 'react'
import { useStockStore } from '@/lib/store'
import { SiteHeader } from '@/components/stocknova/header'
import { HeroSearch } from '@/components/stocknova/hero-search'
import { StatsStrip } from '@/components/stocknova/stats-strip'
import { CategoryShowcase } from '@/components/stocknova/category-showcase'
import { HowItWorks } from '@/components/stocknova/how-it-works'
import { ResultsGrid } from '@/components/stocknova/results-grid'
import { SavedDrawer } from '@/components/stocknova/saved-drawer'
import { AssetDetailDialog } from '@/components/stocknova/asset-detail-dialog'
import { SiteFooter } from '@/components/stocknova/footer'

export default function Home() {
  const hasSearched = useStockStore((s) => s.hasSearched)

  return (
    <div className="sn-shell flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="flex-1">
        <HeroSearch />
        <div className="mt-2">
          <StatsStrip />
        </div>

        {!hasSearched && (
          <React.Fragment>
            <CategoryShowcase />
            <HowItWorks />
          </React.Fragment>
        )}

        <ResultsGrid />
      </main>

      <SiteFooter />

      {/* Global overlays */}
      <SavedDrawer />
      <AssetDetailDialog />
    </div>
  )
}
