'use client'

import { create } from 'zustand'
import type { Asset, AssetKind, SearchType, SourceKey, SortKey, SearchResponse } from './types'

interface RunSearchArgs {
  query?: string
  type?: SearchType
  sources?: SourceKey
}

interface StockNovaState {
  // search params
  query: string
  type: SearchType
  sources: SourceKey
  sort: SortKey

  // results
  results: Asset[]
  loading: boolean
  lastQuery: string
  lastMs: number | null
  hasSearched: boolean
  error: string | null

  // filter rail (client-side filters applied on top of results)
  filterKind: AssetKind | 'all'

  // detail dialog
  selectedAsset: Asset | null
  detailOpen: boolean

  // saved drawer
  savedOpen: boolean

  // setters
  setQuery: (q: string) => void
  setType: (t: SearchType) => void
  setSources: (s: SourceKey) => void
  setSort: (s: SortKey) => void
  setFilterKind: (k: AssetKind | 'all') => void

  setResults: (r: Asset[]) => void
  setLoading: (b: boolean) => void
  setLastQuery: (q: string) => void
  setLastMs: (ms: number | null) => void
  setHasSearched: (b: boolean) => void
  setError: (e: string | null) => void

  openDetail: (a: Asset) => void
  closeDetail: () => void

  setSavedOpen: (b: boolean) => void

  runSearch: (args?: RunSearchArgs) => Promise<void>

  reset: () => void
}

export const useStockStore = create<StockNovaState>((set, get) => ({
  query: '',
  type: 'all',
  sources: 'all',
  sort: 'relevance',
  results: [],
  loading: false,
  lastQuery: '',
  lastMs: null,
  hasSearched: false,
  error: null,
  filterKind: 'all',
  selectedAsset: null,
  detailOpen: false,
  savedOpen: false,

  setQuery: (q) => set({ query: q }),
  setType: (t) => set({ type: t }),
  setSources: (s) => set({ sources: s }),
  setSort: (s) => set({ sort: s }),
  setFilterKind: (k) => set({ filterKind: k }),

  setResults: (r) => set({ results: r }),
  setLoading: (b) => set({ loading: b }),
  setLastQuery: (q) => set({ lastQuery: q }),
  setLastMs: (ms) => set({ lastMs: ms }),
  setHasSearched: (b) => set({ hasSearched: b }),
  setError: (e) => set({ error: e }),

  openDetail: (a) => set({ selectedAsset: a, detailOpen: true }),
  closeDetail: () => set({ detailOpen: false, selectedAsset: null }),

  setSavedOpen: (b) => set({ savedOpen: b }),

  runSearch: async (args) => {
    const state = get()
    const q = (args?.query ?? state.query).trim()
    const type = args?.type ?? state.type
    const sources = args?.sources ?? state.sources

    if (!q) {
      set({ error: 'Please enter a search term.' })
      return
    }

    // update params so UI reflects what was searched
    set({
      query: q,
      type,
      sources,
      loading: true,
      hasSearched: true,
      error: null,
      filterKind: 'all',
    })

    try {
      const url = `/api/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&sources=${encodeURIComponent(sources)}&limit=24`
      const r = await fetch(url)
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || `Search failed (${r.status})`)
      }
      const j = (await r.json()) as SearchResponse
      set({
        results: j.results ?? [],
        lastQuery: q,
        lastMs: j.ms ?? null,
        loading: false,
      })
    } catch (e) {
      set({
        results: [],
        loading: false,
        error: e instanceof Error ? e.message : 'Search failed',
      })
    }
  },

  reset: () =>
    set({
      query: '',
      results: [],
      loading: false,
      lastQuery: '',
      lastMs: null,
      hasSearched: false,
      filterKind: 'all',
      error: null,
    }),
}))
