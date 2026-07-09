# StockNova — Universal Stock Media Portal — Worklog

Project: **StockNova** ("The universe of media, one search away.")
A universal stock media discovery portal that aggregates images, videos, audio,
PDFs, documents and social/web content from across the internet (Google, YouTube,
social platforms, etc.) using the ZAI web-search and image-search skills.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + Prisma (SQLite) + z-ai-web-dev-sdk.

Design rules:
- Dark-first aesthetic, emerald + amber accents. NO indigo / NO blue.
- Sticky footer (min-h-screen flex flex-col, footer mt-auto).
- Responsive, accessible, Framer Motion animations.
- z-ai-web-dev-sdk ONLY on the backend.

---
Task ID: 0
Agent: orchestrator (main)
Task: Project discovery + planning

Work Log:
- Explored existing project structure (Next.js 16 scaffold, shadcn/ui components present, Prisma + z-ai-web-dev-sdk installed).
- Read image-search skill (CLI: `z-ai image-search -q "<query>" --count N --gl us`).
- Read web-search skill (SDK: `zai.functions.invoke('web_search', { query, num, recency_days })`).
- Dev server confirmed running on port 3000.
- Named the portal "StockNova".

Stage Summary:
- Ready to build. Prisma schema + APIs + frontend next.

---
Task ID: 2-3
Agent: full-stack-developer
Task: Built the full StockNova portal — all backend API routes (search, trending, saved, download, stats) plus the entire dark-first, emerald/amber client UI on the single `/` route.

Work Log:
- Read existing worklog (Task 0 by orchestrator) and confirmed Prisma schema is already pushed (SearchHistory, TrendingKeyword, SavedAsset, DownloadLog) — did NOT recreate it.
- Verified `z-ai` CLI on PATH (`/usr/local/bin/z-ai`) and tested both `z-ai image-search` (writes pretty JSON to stdout after a status preamble — parser extracts the JSON object starting at first `{`) and `zai.functions.invoke('web_search', { query, num })` (returns array of `{ url, name, snippet, host_name, rank, date, favicon }`).
- Created `src/components/providers.tsx` wiring QueryClientProvider (TanStack Query) + next-themes ThemeProvider (defaultTheme='dark', attribute='class') + sonner `<Toaster richColors>`. Updated `src/app/layout.tsx` to wrap children in `<Providers>` and replaced metadata with StockNova branding.
- Rewrote `src/app/globals.css`: dark-first emerald (`oklch(0.7 0.16 158)`) + amber (`oklch(0.78 0.15 75)`) accents, glassmorphism utilities (`.sn-glass`, `.sn-glass-strong`), radial emerald-glow shell background (`.sn-shell`), custom scrollbar (`.sn-scroll`), animated audio waveform bars (`.sn-bar`), nova pulse animation. NO indigo/blue anywhere.
- Created `src/lib/types.ts` (Asset, AssetKind, SearchType, SourceKey, SortKey, SearchResponse, SavedAssetRow, StatsResponse), `src/lib/classify.ts` (hostFromUrl, classifyKind, youtubeId, ytThumb, prettyHost, faviconUrl — shared host/kind classifier), and `src/lib/store.ts` (Zustand store holding query/type/sources/sort/results/loading/lastQuery/lastMs/hasSearched/error/filterKind/selectedAsset/detailOpen/savedOpen, with a `runSearch` async action that calls `/api/search`, plus openDetail/closeDetail/setSavedOpen).
- API routes (all `runtime='nodejs'`, `dynamic='force-dynamic'`):
  - `src/app/api/search/route.ts`: GET. For images calls `z-ai image-search` via `execFile` (120s timeout, parses stdout JSON, returns [] on any failure so the whole search never crashes). For web/pdf/doc/social/video/audio calls `ZAI.create()` + `zai.functions.invoke('web_search', { query, num })` with smart per-type queries (e.g. `filetype:pdf`, `site:youtube.com OR free stock video`, `site:twitter.com OR site:reddit.com OR site:pinterest.com`). Classifies each web hit into kind via host + URL extension. For `type=all` runs image-search + web-search in parallel via Promise.all and merges. Dedupes by sha1(assetId) hash. Persists SearchHistory row + upserts TrendingKeyword (increment count) — both wrapped in try/catch so DB errors never break search. Returns `{ success, query, type, count, results, ms }`.
  - `src/app/api/trending/route.ts`: GET returns top 12 TrendingKeyword by count; seeds 12 sensible defaults on first call if table empty.
  - `src/app/api/saved/route.ts`: GET lists all SavedAsset; POST upserts by assetId; DELETE removes by assetId (query param or JSON body).
  - `src/app/api/download/route.ts`: POST logs a DownloadLog row and returns `{ ok, url }`.
  - `src/app/api/stats/route.ts`: GET returns `{ totalSearches, totalResults, totalSaved, totalDownloads }` via Prisma counts + aggregate.
