'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Layers, Globe2, Sparkles, Zap } from 'lucide-react'
import type { StatsResponse } from '@/lib/types'

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {value.toLocaleString()}
      {suffix}
    </motion.span>
  )
}

export function StatsStrip() {
  const { data } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const r = await fetch('/api/stats')
      return (await r.json()) as StatsResponse
    },
    initialData: { totalSearches: 0, totalResults: 0, totalSaved: 0, totalDownloads: 0 },
    refetchInterval: 15000,
  })

  const stats = [
    {
      icon: <Layers className="size-5 text-emerald-400" />,
      label: 'Formats Supported',
      value: '6+',
      sub: 'Image · Video · Audio · PDF · Docs · Social',
    },
    {
      icon: <Globe2 className="size-5 text-amber-400" />,
      label: 'Sources Connected',
      value: '4+',
      sub: 'Google · YouTube · Web · Image Banks',
    },
    {
      icon: <Sparkles className="size-5 text-emerald-400" />,
      label: 'Assets Surfaced',
      value: <AnimatedNumber value={data.totalResults} />,
      sub: `${data.totalSearches.toLocaleString()} searches run`,
    },
    {
      icon: <Zap className="size-5 text-amber-400" />,
      label: 'Avg. Response',
      value: 'fast',
      sub: `${data.totalDownloads.toLocaleString()} downloads logged`,
    },
  ]

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="sn-glass sn-glow group rounded-2xl p-4 transition-all sm:p-5"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                {s.icon}
              </span>
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 sm:text-xs">
                {s.label}
              </p>
            </div>
            <div className="mt-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl">
              {s.value}
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 sm:text-xs">{s.sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
