'use client'

import { Sparkles } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useStockStore } from '@/lib/store'
import { SavedDrawerList } from './saved-drawer-list'

export function SavedDrawer() {
  const open = useStockStore((s) => s.savedOpen)
  const setOpen = useStockStore((s) => s.setSavedOpen)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-[92vw] flex-col gap-0 border-white/10 bg-zinc-950/95 p-0 text-zinc-100 sm:max-w-md"
      >
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-4">
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/30">
            <Sparkles className="size-4 text-emerald-400" />
          </span>
          <div>
            <SheetTitle className="text-base">Saved Library</SheetTitle>
            <SheetDescription className="text-xs text-zinc-400">
              Your bookmarked assets, persisted across sessions.
            </SheetDescription>
          </div>
        </div>
        <SavedDrawerList />
      </SheetContent>
    </Sheet>
  )
}
