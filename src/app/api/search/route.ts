import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash } from 'node:crypto'
import ZAI from 'z-ai-web-dev-sdk'
import { db } from '@/lib/db'
import {
  classifyKind,
  hostFromUrl,
  prettyHost,
  ytThumb,
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
    // try to find a JSON object spanning to the end
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

async function imageSearch(query: string, count: number): Promise<Asset[]> {
  const n = Math.max(1, Math.min(20, count))
  try {
    const { stdout } = await execFileP(
      'z-ai',
      ['image-search', '-q', query, '--count', String(n), '--gl', 'us', '--no-rank'],
      { timeout: 120000, maxBuffer: 20 * 1024 * 1024 },
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
      return {
        assetId: assetId(it.original_url, kind),
        kind,
        title: it.caption?.trim() || it.source || host || 'Image result',
        url: it.original_url,
        thumbnail: it.original_url,
        source: it.source || 'image-search',
        host,
        snippet: it.caption || '',
        meta: { width: w, height: h, source: it.source },
      }
    })
  } catch {
    return []
  }
}

async function webSearch(query: string, num: number): Promise<WebResult[]> {
  try {
    const zai = await ZAI.create()
    const results = (await zai.functions.invoke('web_search', { query, num })) as WebResult[]
    if (!Array.isArray(results)) return []
    return results
  } catch {
    return []
  }
}

function buildQuery(query: string, type: SearchType): string {
  const q = query.trim()
  switch (type) {
    case 'video':
      return `${q} site:youtube.com OR free stock video`
    case 'audio':
      return `${q} free stock audio music sound`
    case 'pdf':
      return `${q} filetype:pdf`
    case 'doc':
      return `${q} filetype:doc OR filetype:ppt OR filetype:docx OR filetype:pptx`
    case 'social':
      return `${q} site:twitter.com OR site:reddit.com OR site:pinterest.com OR site:instagram.com`
    case 'image':
      return q
    case 'web':
    case 'all':
    default:
      return q
  }
}

function shouldUseImage(type: SearchType, sources: SourceKey): boolean {
  if (sources === 'images') return true
  if (sources === 'all' || sources === 'google') {
    return type === 'all' || type === 'image'
  }
  return type === 'image'
}

function shouldUseWeb(type: SearchType, sources: SourceKey): boolean {
  if (sources === 'images') return false
  if (type === 'image') return false
  return true
}

function webResultToAsset(r: WebResult): Asset {
  const host = r.host_name || hostFromUrl(r.url)
  const kind = classifyKind(r.url, host)
  const thumb = kind === 'video' ? ytThumb(r.url) : undefined
  return {
    assetId: assetId(r.url, kind),
    kind,
    title: r.name?.trim() || prettyHost(r.url),
    url: r.url,
    thumbnail: thumb,
    source:
      kind === 'video' && host.includes('youtube')
        ? 'youtube'
        : prettyHost(r.url),
    host: prettyHost(r.url),
    snippet: r.snippet || '',
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
  const limit = Math.max(
    1,
    Math.min(60, parseInt(sp.get('limit') || '24', 10)),
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

  if (shouldUseImage(type, sources)) {
    const imgCount =
      type === 'all' ? Math.min(8, Math.ceil(limit / 3)) : limit
    tasks.push(imageSearch(q, imgCount))
  }
  if (shouldUseWeb(type, sources)) {
    const webNum =
      type === 'all'
        ? Math.min(16, Math.ceil((limit * 2) / 3))
        : Math.min(30, limit + 6)
    const wq = buildQuery(q, type)
    tasks.push(webSearch(wq, webNum).then((rs) => rs.map(webResultToAsset)))
  }

  let merged: Asset[] = []
  try {
    const settled = await Promise.all(tasks)
    merged = settled.flat()
  } catch {
    merged = []
  }

  // dedupe by assetId
  const seen = new Set<string>()
  const deduped: Asset[] = []
  for (const a of merged) {
    if (!seen.has(a.assetId)) {
      seen.add(a.assetId)
      deduped.push(a)
    }
  }

  // when type is specific, filter to that kind (in case web_search returned mixed)
  let results = deduped
  if (type !== 'all' && type !== 'web') {
    results = deduped.filter((a) => a.kind === type)
  }
  results = results.slice(0, limit)

  const ms = Date.now() - t0

  // fire-and-forget persistence
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
