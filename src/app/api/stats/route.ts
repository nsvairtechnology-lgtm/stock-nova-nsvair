import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [totalSearches, totalSaved, totalDownloads, sumAgg] = await Promise.all([
      db.searchHistory.count(),
      db.savedAsset.count(),
      db.downloadLog.count(),
      db.searchHistory.aggregate({ _sum: { resultCount: true } }),
    ])
    return NextResponse.json({
      totalSearches,
      totalResults: sumAgg._sum.resultCount ?? 0,
      totalSaved,
      totalDownloads,
    })
  } catch (e) {
    return NextResponse.json({
      totalSearches: 0,
      totalResults: 0,
      totalSaved: 0,
      totalDownloads: 0,
    })
  }
}
