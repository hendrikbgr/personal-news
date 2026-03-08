# Personal News Dashboard — Feature Roadmap
> Motto: **Only News, No Bullshit**
>
> Check off tasks as completed. Group order reflects implementation priority.
> Last updated: 2026-03-08

---

## Legend
- `[ ]` — Not started
- `[x]` — Completed
- `[-]` — In progress
- `[~]` — Deferred / reconsidered

---

## ✅ Already Shipped

- [x] RSS feed fetching with newspaper4k full-article extraction
- [x] PocketBase database (articles, feeds, categories)
- [x] APScheduler — auto-fetch every 30 minutes
- [x] Infinite scroll news grid (30 articles/page)
- [x] Category filtering (sidebar + mobile pills)
- [x] Full-text search (title + description)
- [x] Save / bookmark articles
- [x] Unread indicator (blue dot on cards)
- [x] Article modal with full content, summary, keywords, metadata
- [x] Fetch status filter — Full articles vs RSS only
- [x] Feed enable/disable toggles
- [x] Feed + category CRUD management page (`/manage`)
- [x] Responsive layout — mobile drawer, desktop sidebar
- [x] Glass morphism design system
- [x] Manual refresh button with status indicator
- [x] Mark as read on article open
- [x] Relative timestamps ("2 hours ago") with exact date on hover
- [x] Word count + read time display in article modal
- [x] AI summary box (newspaper4k NLP)
- [x] Keyword/topic tags in article modal

---

## 🚀 Phase 1 — Quick Wins (High Impact, Low Effort)

### 1. Dark Mode
**Why it matters:** Evening/night reading without eye strain. Increases session length and return visits. Stored in localStorage — zero server-side changes needed.

- [x] Add `dark` class toggle to `<html>` via button in `Header.tsx`
- [x] Save preference to localStorage (`theme: "light" | "dark"`)
- [x] On load, read localStorage and apply before first render (add to `<head>` script to prevent flash)
- [x] Update `globals.css` — add `@variant dark` class-based overrides (Tailwind v4)
- [x] Update glass classes for dark mode (darker backgrounds, lighter borders)
- [x] Update gradient background for dark mode (deeper, muted purples/blues)
- [x] Update `NewsCard`, `ArticleModal`, `Sidebar`, `Header` text colors for dark
- [x] Update `manage/page.tsx` dark mode colors
- [x] Add sun/moon icon toggle in `Header.tsx` (replace or add next to existing icons)
- [x] Test on mobile — ensure system dark mode is respected as default

---

### 2. Keyboard Navigation
**Why it matters:** Power users who discover this never leave. Dramatically improves reading flow — hands on keyboard, no mouse needed.

- [x] Create `useKeyboardNav` hook in `frontend/src/lib/useKeyboardNav.ts`
- [x] `J` / `↓` — focus next article card
- [x] `K` / `↑` — focus previous article card
- [x] `Enter` / `O` — open focused article in modal
- [x] `Escape` — close modal (already works), or deselect focused card
- [x] `S` — toggle save on focused card or open modal
- [ ] `R` — trigger manual refresh
- [ ] `G` then `S` — go to saved articles (chord shortcut)
- [x] Visual focus ring on focused card (keyboard-only, not mouse)
- [x] Add keyboard shortcut help modal (`?` key to open)
- [ ] Show shortcut hints in the UI (`?` icon in header → opens help overlay)
- [x] Wire hook into `NewsGrid.tsx` (manages focused index)
- [x] Wire hook into `ArticleModal.tsx` (Escape already done, add S for save)
- [x] Test: arrow keys don't scroll page when navigating cards

---

### 3. Date Range Filter — Today / 24h / Week / All
**Why it matters:** "What happened today" is the #1 reason people open a news app. A "Today" filter makes the app a daily habit trigger.

- [x] Add `publishedAfter` query param to backend `GET /api/articles` (`main.py`)
- [x] Add `publishedAfter?: string` to `ArticleFilters` interface (`api.ts`)
- [x] Add `published_after` to `getArticles()` URL params (`api.ts`)
- [x] Add `dateRange` state to `page.tsx`: `"today" | "24h" | "week" | null`
- [x] Compute `publishedAfter` ISO string from `dateRange` on render
- [x] Add date range filter pills to desktop status bar (Today / 24h / Week / All)
- [x] Add date range pills to mobile pill row
- [x] Include `filters.dateRange` in `NewsGrid.tsx` reset deps
- [x] "Today" = midnight of current day (local time), not last 24h

