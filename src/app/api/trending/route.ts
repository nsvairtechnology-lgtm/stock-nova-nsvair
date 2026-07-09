import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_TRENDING = [
  'nature city skyline',
  'abstract gradient',
  'lofi music',
  'startup pitch deck',
  'cybersecurity report',
  'drone footage',
  'podcast intro',
  'ai illustration',
  'mountain landscape',
  'tech presentation',
  'ocean waves',
  'minimal logo',
]

export async function GET() {
  try {
    let rows = await db.trendingKeyword.findMany({
      orderBy: { count: 'desc' },
      take: 12,
    })

    if (rows.length === 0) {
      // Seed defaults
      await db.trendingKeyword.createMany({
        data: DEFAULT_TRENDING.map((k) => ({
          keyword: k,
          count: 1,
          category: 'general',
        })),
        skipDuplicates: true,
      })
      rows = await db.trendingKeyword.findMany({
        orderBy: { count: 'desc' },
        take: 12,
      })
    }

    return NextResponse.json({
      trending: rows.map((r) => r.keyword),
    })
  } catch (e) {
    // If DB fails, still return defaults so the UI works
    return NextResponse.json({ trending: DEFAULT_TRENDING })
  }
}
