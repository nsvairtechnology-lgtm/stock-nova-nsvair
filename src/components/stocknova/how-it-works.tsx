'use client'

import { motion } from 'framer-motion'
import { Search, MousePointerClick, Download } from 'lucide-react'

const STEPS = [
  {
    icon: <Search className="size-5 text-emerald-400" />,
    title: '1. Type a keyword',
    desc: 'Enter any topic — “mountain landscape”, “lofi music”, “pitch deck”. Pick a format and a source.',
  },
  {
    icon: <MousePointerClick className="size-5 text-amber-400" />,
    title: '2. Discover instantly',
    desc: 'StockNova queries the whole web in parallel — images, videos, audio, PDFs and more — and classifies each hit.',
  },
  {
    icon: <Download className="size-5 text-emerald-400" />,
    title: '3. Save & download',
    desc: 'Bookmark assets to your library, open the source, or download in one click from anywhere.',
  },
]

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            How it works
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Three steps from idea to asset.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="sn-glass rounded-2xl p-5"
          >
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
              {s.icon}
            </div>
            <h3 className="mt-4 text-base font-semibold text-zinc-100">
              {s.title}
            </h3>
            <p className="mt-1.5 text-sm text-zinc-400">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