- StockNova components under `src/components/stocknova/`:
  - `header.tsx`: sticky glass header with nova logo (Sparkles in emerald), wordmark, Saved button (with live count badge from /api/saved), Downloads anchor, theme toggle (sun/moon). On mobile collapses into a Menu Sheet containing Saved + Downloads entries.
  - `hero-search.tsx`: big headline "The universe of media, one search away." with emerald→amber gradient, glassmorphism search input with emerald Search button, 8 format chips (All/Images/Videos/Audio/PDF/Docs/Social/Web), source selector (All Sources/Google/YouTube/Web/Image Sites), error alert, and TrendingChips below. Framer Motion entrance animations.
  - `trending-chips.tsx`: fetches /api/trending, renders clickable pills that trigger runSearch.
  - `stats-strip.tsx`: 4 stat cards (Formats 6+, Sources 4+, Assets Surfaced count, Avg Response) with Lucide icons + Framer Motion. Polls /api/stats every 15s.
  - `category-showcase.tsx`: "Browse by category" grid of 8 gradient tiles (one per format + Everything) shown before first search — clicking one runs a curated preset search.
  - `how-it-works.tsx`: 3-step strip (Type → Discover → Save & download) shown before first search.
  - `filter-rail.tsx`: sticky desktop sidebar (lg+) with format filter pills (with per-kind counts), sort by relevance/newest, and reset button. On mobile collapses into a left-side Sheet triggered by a "Filters" button.
  - `results-grid.tsx`: results count + ms + ZAI attribution header, loading skeletons (8 cards), empty/error states with friendly icons, then a responsive 2/3/4-col grid of AssetCard. Applies filterKind + sort client-side.
  - `asset-card.tsx`: single card with per-kind media renderers — image (4:3 thumbnail with dimension badge), video (16:9 with play badge + YouTube thumb via ytThumb), audio (animated waveform bars + play button), pdf/doc (file-icon tile), web/social (favicon + domain + snippet link-preview). Hover overlay, kind badge, Save (bookmark toggle, optimistic), Download, Open-source icon buttons. Whole card clickable to open detail dialog.
  - `asset-detail-dialog.tsx`: shadcn Dialog with large kind-specific preview (image, video play overlay, audio waveform, file icon, web/social link card), full metadata (kind, source, host, dimensions, date), Download/Save/Copy-link/Open-source buttons, and the URL in a code-style block.
  - `saved-drawer.tsx` + `saved-drawer-list.tsx`: right-side Sheet (controlled by store.savedOpen) listing all SavedAsset rows with thumbnail/kind icon, title, source, per-row Download + Open + Remove buttons. Empty state with Inbox icon. Scrollable.
  - `footer.tsx`: `mt-auto` sticky footer with StockNova wordmark + tagline, 4 columns (Product/Sources/Formats/Legal), "Powered by ZAI web & image search" line, and dynamic copyright.
