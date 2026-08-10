'use client'

import { Sparkles } from 'lucide-react'

const COLS: { title: string; links: string[] }[] = [
  {
    title: 'Product',
    links: ['Search', 'Trending', 'Saved Library', 'Downloads', 'API'],
  },
  {
    title: 'Sources',
    links: ['Google', 'YouTube', 'Web', 'Image Banks', 'Social'],
  },
  {
    title: 'Formats',
    links: ['Images', 'Videos', 'Audio', 'PDFs', 'Documents', 'Social'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Licensing', 'Contact'],
  },
]

export function SiteFooter() {
  return (
    <footer id="downloads" className="mt-auto border-t border-white/5 bg-black/30 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/30">
                <Sparkles className="size-4 text-emerald-400" />
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                NSVAIR <span className="text-emerald-400">StockNova</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-zinc-400">
              The universe of media, one search away. Discover images, videos,
              audio, PDFs, documents and web content from across the whole web.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300">
              <span>⚡</span> Powered by NSVAIR
            </div>
          </div>

          {COLS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-sm font-semibold text-zinc-200">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <span
                      className="cursor-default text-sm text-zinc-400 transition-colors hover:text-emerald-400"
                      tabIndex={0}
                    >
                      {l}
                    </span>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-xs text-zinc-500 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} NSVAIR StockNova. All rights reserved.
          </p>
          <p>
            Powered by <span className="font-medium text-emerald-400">NSVAIR</span> Technology.
          </p>
        </div>
      </div>
    </footer>
  )
}
