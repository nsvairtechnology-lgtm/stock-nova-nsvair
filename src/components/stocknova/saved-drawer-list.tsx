'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Bookmark,
  Download,
  Trash2,
  ExternalLink,
  Inbox,
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  FileType2,
  Globe,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { isDirectDownloadable, suggestFilename } from '@/lib/classify'

interface SavedRow {
  id: string
  assetId: string
  title: string
  type: string
  url: string
  thumbnail: string | null
  source: string
  createdAt: string
}

function kindIcon(type: string) {
  switch (type) {
    case 'image':
      return <ImageIcon className="size-3.5 text-emerald-400" />
    case 'video':
      return <Video className="size-3.5 text-amber-400" />
    case 'audio':
      return <Music className="size-3.5 text-emerald-400" />
    case 'pdf':
      return <FileText className="size-3.5 text-amber-400" />
    case 'doc':
      return <FileType2 className="size-3.5 text-emerald-400" />
    case 'social':
      return <Share2 className="size-3.5 text-amber-400" />
    default:
      return <Globe className="size-3.5 text-zinc-400" />
  }
}

export function SavedDrawerList() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<SavedRow[]>({
    queryKey: ['saved'],
    queryFn: async () => {
      const r = await fetch('/api/saved')
      const j = await r.json()
      return (j.saved as SavedRow[]) ?? []
    },
  })

  const remove = useMutation({
    mutationFn: async (assetId: string) => {
      const r = await fetch(`/api/saved?assetId=${encodeURIComponent(assetId)}`, {
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

  const download = useMutation({
    mutationFn: async (a: SavedRow) => {
      // Direct-downloadable assets (image/pdf/doc/audio or direct file URLs):
      // stream through the StockNova proxy — no redirect to source.
      if (isDirectDownloadable(a.url, a.type as Parameters<typeof isDirectDownloadable>[1])) {
        const params = new URLSearchParams({
          url: a.url,
          filename: suggestFilename({ title: a.title, url: a.url, kind: a.type }),
          assetId: a.assetId,
          title: a.title,
          type: a.type,
          source: a.source,
        })
        return { proxy: true, href: `/api/proxy-download?${params.toString()}` }
      }
      const r = await fetch('/api/download', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          assetId: a.assetId,
          title: a.title,
          type: a.type,
          url: a.url,
          source: a.source,
        }),
      })
      if (!r.ok) throw new Error('failed')
      return r.json()
    },
    onSuccess: (d, a) => {
      if (d && typeof d === 'object' && 'proxy' in d && d.proxy) {
        window.location.href = (d as { href: string }).href
        toast.success('Downloading directly from StockNova…')
      } else {
        window.open(a.url, '_blank', 'noopener,noreferrer')
        toast.success('Opening source…')
      }
    },
    onError: () => toast.error('Could not start download.'),
  })

  const items = data ?? []

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <p className="text-xs text-zinc-400">
          {items.length} saved {items.length === 1 ? 'asset' : 'assets'}
        </p>
      </div>
      <ScrollArea className="sn-scroll h-[calc(100vh-9rem)] flex-1">
        <div className="space-y-2 p-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))
            : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Inbox className="size-5 text-zinc-500" />
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">
                    Your library is empty
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Bookmark assets from search results and they&apos;ll show up
                    here.
                  </p>
                </div>
              </div>
            ) : (
              items.map((a) => (
                <div
                  key={a.id}
                  className="sn-glass group flex gap-3 rounded-xl p-2.5 transition-all hover:border-emerald-400/30"
                >
                  <Thumb a={a} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-1.5">
                      {kindIcon(a.type)}
                      <span className="rounded bg-white/5 px-1 text-[10px] uppercase text-zinc-400">
                        {a.source || 'web'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-medium text-zinc-100">
                      {a.title}
                    </p>
                    <div className="mt-auto flex items-center gap-1 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => download.mutate(a)}
                        className="h-7 gap-1 border-white/10 bg-white/5 px-2 text-xs"
                      >
                        <Download className="size-3" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="h-7 gap-1 border-white/10 bg-white/5 px-2 text-xs"
                      >
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-3" />
                          Open
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove.mutate(a.assetId)}
                        aria-label="Remove from library"
                        className="ml-auto h-7 w-7 px-0 text-zinc-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
        </div>
      </ScrollArea>
    </div>
  )
}

function Thumb({ a }: { a: SavedRow }) {
  const isImg = a.type === 'image' && a.thumbnail
  const isVideo = a.type === 'video'
  const isAudio = a.type === 'audio'
  const isDoc = a.type === 'pdf' || a.type === 'doc'

  if (isImg) {
    return (
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-white/5">
        <img
          src={a.thumbnail!}
          alt={a.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
    )
  }
  return (
    <div
      className={cn(
        'flex size-16 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10',
        isVideo && 'bg-amber-500/10 text-amber-300',
        isAudio && 'bg-emerald-500/10 text-emerald-300',
        isDoc && 'bg-zinc-800 text-zinc-300',
        !isVideo && !isAudio && !isDoc && 'bg-zinc-800 text-zinc-300',
      )}
    >
      {React.cloneElement(kindIcon(a.type), { className: 'size-5' })}
    </div>
  )
}
