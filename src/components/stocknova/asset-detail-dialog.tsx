'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bookmark, BookmarkCheck, Download, ExternalLink, Copy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useStockStore } from '@/lib/store'
import type { Asset } from '@/lib/types'
import { faviconUrl, prettyHost } from '@/lib/classify'
import { cn } from '@/lib/utils'

interface SavedRow {
  assetId: string
}

export function AssetDetailDialog() {
  const open = useStockStore((s) => s.detailOpen)
  const close = useStockStore((s) => s.closeDetail)
  const asset = useStockStore((s) => s.selectedAsset)

  const qc = useQueryClient()
  const { data: saved } = useQuery<SavedRow[]>({
    queryKey: ['saved'],
    queryFn: async () => {
      const r = await fetch('/api/saved')
      const j = await r.json()
      return (j.saved as SavedRow[]) ?? []
    },
    enabled: open,
  })

  const isSaved = asset
    ? (saved ?? []).some((s) => s.assetId === asset.assetId)
    : false

  const saveMut = useMutation({
    mutationFn: async (a: Asset) => {
      const r = await fetch('/api/saved', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId: a.assetId,
          title: a.title,
          type: a.kind,
          url: a.url,
          thumbnail: a.thumbnail ?? null,
          source: a.source,
          meta: a.meta ?? null,
        }),
      })
      if (!r.ok) throw new Error('failed')
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved'] })
      toast.success('Saved to library.')
    },
    onError: () => toast.error('Could not save asset.'),
  })

  const unsaveMut = useMutation({
    mutationFn: async (a: Asset) => {
      const r = await fetch(`/api/saved?assetId=${encodeURIComponent(a.assetId)}`, {
        method: 'DELETE',
      })
      if (!r.ok) throw new Error('failed')
      return r.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['saved'] })
      toast.success('Removed from library.')
    },
    onError: () => toast.error('Could not remove asset.'),
  })

  const dlMut = useMutation({
    mutationFn: async (a: Asset) => {
      const r = await fetch('/api/download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId: a.assetId,
          title: a.title,
          type: a.kind,
          url: a.url,
          source: a.source,
        }),
      })
      if (!r.ok) throw new Error('failed')
      return r.json()
    },
    onSuccess: (_d, a) => {
      window.open(a.url, '_blank', 'noopener,noreferrer')
      toast.success('Opening download…')
    },
    onError: () => toast.error('Could not start download.'),
  })

  const onCopy = async () => {
    if (!asset) return
    try {
      await navigator.clipboard.writeText(asset.url)
      toast.success('Link copied to clipboard.')
    } catch {
      toast.error('Could not copy link.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="sn-glass-strong max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-950/90 p-0 text-zinc-100 sm:max-w-3xl"
        aria-describedby="asset-detail-desc"
      >
        {asset && (
          <>
            <DialogTitle className="sr-only">{asset.title}</DialogTitle>
            <DialogDescription id="asset-detail-desc" className="sr-only">
              Asset details for {asset.title}
            </DialogDescription>
            <DetailPreview asset={asset} />
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <KindBadge kind={asset.kind} />
                    <span className="text-xs text-zinc-400">
                      {asset.source || prettyHost(asset.url)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-balance text-lg font-semibold leading-snug sm:text-xl">
                    {asset.title}
                  </h2>
                  {asset.snippet && (
                    <p className="mt-2 text-sm text-zinc-400">{asset.snippet}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
                <Meta label="Source" value={asset.source || prettyHost(asset.url)} />
                <Meta label="Host" value={prettyHost(asset.url)} />
                {asset.meta?.width && asset.meta?.height && (
                  <Meta
                    label="Dimensions"
                    value={`${asset.meta.width} × ${asset.meta.height}`}
                  />
                )}
                {asset.meta?.date && <Meta label="Date" value={String(asset.meta.date)} />}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  size="lg"
                  onClick={() => dlMut.mutate(asset)}
                  disabled={dlMut.isPending}
                  className="gap-2 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  <Download className="size-4" />
                  Download
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() =>
                    isSaved ? unsaveMut.mutate(asset) : saveMut.mutate(asset)
                  }
                  className="gap-2 border-white/15 bg-white/5 hover:bg-white/10"
                >
                  {isSaved ? (
                    <>
                      <BookmarkCheck className="size-4 text-emerald-400" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Bookmark className="size-4" />
                      Save to library
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onCopy}
                  className="gap-2 border-white/15 bg-white/5 hover:bg-white/10"
                >
                  <Copy className="size-4" />
                  Copy link
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="gap-2 border-white/15 bg-white/5 hover:bg-white/10"
                >
                  <a
                    href={asset.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Open source
                  </a>
                </Button>
              </div>

              <div className="mt-4 break-all rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-zinc-400">
                {asset.url}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1">
      <span className="text-zinc-500">{label}:</span>{' '}
      <span className="text-zinc-200">{value}</span>
    </div>
  )
}

function KindBadge({ kind }: { kind: Asset['kind'] }) {
  const map: Record<Asset['kind'], { label: string; cls: string }> = {
    image: { label: 'IMAGE', cls: 'bg-emerald-500/15 text-emerald-300' },
    video: { label: 'VIDEO', cls: 'bg-amber-500/15 text-amber-300' },
    audio: { label: 'AUDIO', cls: 'bg-emerald-500/15 text-emerald-300' },
    pdf: { label: 'PDF', cls: 'bg-amber-500/15 text-amber-300' },
    doc: { label: 'DOC', cls: 'bg-emerald-500/15 text-emerald-300' },
    social: { label: 'SOCIAL', cls: 'bg-amber-500/15 text-amber-300' },
    web: { label: 'WEB', cls: 'bg-white/10 text-zinc-300' },
  }
  const m = map[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold',
        m.cls,
      )}
    >
      {m.label}
    </span>
  )
}

function DetailPreview({ asset }: { asset: Asset }) {
  const host = prettyHost(asset.url)
  const fav = faviconUrl(asset.url)

  if (asset.kind === 'image') {
    return (
      <div className="relative max-h-[55vh] w-full overflow-hidden bg-black/40">
        <img
          src={asset.thumbnail || asset.url}
          alt={asset.title}
          referrerPolicy="no-referrer"
          className="mx-auto max-h-[55vh] w-auto object-contain"
        />
      </div>
    )
  }

  if (asset.kind === 'video') {
    const yt = asset.thumbnail // ytThumb already set as thumbnail
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {yt ? (
          <img
            src={yt}
            alt={asset.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-80"
          />
        ) : null}
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Open video"
        >
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-emerald-500/90 text-emerald-950 shadow-lg ring-4 ring-white/10 transition-transform hover:scale-105">
            <svg viewBox="0 0 24 24" className="size-7 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </a>
      </div>
    )
  }

  if (asset.kind === 'audio') {
    const bars = Array.from({ length: 56 }).map(() => 20 + Math.round(Math.random() * 80))
    return (
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-amber-500/10 p-6">
        <div className="flex h-full items-end gap-[3px]">
          {bars.map((h, i) => (
            <span
              key={i}
              className="sn-bar block w-full rounded-sm bg-gradient-to-t from-emerald-500/40 to-emerald-300"
              style={{
                height: `${h}%`,
                animationDelay: `${(i % 12) * 0.08}s`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (asset.kind === 'pdf' || asset.kind === 'doc') {
    return (
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950">
        <div className="flex h-full items-center justify-center">
          <div
            className={cn(
              'flex size-20 items-center justify-center rounded-3xl ring-1',
              asset.kind === 'pdf'
                ? 'bg-amber-500/10 text-amber-300 ring-amber-400/30'
                : 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/30',
            )}
          >
            {asset.kind === 'pdf' ? (
              <svg viewBox="0 0 24 24" className="size-9 fill-current">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 6V3.5L18.5 8H14z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-9 fill-current">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              </svg>
            )}
          </div>
        </div>
      </div>
    )
  }

  // web/social
  return (
    <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-950 p-6">
      <div className="flex items-center gap-2">
        {fav ? (
          <img
            src={fav}
            alt=""
            referrerPolicy="no-referrer"
            className="size-5 rounded-sm"
          />
        ) : null}
        <span className="text-sm text-zinc-400">{host}</span>
      </div>
      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-zinc-100">
        {asset.title}
      </h3>
      {asset.snippet && (
        <p className="mt-2 line-clamp-3 text-xs text-zinc-400">{asset.snippet}</p>
      )}
    </div>
  )
}
