'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bookmark,
  BookmarkCheck,
  Download,
  Play,
  ExternalLink,
  FileText,
  FileType2,
  Globe,
  Share2,
  Music,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import type { Asset } from '@/lib/types'
import { useStockStore } from '@/lib/store'
import { faviconUrl, prettyHost } from '@/lib/classify'
import { cn } from '@/lib/utils'

interface SavedRow {
  assetId: string
  title: string
  type: string
  url: string
  thumbnail: string | null
  source: string
}

function useSaved() {
  return useQuery<SavedRow[]>({
    queryKey: ['saved'],
    queryFn: async () => {
      const r = await fetch('/api/saved')
      const j = await r.json()
      return (j.saved as SavedRow[]) ?? []
    },
  })
}

function useSaveActions() {
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: async (asset: Asset) => {
      const r = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.assetId,
          title: asset.title,
          type: asset.kind,
          url: asset.url,
          thumbnail: asset.thumbnail ?? null,
          source: asset.source,
          meta: asset.meta ?? null,
        }),
      })
      if (!r.ok) throw new Error('Failed to save')
      return r.json()
    },
    onMutate: async (asset) => {
      await qc.cancelQueries({ queryKey: ['saved'] })
      const prev = qc.getQueryData<SavedRow[]>(['saved'])
      const optimistic: SavedRow = {
        assetId: asset.assetId,
        title: asset.title,
        type: asset.kind,
        url: asset.url,
        thumbnail: asset.thumbnail ?? null,
        source: asset.source,
      }
      qc.setQueryData<SavedRow[]>(['saved'], (old) =>
        old && !old.some((s) => s.assetId === asset.assetId)
          ? [optimistic, ...old]
          : old,
      )
      return { prev }
    },
    onError: (_e, _a, ctx) => {
      if (ctx?.prev) qc.setQueryData(['saved'], ctx.prev)
      toast.error('Could not save asset.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['saved'] })
    },
  })

  const unsave = useMutation({
    mutationFn: async (assetId: string) => {
      const r = await fetch(`/api/saved?assetId=${encodeURIComponent(assetId)}`, {
        method: 'DELETE',
      })
      if (!r.ok) throw new Error('Failed to remove')
      return r.json()
    },
    onMutate: async (assetId) => {
      await qc.cancelQueries({ queryKey: ['saved'] })
      const prev = qc.getQueryData<SavedRow[]>(['saved'])
      qc.setQueryData<SavedRow[]>(['saved'], (old) =>
        (old ?? []).filter((s) => s.assetId !== assetId),
      )
      return { prev }
    },
    onError: (_e, _a, ctx) => {
      if (ctx?.prev) qc.setQueryData(['saved'], ctx.prev)
      toast.error('Could not remove asset.')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['saved'] })
    },
  })

  return { save, unsave }
}

function useDownload() {
  return useMutation({
    mutationFn: async (asset: Asset) => {
      const r = await fetch('/api/download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.assetId,
          title: asset.title,
          type: asset.kind,
          url: asset.url,
          source: asset.source,
        }),
      })
      if (!r.ok) throw new Error('Failed to log download')
      return r.json()
    },
    onSuccess: (_d, asset) => {
      // Open in new tab to trigger download / view
      window.open(asset.url, '_blank', 'noopener,noreferrer')
    },
    onError: () => toast.error('Could not start download.'),
  })
}

interface CardProps {
  asset: Asset
  index?: number
}

export function AssetCard({ asset, index = 0 }: CardProps) {
  const { data: saved } = useSaved()
  const { save, unsave } = useSaveActions()
  const download = useDownload()
  const openDetail = useStockStore((s) => s.openDetail)

  const isSaved = (saved ?? []).some((s) => s.assetId === asset.assetId)

  const onToggleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSaved) {
      unsave.mutate(asset.assetId)
      toast.success('Removed from library.')
    } else {
      save.mutate(asset)
      toast.success('Saved to library.')
    }
  }

  const onDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    download.mutate(asset)
  }

  const onOpen = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(asset.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.025, 0.4) }}
      onClick={() => openDetail(asset)}
      className="sn-glass sn-glow group relative cursor-pointer overflow-hidden rounded-2xl"
      role="button"
      tabIndex={0}
      aria-label={`${asset.title} — open details`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openDetail(asset)
        }
      }}
    >
      <CardMedia asset={asset} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium text-zinc-100">
            {asset.title}
          </h3>
          <KindBadge kind={asset.kind} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="truncate text-xs text-zinc-400">
            {asset.source || prettyHost(asset.url)}
          </span>
          <div className="flex items-center gap-1">
            <IconBtn
              label={isSaved ? 'Remove from library' : 'Save to library'}
              onClick={onToggleSave}
              active={isSaved}
            >
              {isSaved ? (
                <BookmarkCheck className="size-3.5 text-emerald-400" />
              ) : (
                <Bookmark className="size-3.5" />
              )}
            </IconBtn>
            <IconBtn label="Download" onClick={onDownload}>
              <Download className="size-3.5" />
            </IconBtn>
            <IconBtn label="Open source" onClick={onOpen}>
              <ExternalLink className="size-3.5" />
            </IconBtn>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function IconBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode
  label: string
  onClick: (e: React.MouseEvent) => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-all hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-300',
        active && 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
      )}
    >
      {children}
    </button>
  )
}

