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
