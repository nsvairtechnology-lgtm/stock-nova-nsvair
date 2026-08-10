import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// GET /api/proxy-download?url=<encoded>&filename=<encoded>&assetId=<id>&title=<encoded>&type=<kind>&source=<encoded>
// Server-side fetches the file and streams it back as an attachment (direct
// download, no redirect to the source site). If anything goes wrong we fall
// back to a 302 redirect to the original URL so the user still gets the file.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const url = sp.get('url')
  const filename = sp.get('filename') || 'stocknova-download'
  if (!url) {
    return new NextResponse('Missing "url" parameter', { status: 400 })
  }

  // Fire-and-forget download log (best-effort)
  const assetId = sp.get('assetId') || ''
  const title = sp.get('title') || filename
  const type = sp.get('type') || 'web'
  const source = sp.get('source') || ''
  void db.downloadLog
    .create({ data: { assetId, title, type, url, source } })
    .catch(() => {})

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: new URL(url).origin,
      },
      redirect: 'follow',
      // @ts-expect-error Node 18+ supports AbortSignal.timeout
      signal: AbortSignal.timeout(90000),
    })

    if (!upstream.ok || !upstream.body) {
      // Fallback: redirect to original URL so the user still gets the file
      return NextResponse.redirect(url, { status: 302 })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const contentLength = upstream.headers.get('content-length')

    // If the upstream returned HTML (e.g. a login/landing page), it's not the
    // file — fallback to redirect.
    if (contentType.startsWith('text/html')) {
      return NextResponse.redirect(url, { status: 302 })
    }

    const headers = new Headers()
    headers.set('Content-Type', contentType)
    // Force a safe filename
    const safeName = filename.replace(/[^\w.\- ]+/g, '_').slice(0, 120)
    headers.set('Content-Disposition', `attachment; filename="${safeName}"`)
    if (contentLength) headers.set('Content-Length', contentLength)
    headers.set('Cache-Control', 'no-store')
    headers.set('X-StockNova-Proxy', '1')

    return new NextResponse(upstream.body, { status: 200, headers })
  } catch {
    // Fallback: redirect to original URL
    return NextResponse.redirect(url, { status: 302 })
  }
}