function KindBadge({ kind }: { kind: Asset['kind'] }) {
  const map: Record<Asset['kind'], { label: string; cls: string }> = {
    image: { label: 'IMG', cls: 'bg-emerald-500/15 text-emerald-300' },
    video: { label: 'VID', cls: 'bg-amber-500/15 text-amber-300' },
    audio: { label: 'AUD', cls: 'bg-emerald-500/15 text-emerald-300' },
    pdf: { label: 'PDF', cls: 'bg-amber-500/15 text-amber-300' },
    doc: { label: 'DOC', cls: 'bg-emerald-500/15 text-emerald-300' },
    social: { label: 'SOC', cls: 'bg-amber-500/15 text-amber-300' },
    web: { label: 'WEB', cls: 'bg-white/10 text-zinc-300' },
  }
  const m = map[kind]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold',
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}

/* ----------------- Media renderers ----------------- */

function CardMedia({ asset }: { asset: Asset }) {
  switch (asset.kind) {
    case 'image':
      return <ImageMedia asset={asset} />
    case 'video':
      return <VideoMedia asset={asset} />
    case 'audio':
      return <AudioMedia asset={asset} />
    case 'pdf':
    case 'doc':
      return <DocMedia asset={asset} />
    case 'social':
    case 'web':
    default:
      return <WebMedia asset={asset} />
  }
}

function ImageMedia({ asset }: { asset: Asset }) {
  const [loaded, setLoaded] = React.useState(false)
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/5">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/5" />}
      <img
        src={asset.thumbnail || asset.url}
        alt={asset.title}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      {asset.meta?.width && asset.meta?.height && (
        <span className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-200">
          {String(asset.meta.width)}×{String(asset.meta.height)}
        </span>
      )}
    </div>
  )
}

function VideoMedia({ asset }: { asset: Asset }) {
  const [loaded, setLoaded] = React.useState(false)
  const thumb = asset.thumbnail || ''
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/5" />}
      {thumb ? (
        <img
          src={thumb}
          alt={asset.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn(
            'h-full w-full object-cover transition-all duration-500 group-hover:scale-105',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/10 to-amber-500/10">
          <Play className="size-8 text-zinc-500" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
        <Play className="size-3" />
        {asset.source === 'youtube' ? 'YouTube' : 'Video'}
      </span>
      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-200">
        <Clock className="size-3" />
        Video
      </span>
    </div>
  )
}

function AudioMedia({ asset }: { asset: Asset }) {
  const bars = React.useMemo(
    () =>
      Array.from({ length: 36 }).map(() => ({
        h: 20 + Math.round(Math.random() * 80),
        d: (Math.random() * 1.2).toFixed(2),
      })),
    [],
  )
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-amber-500/10 p-4">
      <div className="flex h-full flex-col justify-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-400/40">
            <Play className="size-4 text-emerald-300" />
          </span>
          <span className="text-xs font-medium text-zinc-300">
            {asset.source || 'audio'}
          </span>
        </div>
        <div className="flex h-16 items-end gap-[3px]">
          {bars.map((b, i) => (
            <span
              key={i}
              className="sn-bar block w-full rounded-sm bg-gradient-to-t from-emerald-500/40 to-emerald-300"
              style={{
                height: `${b.h}%`,
                animationDelay: `${b.d}s`,
              }}
            />
          ))}
        </div>
      </div>
      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-emerald-300">
        <Music className="size-3" />
        Audio
      </span>
    </div>
  )
}

function DocMedia({ asset }: { asset: Asset }) {
  const isPdf = asset.kind === 'pdf'
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 p-5">
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div
          className={cn(
            'flex size-16 items-center justify-center rounded-2xl ring-1',
            isPdf
              ? 'bg-amber-500/10 text-amber-300 ring-amber-400/30'
              : 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30',
          )}
        >
          {isPdf ? (
            <FileText className="size-7" />
          ) : (
            <FileType2 className="size-7" />
          )}
        </div>
        <p className="line-clamp-1 text-xs text-zinc-300">
          {asset.url.split('/').pop() || asset.title}
        </p>
      </div>
      <span
        className={cn(
          'absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-bold',
          isPdf
            ? 'bg-amber-500/20 text-amber-300'
            : 'bg-emerald-500/20 text-emerald-300',
        )}
      >
        {isPdf ? 'PDF' : 'DOC'}
      </span>
    </div>
  )
}

function WebMedia({ asset }: { asset: Asset }) {
  const host = prettyHost(asset.url)
  const fav = faviconUrl(asset.url)
  const isSocial = asset.kind === 'social'
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
      <div className="flex h-full flex-col gap-2">
        <div className="flex items-center gap-2">
          {fav ? (
            <img
              src={fav}
              alt=""
              referrerPolicy="no-referrer"
              className="size-4 rounded-sm"
            />
          ) : (
            <Globe className="size-4 text-zinc-500" />
          )}
          <span className="truncate text-xs text-zinc-400">{host}</span>
          {isSocial && (
            <span className="ml-auto inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
              <Share2 className="size-3" />
              Social
            </span>
          )}
        </div>
        <p className="line-clamp-3 text-sm font-medium text-zinc-100">
          {asset.title}
        </p>
        {asset.snippet && (
          <p className="line-clamp-3 text-xs text-zinc-400">{asset.snippet}</p>
        )}
      </div>
    </div>
  )
}
