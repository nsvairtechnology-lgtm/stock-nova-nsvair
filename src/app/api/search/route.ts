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

// Single shared ZAI instance reused across all parallel web_search calls.
let zaiPromise: Promise<unknown> | null = null
async function getZai() {
  if (!zaiPromise) zaiPromise = ZAI.create()
  return zaiPromise as Promise<Awaited<ReturnType<typeof ZAI.create>>>
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function webSearch(query: string, num: number, attempt = 0): Promise<WebResult[]> {
  try {
    const zai = await getZai()
    const results = (await zai.functions.invoke('web_search', { query, num })) as WebResult[]
    if (!Array.isArray(results)) return []
    return results
  } catch (e) {
    // Retry once after a brief pause on rate-limit (429) — this often happens
    // when several web_search calls fire in parallel.
    const msg = e instanceof Error ? e.message : String(e)
    if (attempt < 2 && /429|too many requests/i.test(msg)) {
      await sleep(800 * (attempt + 1))
      return webSearch(query, num, attempt + 1)
    }
    return []
  }
}

/* ------------------- Multi-query fan-out planner ------------------- */

interface QueryPlan {
  label: string
  q: string
  num: number
}

function buildQueries(query: string, type: SearchType, free: boolean): QueryPlan[] {
  const q = query.trim()
  const NUM = 20

  switch (type) {
    case 'all': {
      if (free) {
        return [
          { label: 'img-free', q: `${q} free royalty free`, num: NUM },
          { label: 'web-free', q: `${q} free royalty free copyright free`, num: NUM },
          {
            label: 'web-free-sites',
            q: `${q} site:unsplash.com OR site:pexels.com OR site:pixabay.com`,
            num: NUM,
          },
          { label: 'web-public-domain', q: `${q} public domain creative commons`, num: NUM },
          { label: 'web-free-stock', q: `${q} free stock download`, num: NUM },
          { label: 'web-wikimedia', q: `${q} site:commons.wikimedia.org OR site:flickr.com`, num: NUM },
        ]
      }
      return [
        { label: 'img', q, num: NUM },
        { label: 'web', q, num: NUM },
        { label: 'web-free-download', q: `${q} free download`, num: NUM },
        { label: 'web-stock', q: `${q} stock`, num: NUM },
        { label: 'web-hd', q: `${q} hd 4k high quality`, num: NUM },
        { label: 'web-wallpaper', q: `${q} wallpaper background`, num: NUM },
      ]
    }
    case 'image': {
      if (free) {
        return [
          { label: 'img-free', q: `${q} free`, num: NUM },
          {
            label: 'web-free-stocks',
            q: `${q} free stock photo site:unsplash.com OR site:pexels.com OR site:pixabay.com OR site:stocksnap.io`,
            num: NUM,
          },
        ]
      }
      return [
        { label: 'img', q, num: NUM },
        {
          label: 'web-free-stocks',
          q: `${q} free stock photo site:unsplash.com OR site:pexels.com OR site:pixabay.com OR site:stocksnap.io`,
          num: NUM,
        },
      ]
    }
    case 'video': {
      if (free) {
        return [
          {
            label: 'web-free-stocks',
            q: `${q} free stock video site:pexels.com OR site:pixabay.com OR site:coverr.co OR site:mixkit.co`,
            num: NUM,
          },
          { label: 'web-royalty-free', q: `${q} royalty free video download`, num: NUM },
          { label: 'web-free-copyright', q: `${q} free copyright free video`, num: NUM },
        ]
      }
      return [
        { label: 'web-yt', q: `${q} site:youtube.com`, num: NUM },
        {
          label: 'web-free-stocks',
          q: `${q} free stock video site:pexels.com OR site:pixabay.com OR site:coverr.co OR site:mixkit.co`,
          num: NUM,
        },
        { label: 'web-royalty-free', q: `${q} royalty free video download`, num: NUM },
      ]
    }
    case 'audio': {
      return [
        {
          label: 'web-free-music-sites',
          q: `${q} free music site:pixabay.com OR site:freesound.org OR site:freemusicarchive.org OR site:bensound.com`,
          num: NUM,
        },
        { label: 'web-royalty-free', q: `${q} royalty free audio download`, num: NUM },
        { label: 'web-sfx', q: `${q} free sound effect`, num: NUM },
      ]
    }
    case 'pdf': {
      return [
        { label: 'web-pdf', q: `${q} filetype:pdf`, num: NUM },
        { label: 'web-research', q: `${q} research paper pdf`, num: NUM },
        { label: 'web-ebook', q: `${q} free ebook pdf`, num: NUM },
      ]
    }
    case 'doc': {
      return [
        {
          label: 'web-doc-types',
          q: `${q} filetype:doc OR filetype:ppt OR filetype:docx OR filetype:pptx`,
          num: NUM,
        },
        { label: 'web-templates', q: `${q} template slides free download`, num: NUM },
      ]
    }
    case 'social': {
      return [
        {
          label: 'web-social-1',
          q: `${q} site:twitter.com OR site:x.com OR site:reddit.com`,
          num: NUM,
        },
        {
          label: 'web-social-2',
          q: `${q} site:pinterest.com OR site:instagram.com OR site:tiktok.com`,
          num: NUM,
        },
      ]
    }
    case 'web':
    default: {
      return [
        { label: 'web', q, num: NUM },
        { label: 'web-article', q: `${q} article blog guide`, num: NUM },
        { label: 'web-news', q: `${q} news`, num: NUM },
      ]
    }
  }
}

function shouldUseImage(type: SearchType, sources: SourceKey): boolean {
  if (sources === 'images') return true
  if (sources === 'all' || sources === 'google') {
    return type === 'all' || type === 'image'
  }
  return type === 'image'
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

  // Build the multi-query plan
  const plans = buildQueries(q, type, free)

  // Decide whether to include image-search as one of the parallel tasks.
  // image-search has its own dedicated query (the first plan when label starts
  // with "img"), and we only run it for the appropriate types/sources.
  const includeImage = shouldUseImage(type, sources)
  const imgPlan = includeImage
    ? plans.find((p) => p.label.startsWith('img'))
    : undefined
  const webPlans = plans.filter((p) => !p.label.startsWith('img'))

  // Each task is wrapped so a failure returns []. Run image-search in parallel
  // with the web searches; the web searches themselves run SEQUENTIALLY to
  // avoid hitting the upstream ZAI API rate limit (429) when several fire at
  // once. Each individual web_search call already retries on 429.
  const tasks: Promise<Asset[]>[] = []

  if (imgPlan) {
    tasks.push(imageSearch(imgPlan.q, Math.min(20, imgPlan.num)).catch(() => []))
  }

  // Chain the web plans serially with a small inter-call delay to keep us
  // under the upstream ZAI web_search rate limit.
  const webChain = (async () => {
    const out: Asset[] = []
    for (let i = 0; i < webPlans.length; i++) {
      if (i > 0) await sleep(1200) // breathe between calls to avoid 429
      try {
        const rs = await webSearch(webPlans[i].q, webPlans[i].num)
        out.push(...rs.map(webResultToAsset))
      } catch {
        // ignore — keep going
      }
    }
    return out
  })()
  tasks.push(webChain)

  let merged: Asset[] = []
  try {
    const settled = await Promise.all(tasks)
    merged = settled.flat()
  } catch {
    merged = []
  }

  // dedupe by assetId (keep first occurrence — image-search wins for images)
  const seen = new Set<string>()
  const deduped: Asset[] = []
  for (const a of merged) {
    if (!seen.has(a.assetId)) {
      seen.add(a.assetId)
      deduped.push(a)
    }
  }

  // NOTE: We intentionally do NOT filter by kind here for specific types. The
  // multi-query plan above already targets the right kind (e.g. `site:youtube.com`
  // for video, `filetype:pdf` for pdf, `site:pexels.com OR site:pixabay.com` for
  // free video). Many free-stock video/audio hosts (Pexels, Pixabay, Mixkit,
  // Bensound, Freesound…) are NOT in classifyKind's VIDEO_HOSTS / AUDIO_HOSTS
  // sets, so they'd be labelled 'web' and wrongly dropped. The user can still
  // narrow with the format filter rail in the UI.
  let results = deduped

  // When free mode is on, prioritize free + direct-downloadable assets first,
  // but still return everything (so the user can browse).
  if (free) {
    results = [...results].sort((a, b) => {
      const score = (x: Asset) =>
        (x.free ? 2 : 0) + (x.directDownload ? 1 : 0)
      return score(b) - score(a)
    })
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
