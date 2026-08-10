// Shared classification helpers (used by the search API; safe for both server and client).

import type { AssetKind } from './types'

const VIDEO_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com', 'vimeo.com', 'player.vimeo.com', 'dailymotion.com', 'www.dailymotion.com', 'twitch.tv', 'www.twitch.tv'])
const AUDIO_HOSTS = new Set(['soundcloud.com', 'www.soundcloud.com', 'open.spotify.com', 'spotify.com', 'bandcamp.com', 'www.bandcamp.com', 'podcasts.apple.com'])
const SOCIAL_HOSTS = new Set(['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com', 'instagram.com', 'www.instagram.com', 'tiktok.com', 'www.tiktok.com', 'facebook.com', 'www.facebook.com', 'reddit.com', 'www.reddit.com', 'linkedin.com', 'www.linkedin.com', 'pinterest.com', 'www.pinterest.com', 'pin.it'])
const DOC_HOSTS = new Set(['arxiv.org', 'www.arxiv.org', 'researchgate.net', 'www.researchgate.net', 'scribd.com', 'www.scribd.com', 'slideshare.net', 'www.slideshare.net', 'docs.google.com', 'drive.google.com', '1drv.ms', 'onedrive.live.com'])

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function classifyKind(url: string, host?: string): AssetKind {
  const h = (host || hostFromUrl(url)).toLowerCase()
  const lower = url.toLowerCase()

  if (VIDEO_HOSTS.has(h)) return 'video'
  if (AUDIO_HOSTS.has(h)) return 'audio'
  if (SOCIAL_HOSTS.has(h)) return 'social'

  if (DOC_HOSTS.has(h)) {
    if (lower.endsWith('.pdf')) return 'pdf'
    return 'doc'
  }

  if (lower.endsWith('.pdf')) return 'pdf'
  if (/\.(docx?|pptx?|xlsx?|odt|odp|ods|rtf)(\?|#|$)/.test(lower)) return 'doc'
  if (/\.(mp3|wav|flac|aac|ogg|m4a|opus)(\?|#|$)/.test(lower)) return 'audio'
  if (/\.(mp4|mov|mkv|webm|avi|m4v)(\?|#|$)/.test(lower)) return 'video'

  return 'web'
}

const YT_RE = /(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/

export function youtubeId(url: string): string | null {
  const m = url.match(YT_RE)
  return m ? m[1] : null
}

export function ytThumb(url: string): string | null {
  const id = youtubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export function prettyHost(url: string): string {
  const h = hostFromUrl(url)
  if (!h) return 'web'
  return h.replace(/^www\./, '')
}

export function faviconUrl(url: string): string {
  const h = hostFromUrl(url)
  if (!h) return ''
  return `https://www.google.com/s2/favicons?domain=${h}&sz=64`
}

/* ------------------------------------------------------------------ */
/* Free / royalty-free source detection + license helpers             */
/* ------------------------------------------------------------------ */

// Known free / royalty-free stock sources
export const FREE_SOURCES = new Set([
  'unsplash.com', 'www.unsplash.com',
  'pexels.com', 'www.pexels.com', 'images.pexels.com', 'videos.pexels.com',
  'pixabay.com', 'www.pixabay.com', 'cdn.pixabay.com',
  'coverr.co', 'www.coverr.co',
  'mixkit.co', 'www.mixkit.co', 'assets.mixkit.co',
  'bensound.com', 'www.bensound.com',
  'freesound.org', 'www.freesound.org', 'cdn.freesound.org',
  'freemusicarchive.org', 'www.freemusicarchive.org', 'files.freemusicarchive.org',
  'archive.org', 'www.archive.org', 'web.archive.org',
  'commons.wikimedia.org', 'upload.wikimedia.org',
  'openverse.org', 'www.openverse.org',
  'stocksnap.io', 'www.stocksnap.io',
  'lifeofpix.com', 'www.lifeofpix.com',
  'gratisography.com', 'www.gratisography.com',
  'morguefile.com', 'www.morguefile.com',
  'splitshire.com', 'www.splitshire.com',
  'kaboompics.com', 'www.kaboompics.com',
  'publicdomainpictures.net', 'www.publicdomainpictures.net',
  'newoldstock.com', 'www.newoldstock.com',
  'libreshot.com', 'www.libreshot.com',
  'rawpixel.com', 'www.rawpixel.com',
  'flickr.com', 'www.flickr.com', // Flickr has CC search — treat as potentially free
  'incompetech.com', 'www.incompetech.com',
  'dig.ccmixter.org',
  'musopen.org', 'www.musopen.org',
])

export function isFreeSource(url: string): boolean {
  const h = hostFromUrl(url)
  return FREE_SOURCES.has(h)
}

export function licenseForHost(url: string): string {
  const h = hostFromUrl(url)
  if (h.includes('unsplash')) return 'Unsplash License (free)'
  if (h.includes('pexels')) return 'Pexels License (free)'
  if (h.includes('pixabay')) return 'Pixabay License (free)'
  if (h.includes('coverr')) return 'Coverr (free, no attribution)'
  if (h.includes('mixkit')) return 'Mixkit (free)'
  if (h.includes('bensound')) return 'Bensound (free with attribution)'
  if (h.includes('freesound')) return 'Creative Commons'
  if (h.includes('freemusicarchive') || h.includes('musopen') || h.includes('ccmixter')) return 'Creative Commons'
  if (h.includes('archive.org')) return 'Public Domain / varies'
  if (h.includes('wikimedia') || h.includes('commons.wikimedia')) return 'Creative Commons / Public Domain'
  if (h.includes('stocksnap') || h.includes('lifeofpix') || h.includes('gratisography') || h.includes('morguefile') || h.includes('splitshire') || h.includes('kaboompics') || h.includes('publicdomainpictures') || h.includes('libreshot') || h.includes('newoldstock')) return 'CC0 / Public Domain'
  if (h.includes('flickr')) return 'Creative Commons (varies)'
  if (h.includes('incompetech')) return 'Creative Commons (attribution)'
  return ''
}

// Direct file extensions that can be proxy-downloaded as-is
const DIRECT_FILE_RE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico|mp4|webm|mov|mkv|m4v|avi|mp3|wav|flac|aac|ogg|opus|m4a|pdf|docx?|pptx?|xlsx?|odt|odp|ods|rtf|epub|zip|rar|7z|tar|gz)(\?|#|$)/i

// Hosts known to serve the actual file bytes directly (CDNs / free-stock CDNs / OSS)
const DIRECT_HOSTS = new Set([
  'sfile.chatglm.cn', // ZAI image-search OSS — direct image bytes
  'images.unsplash.com',
  'images.pexels.com',
  'videos.pexels.com',
  'player.vimeo.com',
  'cdn.pixabay.com',
  'assets.mixkit.co',
  'upload.wikimedia.org',
  'cdn.freesound.org',
  'files.freemusicarchive.org',
])

export function isDirectDownloadable(url: string, kind?: AssetKind): boolean {
  const h = hostFromUrl(url)
  if (DIRECT_HOSTS.has(h)) return true
  if (DIRECT_FILE_RE.test(url.toLowerCase())) return true
  // Image kind from OSS-like hosts is always directly downloadable
  if (kind === 'image' && (h.includes('chatglm') || h.includes('unsplash') || h.includes('pexels') || h.includes('pixabay') || h.includes('wikimedia'))) return true
  return false
}

// Derive a clean filename for the Content-Disposition header
export function suggestFilename(asset: { title?: string; url: string; kind?: string }): string {
  const urlPath = asset.url.split('?')[0].split('#')[0]
  const ext = (urlPath.match(/\.([a-z0-9]{2,4})$/i)?.[1] || '').toLowerCase()
  let base = (asset.title || 'stocknova-asset')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  if (!base) base = 'stocknova-asset'
  if (ext) return `${base}.${ext}`
  // default extension per kind
  if (asset.kind === 'image') return `${base}.jpg`
  if (asset.kind === 'video') return `${base}.mp4`
  if (asset.kind === 'audio') return `${base}.mp3`
  if (asset.kind === 'pdf') return `${base}.pdf`
  if (asset.kind === 'doc') return `${base}.doc`
  return `${base}.html`
}
