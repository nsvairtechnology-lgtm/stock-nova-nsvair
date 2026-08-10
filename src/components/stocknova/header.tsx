'use client'

import * as React from 'react'
import { Sparkles, Bookmark, Download, Sun, Moon, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { useTheme } from 'next-themes'
import { useStockStore } from '@/lib/store'
import { useQuery } from '@tanstack/react-query'

export function SiteHeader() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const setSavedOpen = useStockStore((s) => s.setSavedOpen)

  const { data } = useQuery({
    queryKey: ['saved'],
    queryFn: async () => {
      const r = await fetch('/api/saved')
      const j = await r.json()
      return j.saved as unknown[]
    },
    initialData: [],
  })

  const savedCount = data?.length ?? 0

  React.useEffect(() => setMounted(true), [])

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const openSaved = () => {
    setSavedOpen(true)
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a
          href="/"
          className="group flex items-center gap-3"
          aria-label="NSVAIR StockNova home"
        >
          <span className="relative inline-flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 ring-1 ring-emerald-400/30 transition-transform group-hover:scale-105">
            <Sparkles className="size-4.5 text-emerald-400 sn-pulse" />
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-tight">
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                NSVAIR <span className="text-emerald-400">StockNova</span>
              </span>
            </div>
            <span className="text-[10px] font-medium tracking-wider text-emerald-400/80">
              Powered by NSVAIR
            </span>
          </div>
        </a>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSavedOpen(true)}
            className="relative text-zinc-200 hover:text-emerald-300"
            aria-label="Open saved library"
          >
            <Bookmark className="size-4" />
            Saved
            {savedCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1 bg-emerald-500/15 text-emerald-300"
              >
                {savedCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-zinc-200 hover:text-amber-300"
          >
            <a href="#downloads" aria-label="Go to downloads section">
              <Download className="size-4" />
              Downloads
            </a>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
        </div>

        {/* Mobile: theme toggle + collapsed menu */}
        <div className="flex items-center gap-1 sm:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="border-white/10 bg-white/5 text-zinc-200"
          >
            {mounted && theme === 'dark' ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Open menu"
                className="relative border-white/10 bg-white/5 text-zinc-200"
              >
                <Menu className="size-4" />
                {savedCount > 0 && (
                  <span className="absolute -right-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-semibold text-emerald-950">
                    {savedCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[88vw] border-white/10 bg-zinc-950/95 text-zinc-100 sm:max-w-md"
            >
              <SheetTitle className="px-4 pt-4 text-base">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4 text-emerald-400" />
                  Menu
                </span>
              </SheetTitle>
              <div className="flex flex-col gap-2 p-4">
                <Button
                  variant="outline"
                  onClick={openSaved}
                  className="justify-start border-white/10 bg-white/5"
                >
                  <Bookmark className="size-4" /> Saved Library
                  {savedCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 bg-emerald-500/15 text-emerald-300"
                    >
                      {savedCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="justify-start border-white/10 bg-white/5"
                >
                  <a href="#downloads" onClick={() => setMobileOpen(false)}>
                    <Download className="size-4" /> Downloads
                  </a>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
