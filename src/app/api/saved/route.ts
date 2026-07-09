import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db.savedAsset.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      saved: rows.map((r) => ({
        ...r,
        meta: r.meta ? safeParse(r.meta) : null,
      })),
    })
  } catch (e) {
    return NextResponse.json({ saved: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { assetId, title, type, url, thumbnail, source, meta } = body || {}
    if (!assetId || !url) {
      return NextResponse.json(
        { ok: false, error: 'assetId and url are required' },
        { status: 400 },
      )
    }
    const row = await db.savedAsset.upsert({
      where: { assetId },
      update: {
        title: title ?? 'Untitled',
        type: type ?? 'web',
        url,
        thumbnail: thumbnail ?? null,
        source: source ?? 'web',
        meta: meta ? JSON.stringify(meta) : null,
      },
      create: {
        assetId,
        title: title ?? 'Untitled',
        type: type ?? 'web',
        url,
        thumbnail: thumbnail ?? null,
        source: source ?? 'web',
        meta: meta ? JSON.stringify(meta) : null,
      },
    })
    return NextResponse.json({ ok: true, saved: row })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'Failed to save asset' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = req.nextUrl
    const assetId =
      url.searchParams.get('assetId') ||
      (req.method === 'DELETE' && (await safeBody(req)))
    if (!assetId) {
      return NextResponse.json(
        { ok: false, error: 'assetId required' },
        { status: 400 },
      )
    }
    await db.savedAsset.deleteMany({ where: { assetId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: 'Failed to remove asset' },
      { status: 500 },
    )
  }
}

async function safeBody(req: NextRequest): Promise<string | null> {
  try {
    const b = await req.json()
    return b?.assetId ?? null
  } catch {
    return null
  }
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}
