import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import {
  classifyKind,
  hostFromUrl,
  prettyHost,
  ytThumb,
  isFreeSource,
  licenseForHost,
  isDirectDownloadable,
  type Asset,
  type AssetKind,
} from '@/lib/classify'
import type { SearchType, SourceKey } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const execFileP = promisify(execFile)

interface ImgResult {
  original_url: string
  caption?: string
  source?: string
  original_width?: string | number
  original_height?: string | number
}

interface WebResult {
  url: string
  name: string
  snippet?: string
  host_name?: string
  rank?: number
  date?: string
  favicon?: string
}

function assetId(url: string, kind: AssetKind): string {
  return createHash('sha1').update(`${kind}::${url}`).digest('hex').slice(0, 16)
}

function parseImageStdout(stdout: string): ImgResult[] {
  if (!stdout) return []
  const start = stdout.indexOf('{')
  if (start === -1) return []
  const slice = stdout.slice(start)
  try {
    const parsed = JSON.parse(slice)
    if (parsed && Array.isArray(parsed.results)) return parsed.results as ImgResult[]
  } catch {
    const end = slice.lastIndexOf('}')
    if (end > 0) {
      try {
        const parsed = JSON.parse(slice.slice(0, end + 1))
        if (parsed && Array.isArray(parsed.results)) return parsed.results as ImgResult[]
      } catch {
        return []
      }
    }
  }
  return []
}

async function imageSearchCli(query: string, count: number): Promise<Asset[]> {
  const n = Math.max(1, Math.min(20, count))
  try {
    const { stdout } = await execFileP(
      'z-ai',
      ['image-search', '-q', query, '--count', String(n), '--gl', 'us', '--no-rank'],
      { timeout: 30000, maxBuffer: 20 * 1024 * 1024 },
    )
    const items = parseImageStdout(stdout)
    return items.map((it) => {
      const host = prettyHost(it.original_url)
      const kind: AssetKind = 'image'
      const w =
        typeof it.original_width === 'string'
          ? it.original_width
          : it.original_width
            ? String(it.original_width)
            : undefined
      const h =
        typeof it.original_height === 'string'
          ? it.original_height
          : it.original_height
            ? String(it.original_height)
            : undefined
      const free = isFreeSource(it.original_url)
      const url = it.original_url
      return {
        assetId: assetId(url, kind),
        kind,
        title: it.caption?.trim() || it.source || host || 'Image result',
        url,
        thumbnail: url,
        source: it.source || 'image-search',
        host,
        snippet: it.caption || '',
        free,
        license: licenseForHost(url),
        directDownload: isDirectDownloadable(url, kind),
        meta: { width: w, height: h, source: it.source },
      }
    })
  } catch {
    return []
  }
}

