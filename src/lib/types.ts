// Shared types for StockNova

export type AssetKind = 'image' | 'video' | 'audio' | 'pdf' | 'doc' | 'social' | 'web'

export type SearchType = 'all' | AssetKind

export type SourceKey = 'google' | 'youtube' | 'web' | 'images' | 'all'

export interface Asset {
  assetId: string
  kind: AssetKind
  title: string
  url: string
  thumbnail?: string
  source: string
  host?: string
  snippet?: string
  free?: boolean // true if from a known free / royalty-free source
  license?: string // e.g. 'CC0', 'Pixabay License', 'Pexels License', ''
  directDownload?: boolean // true if the URL is a direct file (proxy-downloadable)
  meta?: Record<string, unknown>
}

export interface SearchResponse {
  success: boolean
  query: string
  type: string
  count: number
  results: Asset[]
  ms: number
  error?: string
}

export interface SavedAssetRow {
  id: string
  assetId: string
  title: string
  type: string
  url: string
  thumbnail: string | null
  source: string
  meta: string | null
  createdAt: string
}

export interface StatsResponse {
  totalSearches: number
  totalResults: number
  totalSaved: number
  totalDownloads: number
}

export type SortKey = 'relevance' | 'newest'