---

### 4. Compact / List View Toggle
**Why it matters:** Power users scan headlines. A dense list lets them cover 50 articles in 30 seconds. Saves to localStorage.

- [x] Add `viewStyle: "grid" | "list"` state in `page.tsx`, loaded from localStorage
- [x] Pass `viewStyle` as prop to `NewsGrid.tsx`
- [x] Pass `viewStyle` as prop to `NewsCard.tsx`
- [x] Create list variant inside `NewsCard.tsx`: compact row with emoji, title, meta, save
- [x] Update `NewsGrid.tsx` grid layout: when `list`, use glass-card container with divide-y
- [x] Add toggle button to `Header.tsx` (grid icon / list icon)
- [x] Save `viewStyle` to localStorage on toggle
- [x] Load `viewStyle` from localStorage on mount
- [ ] Mobile: list view is the default (already compact); hide toggle on mobile or keep as-is

---

### 5. Browser Tab Unread Count
**Why it matters:** Oldest trick in the book — it's why people keep Gmail open all day. Zero backend changes.

- [x] Fetch total unread count from `GET /api/articles?is_read=false&per_page=1` (use `totalItems`)
- [x] Update `document.title` to `(23) Personal News` when unread > 0
- [x] Reset to `Personal News` when count = 0
- [x] Poll count every 2 minutes (SWR with refreshInterval: 120_000)
- [x] Add `markAllRead` button to header (clears all unread, resets tab count)

---

### 6. Mark All as Read
**Why it matters:** Satisfying closure. Users return to check what's new *after* clearing their queue — this creates the habit loop.

- [x] Add `POST /api/articles/mark-all-read` endpoint to `main.py` (filter-aware)
- [x] Add `markAllRead(filters?)` to `api.ts`
- [x] Add "Mark all read" button in `Header.tsx` (visible when there are unread articles)
- [x] Brief inline "Done!" feedback on button (1.5s)
- [ ] Update `allArticles` state in `NewsGrid.tsx` optimistically (set all `is_read: true`)
- [ ] Create simple `Toast.tsx` component for non-intrusive feedback messages

---

## 📦 Phase 2 — Medium Effort (High Return-Rate Impact)

### 7. "New Since Last Visit" Banner
**Why it matters:** The single most powerful return-rate driver. Answers "is there anything new for me?" in one second. Intrinsic motivation to come back.

- [ ] Save `last_visit` timestamp to localStorage on every page load (after reading, not on arrival)
- [ ] On app load: fetch count of articles with `published_after=last_visit`
- [ ] If count > 0, show dismissible banner: `"✨ 23 new articles since your last visit"`
- [ ] Banner appears below header, above the filters — dismisses on click or after 10s
- [ ] Banner styled with glass morphism, subtle indigo accent
- [ ] Option: clicking banner auto-applies the "since last visit" date filter
- [ ] Store `last_visit` as the moment the user closes the tab (use `visibilitychange` event)
- [ ] Don't show banner on first ever visit

---

### 8. Reading Stats This Week
**Why it matters:** Honest numbers about your media diet. No gamification, no streaks — just context. Increases sense of value from the app.

- [ ] Add `GET /api/stats` endpoint to `main.py`:
  - `articles_read_today`: count of `is_read=true` articles with `updated >= today midnight`
  - `articles_read_week`: same but last 7 days
  - `articles_saved_week`: `is_saved=true` created in last 7 days
  - `total_feeds_active`: count of `is_active=true` feeds
  - `estimated_reading_time_week`: sum of `word_count` for read articles / 200 (minutes)
- [ ] Add `getStats()` to `api.ts`
- [ ] Add collapsible stats row to `Sidebar.tsx` (desktop) — compact pill row at bottom
- [ ] Stats row: `📰 12 read · ⏱ 1.4h · 🔖 3 saved · this week`
- [ ] Auto-hides on collapsed sidebar (icon-only mode)
- [ ] SWR polling every 5 minutes

---

### 9. Per-Feed "Last Updated" Health Indicator
**Why it matters:** A feed silent for 3 days might be broken. Users need to know. Builds trust — "the app is honest with me."

- [ ] Add `last_article_at` field derivation in `GET /api/feeds` response:
  - For each feed, query latest article `published_at` from `articles` collection
  - Return as `last_article_at` ISO string (or null if no articles)
