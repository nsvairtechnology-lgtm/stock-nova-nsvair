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
            <div className="flex items-center gap-2">
              <span className="relative inline-flex">
                <Sparkles className="size-5 text-emerald-400" />
              </span>
              <span className="text-lg font-semibold tracking-tight">
                Stock<span className="text-emerald-400">Nova</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-zinc-400">
              The universe of media, one search away. Discover images, videos,
              audio, PDFs, documents and web content from across the whole web.
            </p>
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
            © {new Date().getFullYear()} StockNova. All rights reserved.
          </p>
          <p>
            Powered by <span className="text-emerald-400">ZAI</span> web &amp; image
            search.
          </p>
        </div>
      </div>
    </footer>
  )
}
