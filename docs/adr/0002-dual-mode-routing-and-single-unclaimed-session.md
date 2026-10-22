# Dual-Mode Routing Boundary and Single Unclaimed Guest Session

Status: accepted

We enforce a strict separation between standalone public surfaces and the authenticated App Layout, paired with a single-unclaimed-session constraint for guest assessments:

1. **Deterministic App Layout Predicate**: Whether a route renders inside the collapsible left-sidebar App Layout (with no fixed top header) is governed solely by `(isAuthenticated && supportsAppLayout(path))`. `/privacy`, `/terms`, `/share/:id`, and `/admin` always render outside the App Layout. When unauthenticated, `/` renders the standalone Guest Landing Page and `/test` (plus `/report/:id`) renders outside the App Layout; when authenticated, `/`, `/test`, `/history`, `/settings`, `/assets`, and `/report/:id` all render inside the unified App Layout.
2. **Independent History, Settings, and Assets Routes**: Personal assessment history (`/history`), profile/preferences (`/settings`), and collected archetype assets (`/assets`) are split into dedicated top-level routes navigated via the collapsible sidebar rather than combined under tabbed `/me` views (with `/me` and `/me/settings` redirecting cleanly).
3. **Single Unclaimed Guest Session & Auto-Claim**: An unauthenticated guest may hold at most one locally stored `Unclaimed Session` (`user_id IS NULL`) at a time and is blocked from starting a new assessment until they authenticate to claim it. Upon first authentication on that device, the client automatically claims the local session via `POST /api/sessions/claim`, binding `user_id` on `completed_sessions` and unlocking the corresponding `Cognitive Asset`.