// Openverse Search API (Creative Commons Free Images & Audio)
async function searchOpenverse(query: string, type: 'images' | 'audio', count = 20): Promise<Asset[]> {
  try {
    const url = `https://api.openverse.org/v1/${type}/?q=${encodeURIComponent(query)}&page_size=${count}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockNova/1.0 (https://nsvair-stock-nova.onrender.com)' },
      next: { revalidate: 3600 },
      // @ts-expect-error Node 18+ timeout
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const results = (data.results || []) as Array<{
      id?: string
      title?: string
      url: string
      thumbnail?: string
      license?: string
      creator?: string
      width?: number
      height?: number
      audio_set?: { title?: string }
    }>

    return results.map((r) => {
      const kind: AssetKind = type === 'audio' ? 'audio' : 'image'
      const host = prettyHost(r.url)
      return {
        assetId: assetId(r.url, kind),
        kind,
        title: r.title?.trim() || `${kind === 'audio' ? 'Audio Track' : 'Stock Image'} (${query})`,
        url: r.url,
        thumbnail: r.thumbnail || (kind === 'image' ? r.url : undefined),
        source: 'openverse',
        host,
        snippet: r.creator ? `By ${r.creator} • License: ${r.license || 'CC'}` : `License: ${r.license || 'CC'}`,
        free: true,
        license: r.license ? `CC ${r.license.toUpperCase()}` : 'Free Creative Commons',
        directDownload: isDirectDownloadable(r.url, kind),
        meta: {
          width: r.width ? String(r.width) : undefined,
          height: r.height ? String(r.height) : undefined,
          creator: r.creator,
          license: r.license,
        },
      }
    })
  } catch {
    return []
  }
}

// Wikimedia Commons Search API (Free Images, Video, Audio, Docs)
async function searchWikimediaCommons(query: string, count = 20): Promise<Asset[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${count}&prop=imageinfo&iiprop=url|size|mime|extmetadata&format=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockNova/1.0' },
      next: { revalidate: 3600 },
      // @ts-expect-error Node 18+ timeout
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const pages = Object.values(data.query?.pages || {}) as Array<{
      title?: string
      imageinfo?: Array<{
        url: string
        thumburl?: string
        descriptionshorturl?: string
        mime?: string
        width?: number
        height?: number
        extmetadata?: {
          ObjectName?: { value?: string }
          LicenseShortName?: { value?: string }
          Artist?: { value?: string }
        }
      }>
    }>

    const assets: Asset[] = []
    for (const p of pages) {
      const info = p.imageinfo?.[0]
      if (!info || !info.url) continue
      const fileUrl = info.url
      const mime = (info.mime || '').toLowerCase()
      let kind: AssetKind = 'image'
      if (mime.startsWith('video') || fileUrl.endsWith('.webm') || fileUrl.endsWith('.ogv') || fileUrl.endsWith('.mp4')) {
        kind = 'video'
      } else if (mime.startsWith('audio') || fileUrl.endsWith('.ogg') || fileUrl.endsWith('.oga') || fileUrl.endsWith('.mp3')) {
        kind = 'audio'
      } else if (mime.includes('pdf') || fileUrl.endsWith('.pdf')) {
        kind = 'pdf'
      }

      const cleanTitle = (info.extmetadata?.ObjectName?.value || p.title || 'Wikimedia Media')
        .replace(/^File:/i, '')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[_-]+/g, ' ')

      const license = info.extmetadata?.LicenseShortName?.value || 'CC BY-SA / Public Domain'

      assets.push({
        assetId: assetId(fileUrl, kind),
        kind,
        title: cleanTitle,
        url: fileUrl,
        thumbnail: info.thumburl || (kind === 'image' ? fileUrl : undefined),
        source: 'wikimedia',
        host: 'commons.wikimedia.org',
        snippet: `Wikimedia Commons • ${license}`,
        free: true,
        license,
        directDownload: true,
        meta: {
          width: info.width ? String(info.width) : undefined,
          height: info.height ? String(info.height) : undefined,
          mime: info.mime,
        },
      })
    }
    return assets
  } catch {
    return []
  }
}

// arXiv Search API for research papers and PDFs
async function searchArxiv(query: string, count = 15): Promise<Asset[]> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${count}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockNova/1.0' },
      next: { revalidate: 3600 },
      // @ts-expect-error Node 18+ timeout
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const text = await res.text()
    
    // Parse arXiv XML entries
    const entries = text.split('<entry>').slice(1)
    const assets: Asset[] = []
    for (const e of entries) {
      const titleMatch = e.match(/<title>([\s\S]*?)<\/title>/)
      const summaryMatch = e.match(/<summary>([\s\S]*?)<\/summary>/)
      const idMatch = e.match(/<id>([\s\S]*?)<\/id>/)
      
      const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : 'Research Paper'
      const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : ''
      const arxivIdUrl = idMatch ? idMatch[1].trim() : ''
      
      const pdfUrl = arxivIdUrl.replace('abs', 'pdf') + '.pdf'
      if (!pdfUrl.startsWith('http')) continue

      assets.push({
        assetId: assetId(pdfUrl, 'pdf'),
        kind: 'pdf',
        title,
        url: pdfUrl,
        source: 'arxiv',
        host: 'arxiv.org',
        snippet: summary.slice(0, 200) + '...',
        free: true,
        license: 'Open Access / arXiv',
        directDownload: true,
        meta: {
          arxivUrl: arxivIdUrl,
        },
      })
    }
    return assets
  } catch {
    return []
  }
}

// Internet Archive API (Video, Audio, Docs, Texts)
async function searchArchiveOrg(query: string, count = 20): Promise<Asset[]> {
  try {
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:(movies+OR+audio+OR+texts)&fl[]=identifier,title,description,mediatype,downloads&rows=${count}&output=json`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StockNova/1.0' },
      next: { revalidate: 3600 },
      // @ts-expect-error Node 18+ timeout
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const docs = (data.response?.docs || []) as Array<{
      identifier: string
      title?: string
      description?: string
      mediatype?: string
    }>

    return docs.map((d) => {
      const id = d.identifier
      let kind: AssetKind = 'web'
      if (d.mediatype === 'movies') kind = 'video'
      else if (d.mediatype === 'audio') kind = 'audio'
      else if (d.mediatype === 'texts') kind = 'doc'

      const archiveUrl = `https://archive.org/details/${id}`
      const thumb = `https://archive.org/services/img/${id}`

      return {
        assetId: assetId(archiveUrl, kind),
        kind,
        title: d.title || id,
        url: archiveUrl,
        thumbnail: thumb,
        source: 'archive.org',
        host: 'archive.org',
        snippet: (d.description || `Public domain ${d.mediatype || 'media'} from Internet Archive`).slice(0, 180),
        free: true,
        license: 'Public Domain / Free Access',
        directDownload: false,
        meta: {
          identifier: id,
          mediatype: d.mediatype,
        },
      }
    })
  } catch {
    return []
  }
}