- [ ] Update `Feed` type in `types.ts` to include `last_article_at?: string`
- [ ] In `Sidebar.tsx`: show colored dot next to feed based on recency:
  - Green: updated in last 24h
  - Amber: 1–3 days ago
  - Red/grey: 3+ days (possibly broken)
- [ ] Tooltip on dot showing "Last article: 2 days ago" (hover)
- [ ] In `manage/page.tsx`: show `last_article_at` in feed list rows

---

### 10. Read History Page / Filter
**Why it matters:** "What did I read this morning?" is a genuine use case. People share articles, want to find something half-remembered. Extends session length.

- [ ] Add `history` route at `frontend/src/app/history/page.tsx`
- [ ] Page shows all articles where `is_read=true`, sorted by `updated DESC`
- [ ] Grouped by date: "Today", "Yesterday", "This week", older dates as headings
- [ ] Reuses `NewsCard` component (list view by default)
- [ ] Search within history
- [ ] Add "History" link to `Header.tsx` manage dropdown or as a nav icon
- [ ] Clear history button (marks all as unread, with confirmation)

---

### 11. Auto Mark as Read on Scroll
**Why it matters:** Matches real reading behavior — you skim, you see, you move on. Reduces "I've already seen this" friction on return visits.

- [ ] In `NewsCard.tsx`, add `IntersectionObserver` to detect when card is fully visible
  - Threshold: 0.9 (90% visible = user saw it)
  - Only trigger once per article (`is_read` already false)
  - Delay: 1.5 seconds after becoming visible (not just a flash)
- [ ] Call `markRead(article.id)` (already exists in `api.ts`)
- [ ] Update `allArticles` state in `NewsGrid.tsx` optimistically
- [ ] Make this opt-in: add toggle in settings/preferences
  - Default: OFF (explicit is better for a news reader)
  - Save to localStorage as `auto_mark_read: boolean`

---

### 12. Saved Articles Export
**Why it matters:** Appeals to the "I own my data" crowd this app is built for. "I can always get my stuff out" increases long-term commitment.

- [ ] Add `GET /api/articles/export` endpoint to `main.py`:
  - Query param: `format=json|markdown|csv`
  - Returns saved articles (`is_saved=true`) in requested format
  - Markdown format: `# Title\n**Source** · Date\n\nSummary\n\n[Read](url)`
  - JSON format: full article objects array
- [ ] Add `exportSaved(format)` to `api.ts`
- [ ] Add export button to the "Saved" filter view in `Header.tsx` or `NewsGrid.tsx`
  - Only visible when `showSaved=true`
  - Dropdown: "Export as Markdown / JSON"
- [ ] Trigger browser download (create Blob, click anchor)
- [ ] Filename: `saved-articles-2026-03-08.md`

---

## 🏗️ Phase 3 — Bigger Features

### 13. Offline / PWA Support
**Why it matters:** Once it's on someone's home screen, it's there permanently. Subway, plane, spotty connection — the app still works.

- [ ] Add `manifest.json` to `public/` with app name, icons, theme color
- [ ] Add PWA meta tags to `layout.tsx` (`<head>`)
- [ ] Create `public/sw.js` — service worker:
  - Cache strategy: network-first for API, cache-first for static assets
  - Cache last 30 articles (store in Cache API or IndexedDB)
  - Serve cached articles when offline
- [ ] Register service worker in `layout.tsx` (client-side, check `'serviceWorker' in navigator`)
- [ ] Add install prompt: subtle "Add to Home Screen" banner (only once, dismissible)
- [ ] Create app icons: 192x192 and 512x512 PNG (use the gradient logo)
- [ ] Test: airplane mode — app loads, articles readable, save works (queues for sync)
- [ ] Offline banner: "You're offline — showing cached articles" at top of page

---

### 14. Article Grouping by Story (Multi-Source)
**Why it matters:** The same story from 3 feeds clutters the feed. Grouping reduces noise. Cross-referencing sources is exactly what a "no bullshit" reader wants.

- [ ] Backend: add `story_group_id` field to `articles` collection in PocketBase
- [ ] In `fetcher.py`: after saving new article, check for similar title in recent articles (last 24h, same category)
  - Simple similarity: title word overlap > 60% (use set intersection of significant words)
  - If match found, assign same `story_group_id` (UUID)
  - If no match, assign new unique `story_group_id`
- [ ] Backend: add `GET /api/articles` optional param `grouped=true`
  - Returns one article per `story_group_id` (the most recent/best)
  - Includes `group_count` field showing how many sources covered the story
