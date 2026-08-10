'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  FileType2,
  Share2,
  Globe,
  ArrowUpRight,
} from 'lucide-react'
import { useStockStore } from '@/lib/store'
import type { SearchType } from '@/lib/types'

const TILES: {
  type: SearchType
  label: string
  desc: string
  icon: React.ReactNode
  accent: string
}[] = [
  {
    type: 'image',
    label: 'Images',
    desc: 'Stock photos, illustrations & wallpapers',
    icon: <ImageIcon className="size-6" />,
    accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
  },
  {
    type: 'video',
    label: 'Videos',
    desc: 'YouTube, Vimeo & stock footage',
    icon: <Video className="size-6" />,
    accent: 'from-amber-500/20 to-amber-500/5 text-amber-300',
  },
  {
    type: 'audio',
    label: 'Audio',
    desc: 'Music, sound effects & podcasts',
    icon: <Music className="size-6" />,
    accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
  },
  {
    type: 'pdf',
    label: 'PDFs',
    desc: 'Reports, ebooks & research papers',
    icon: <FileText className="size-6" />,
    accent: 'from-amber-500/20 to-amber-500/5 text-amber-300',
  },
  {
    type: 'doc',
    label: 'Documents',
    desc: 'Slides, docs & spreadsheets',
    icon: <FileType2 className="size-6" />,
    accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
  },
  {
    type: 'social',
    label: 'Social',
    desc: 'Tweets, posts & Pinterest finds',
    icon: <Share2 className="size-6" />,
    accent: 'from-amber-500/20 to-amber-500/5 text-amber-300',
  },
  {
    type: 'web',
    label: 'Web',
    desc: 'Articles, blogs & reference pages',
    icon: <Globe className="size-6" />,
    accent: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300',
  },
  {
    type: 'all',
    label: 'Everything',
    desc: 'Search all formats at once',
    icon: <ArrowUpRight className="size-6" />,
    accent: 'from-amber-500/20 to-amber-500/5 text-amber-300',
  },
]

export function CategoryShowcase() {
  const runSearch = useStockStore((s) => s.runSearch)
  const setType = useStockStore((s) => s.setType)
  const query = useStockStore((s) => s.query)

  const onPick = (t: SearchType) => {
    setType(t)
    const q = query.trim() || PRESETS[t]
    runSearch({ query: q, type: t })
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Browse by category
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Jump straight into a format and explore curated, real results.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {TILES.map((tile, i) => (
          <motion.button
            key={tile.type}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.04 }}
            whileHover={{ y: -3 }}
            onClick={() => onPick(tile.type)}
            className={`group sn-glass sn-glow relative overflow-hidden rounded-2xl p-5 text-left transition-all`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${tile.accent} opacity-60 transition-opacity group-hover:opacity-100`}
            />
            <div className="relative">
              <div className="flex size-11 items-center justify-center rounded-xl bg-black/30 ring-1 ring-white/10">
                {tile.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-100">
                {tile.label}
              </h3>
              <p className="mt-1 text-xs text-zinc-300/80">{tile.desc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-zinc-200 opacity-0 transition-opacity group-hover:opacity-100">
                Explore <ArrowUpRight className="size-3" />
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  )
}

const PRESETS: Record<SearchType, string> = {
  all: 'stock media',
  image: 'mountain landscape',
  video: 'drone footage',
  audio: 'lofi music',
  pdf: 'cybersecurity report',
  doc: 'startup pitch deck',
  social: 'ai illustration',
  web: 'minimal logo',
}