// Optional ZAI Web SDK search if available
let zaiPromise: Promise<unknown> | null = null
async function getZai() {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    if (!zaiPromise) zaiPromise = ZAI.create()
    return zaiPromise as Promise<{ functions: { invoke: (fn: string, args: Record<string, unknown>) => Promise<unknown> } }>
  } catch {
    return null
  }
}

async function webSearchSdk(query: string, num: number): Promise<WebResult[]> {
  try {
    const zai = await getZai()
    if (!zai) return []
    const results = (await zai.functions.invoke('web_search', { query, num })) as WebResult[]
    if (!Array.isArray(results)) return []
    return results
  } catch {
    return []
  }
}

function webResultToAsset(r: WebResult): Asset {
  const host = r.host_name || hostFromUrl(r.url)
  const kind = classifyKind(r.url, host)
  const thumb = kind === 'video' ? ytThumb(r.url) : undefined
  const url = r.url
  const free = isFreeSource(url)
  return {
    assetId: assetId(url, kind),
    kind,
    title: r.name?.trim() || prettyHost(url),
    url,
    thumbnail: thumb,
    source:
      kind === 'video' && host.includes('youtube')
        ? 'youtube'
        : prettyHost(url),
    host: prettyHost(url),
    snippet: r.snippet || '',
    free,
    license: licenseForHost(url),
    directDownload: isDirectDownloadable(url, kind),
    meta: {
      rank: r.rank,
      date: r.date,
      favicon: r.favicon,
    },
  }
}

async function persistSearch(
  query: string,
  type: string,
  sources: string,
  count: number,
) {
  try {
    await db.searchHistory.create({
      data: { query, type, sources, resultCount: count },
    })
    const category = type === 'all' ? 'general' : type
    await db.trendingKeyword.upsert({
      where: { keyword: query },
      update: { count: { increment: 1 }, category },
      create: { keyword: query, count: 1, category },
    })
  } catch {
    // DB errors must never break search
  }
}

export async function GET(req: NextRequest) {
  const t0 = Date.now()
  const sp = req.nextUrl.searchParams
  const q = (sp.get('q') || '').trim()
  const type = (sp.get('type') || 'all') as SearchType
  const sources = (sp.get('sources') || 'all') as SourceKey
  const free = sp.get('free') === '1'
  const limit = Math.max(
    1,
    Math.min(120, parseInt(sp.get('limit') || '60', 10)),
  )

  if (!q) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing query parameter "q".',
        results: [],
        count: 0,
        ms: 0,
      },
      { status: 400 },
    )
  }

  const tasks: Promise<Asset[]>[] = []

  // 1. Z-AI CLI Image Search (if available)
  if (type === 'all' || type === 'image') {
    tasks.push(imageSearchCli(q, 20).catch(() => []))
    tasks.push(searchOpenverse(q, 'images', 25).catch(() => []))
    tasks.push(searchWikimediaCommons(q, 20).catch(() => []))
  }

  // 2. Audio Searches
  if (type === 'all' || type === 'audio') {
    tasks.push(searchOpenverse(q, 'audio', 20).catch(() => []))
  }

  // 3. PDF / Doc Searches
  if (type === 'all' || type === 'pdf' || type === 'doc') {
    tasks.push(searchArxiv(q, 15).catch(() => []))
  }

  // 4. Video & Archive Searches
  if (type === 'all' || type === 'video' || type === 'doc' || type === 'web') {
    tasks.push(searchArchiveOrg(q, 20).catch(() => []))
  }

  // 5. Z-AI Web Search SDK
  tasks.push(
    webSearchSdk(q, 20)
      .then((rs) => rs.map(webResultToAsset))
      .catch(() => []),
  )

  let merged: Asset[] = []
  try {
    const settled = await Promise.all(tasks)
    merged = settled.flat()
  } catch {
    merged = []
  }

  // Deduplicate by assetId
  const seen = new Set<string>()
  const deduped: Asset[] = []
  for (const a of merged) {
    if (!seen.has(a.assetId)) {
      seen.add(a.assetId)
      deduped.push(a)
    }
  }

  let results = deduped

  // If specific type is requested (not 'all'), filter to match or prioritize
  if (type !== 'all') {
    const matching = results.filter((r) => r.kind === type)
    if (matching.length > 0) {
      results = matching
    }
  }

  // When free mode is on, prioritize free + direct-downloadable assets first
  if (free) {
    results = [...results].sort((a, b) => {
      const score = (x: Asset) =>
        (x.free ? 2 : 0) + (x.directDownload ? 1 : 0)
      return score(b) - score(a)
    })
  }

  results = results.slice(0, limit)
  const ms = Date.now() - t0

  // Fire-and-forget persistence
  void persistSearch(q, type, sources, results.length)

  return NextResponse.json({
    success: true,
    query: q,
    type,
    count: results.length,
    results,
    ms,
  })
}