- [ ] Frontend `NewsCard.tsx`: show `+2 more sources` badge when `group_count > 1`
- [ ] Clicking badge opens a mini-modal showing all articles in the group (side-by-side titles)
- [ ] Toggle in `page.tsx`: "Group similar stories" on/off

---

### 15. Keyboard Shortcut Help Overlay
**Why it matters:** Discoverability. Most users never find keyboard shortcuts unless shown. One-time "did you know?" moment dramatically increases power-user adoption.

> Note: This is part of Feature #2 (Keyboard Navigation) but listed separately for tracking.

- [ ] Create `KeyboardHelp.tsx` modal component
- [ ] Press `?` anywhere to open/close
- [ ] Two-column layout: Action | Shortcut
- [ ] Sections: Navigation, Article, Filters, App
- [ ] Styled with glass morphism, keyboard key chips (`<kbd>` styled elements)
- [ ] Show hint in footer: "Press ? for keyboard shortcuts"
- [ ] Dismiss on Escape or clicking outside

---

### 16. Toast Notification System
**Why it matters:** Non-intrusive feedback for actions ("Saved", "Marked all read", "Exported 12 articles"). Makes the app feel polished and responsive.

> Note: Depended on by Features #5, #6, #12.

- [ ] Create `Toast.tsx` component + `useToast` hook in `frontend/src/lib/useToast.ts`
- [ ] Toast types: `success`, `info`, `error`
- [ ] Auto-dismiss after 3 seconds
- [ ] Stack multiple toasts (max 3 visible)
- [ ] Position: bottom-right desktop, bottom-center mobile
- [ ] Add `ToastContainer` to `layout.tsx` or `page.tsx`
- [ ] Animate: slide up on appear, fade out on dismiss
- [ ] No click-to-dismiss required (keeps it truly non-intrusive)

---

### 17. "New Since Last Visit" — Advanced
**Why it matters:** Extension of Feature #7. Persistent across browser sessions via localStorage.

> Depends on Feature #7 (basic banner). This adds the date filter integration.

- [ ] "Show new articles" button in banner applies `publishedAfter=last_visit` filter automatically
- [ ] Unread count in browser tab updates when new articles arrive (SWR polling)
- [ ] On mobile: show unread count badge on the app icon (requires PWA, depends on Feature #13)

---

## 🎨 Phase 4 — Polish & Accessibility

### 18. Font Size / Reading Preferences
**Why it matters:** Accessibility + comfort = longer reading sessions.

- [ ] Add `fontSize: "sm" | "md" | "lg"` to localStorage preferences
- [ ] Apply to `ArticleModal.tsx` content area via class switch
- [ ] Font size control: three buttons (A- · A · A+) in the modal header or a preferences panel
- [ ] Affects: `article-content` font size (15px → 17px → 19px)

---

### 19. Scroll Position Memory
**Why it matters:** Coming back to exactly where you left off. Critical for long feed sessions.

- [ ] Save `scrollY` of `NewsGrid` scroll container to sessionStorage on scroll (debounced 500ms)
- [ ] Restore on mount if same filters are active
- [ ] Clear saved position when filters change

---

### 20. Article Share / Copy Link
**Why it matters:** "Only News, No Bullshit" — copy the URL, share it yourself. No social buttons, no tracking.

- [ ] Add "Copy link" button in `ArticleModal.tsx` footer
- [ ] Uses `navigator.clipboard.writeText(article.url)`
- [ ] Button shows "Copied!" for 2 seconds (use Toast or inline state)
- [ ] No share API, no social buttons, no tracking — just the raw URL

---

## 📊 Tracking Progress

| Phase | Features | Done | Remaining |
|-------|----------|------|-----------|
| Shipped | 20 | 20 | 0 |
| Phase 1 — Quick Wins | 6 | 0 | 6 |
| Phase 2 — Medium | 6 | 0 | 6 |
| Phase 3 — Bigger | 5 | 0 | 5 |
| Phase 4 — Polish | 3 | 0 | 3 |
| **Total** | **40** | **20** | **20** |

---

## 🚫 Explicitly NOT Building (Stays True to the Motto)

- Algorithmic "trending" or "popular" rankings
- "Recommended for you" personalization
- Social sharing buttons (Twitter, Facebook, etc.)
- Read counts / engagement metrics per article
- Push notifications / email digests
- Comment sections
- User accounts / auth
- Ads or sponsored content
- Read-time tracking sent anywhere
- Any third-party analytics