- `src/app/page.tsx`: client page composing Header + HeroSearch + StatsStrip + (CategoryShowcase + HowItWorks when not searched) + ResultsGrid + Footer, with SavedDrawer and AssetDetailDialog mounted globally. Root wrapper is `<div className="sn-shell flex min-h-screen flex-col bg-zinc-950 text-zinc-100">` with `<main className="flex-1">` and `<footer className="mt-auto">` — sticky footer verified on short and long pages.
- Used plain `<img referrerPolicy="no-referrer">` for all external images (avoiding next/image domain config) — all have alt text.
- All fetches use relative paths only (`/api/search?...`). No absolute URLs, no ports in code.
- Verified end-to-end: `bun run lint` passes clean (no errors). Dev log shows no runtime/hydration errors. Live API tests:
  - `/api/search?q=mountain landscape&type=all` → 12 results mixing image/web/social (real OSS image URLs + Unsplash/Pexels/Pinterest hits).
  - `/api/search?q=lofi music&type=video` → 2 YouTube videos.
  - `/api/search?q=cybersecurity report&type=pdf` → 6 real PDF links (WEF, Microsoft, AT&T, OpenText…).
  - `/api/search?q=lofi music&type=all` → 17 results: 7 images, 5 videos, 4 web, 1 audio (true multi-format merge).
  - `/api/saved` round-trip (POST → GET → DELETE → GET) works; refresh persists.
  - `/api/download` logs and returns url; `/api/stats` returns live counts (totalSearches=3, totalResults=20, totalDownloads=1 after tests).
  - `/api/trending` returns top keywords (bubbles searched keywords up via count increment).

Stage Summary:
- Files created: src/components/providers.tsx, src/lib/types.ts, src/lib/classify.ts, src/lib/store.ts, src/app/api/search/route.ts, src/app/api/trending/route.ts, src/app/api/saved/route.ts, src/app/api/download/route.ts, src/app/api/stats/route.ts, src/components/stocknova/{header,hero-search,stats-strip,filter-rail,results-grid,asset-card,asset-detail-dialog,saved-drawer,saved-drawer-list,footer,category-showcase,how-it-works,trending-chips}.tsx.
- Files edited: src/app/layout.tsx (Providers + StockNova metadata), src/app/globals.css (dark emerald/amber theme + utilities), src/app/page.tsx (compose portal).
- Prisma schema untouched (used existing models). `src/lib/db.ts` untouched.
- Portal is live on port 3000, fully functional: real multi-format search, persistent saved library, download logging, live stats, dark-first glassmorphism UI with emerald/amber accents, sticky footer, responsive, accessible. No indigo/blue used. Lint clean.

---
Task ID: 5
Agent: orchestrator (main) — Agent Browser verification
Task: End-to-end self-verification of StockNova via Agent Browser (mandatory before reporting completion).

Work Log:
- Opened http://localhost:3000/ — page title "StockNova — The universe of media, one search away." rendered. No console errors, no page errors (only React DevTools info + HMR connected).
- Snapshot confirmed full structure: sticky glass header (nova logo, Saved/Downloads/theme toggle), hero search with headline + format chips (All/Images/Videos/Audio/PDF/Docs/Social/Web) + source selector + trending chips, "Browse by category" grid, "How it works" strip, footer with Product/Sources/Formats/Legal nav columns.
- Searched "mountain landscape" (type=all) → 18 real multi-format results (Images 8, Videos 2, Web 7, Social 1) with per-kind filter counts. No errors.
- Clicked "Save to library" on a card → optimistic toggle to "Remove from library" confirmed.
- Clicked a card → detail dialog opened with Download / Copy link / Open source / Close buttons.
- Opened Saved Library drawer (header button) → persisted "Visual Wilderness" asset shown with thumbnail.
- Sticky footer layout verified: wrapper = `sn-shell flex min-h-screen flex-col`, main = `flex-1`, footer = `mt-auto`. On long results page footer sits at document end (footerAtDocEnd=true). On initial page content exceeds viewport so footer is naturally at bottom (no floating gap).
- Mobile (iPhone 14): header collapses to hamburger "Open menu", filter rail collapses to "Filters" button. Ran "lofi music" search on mobile → real results returned incl. Lofi Girl - Bandcamp (audio source) and images.
- Color audit: 0 forbidden indigo/blue colors across all elements (emerald/amber palette only).
- `bun run lint` — clean (0 errors).

Stage Summary:
- StockNova is browser-verified and fully functional. Real multi-format search (image-search CLI + web-search SDK), persistent saved library, download logging, live stats, dark-first glassmorphism UI, sticky footer, responsive, accessible, no indigo/blue. Ready for the user.
