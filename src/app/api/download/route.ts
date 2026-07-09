import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { assetId, title, type, url, source } = body || {}
    if (!assetId || !url) {
      return NextResponse.json(
        { ok: false, error: 'assetId and url are required' },
        { status: 400 },
      )
    }
    await db.downloadLog.create({
      data: {
        assetId,
        title: title ?? 'Untitled',
        type: type ?? 'web',
        url,
        source: source ?? 'web',
      },
    })
    return NextResponse.json({ ok: true, url })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'Failed to log download' },
      { status: 500 },
    )
  }
}
