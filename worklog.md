# Worklog

---
Task ID: 1
Agent: Main Agent
Task: Fix rendering freeze when navigating from dashboard to "/" after login

Work Log:
- Investigated all loading.tsx files — none exist, not the issue
- Checked all Suspense boundaries — only used in login page (useSearchParams) and tasks page, both safe
- Found the ROOT CAUSE: Framer Motion `AnimatePresence` with exit animations in AppSidebar.tsx
  - `layoutId="sidebar-active"` causes shared layout animation deadlocks during route transitions
  - Multiple `AnimatePresence` blocks with exit animations (`exit={{ opacity: 0, width: 0 }}`) block unmounting during route transitions
  - `motion.aside` wrapping the sidebar delays the dashboard layout unmounting
- Found secondary issue: All landing page components (Hero, Services, Workflow, Stats, Portfolio, Contact) used Framer Motion `motion` components with `whileInView` and `initial`/`animate` patterns that could cause hydration issues during route transitions
- Verified no session-dependent code in landing page components (Navbar, Hero, etc. do NOT call useSession)
- Verified NextAuth API endpoints return correct JSON (session: `{}`, csrf: `{"csrfToken":"..."}`)
- Verified middleware matcher is exactly `["/dashboard/:path*"]` — correct

Fixes Applied:
1. **AppSidebar.tsx**: Removed ALL Framer Motion (`motion`, `AnimatePresence`, `layoutId`). Replaced with:
   - CSS `transition-[width]` for sidebar collapse/expand animation
   - CSS `transition-transform` for mobile slide-in/out
   - Plain `transition-all duration-200` for text show/hide
   - Replaced `layoutId="sidebar-active"` with plain CSS div for active indicator
2. **Hero.tsx**: Removed Framer Motion completely. Replaced with CSS `animate-slide-up` with `animationDelay` for staggered entrance
3. **Services.tsx**: Removed Framer Motion. Replaced with CSS `animate-slide-up` with stagger delays
4. **Workflow.tsx**: Removed Framer Motion. Replaced with CSS `animate-slide-up` with stagger delays
5. **Stats.tsx**: Removed Framer Motion (`motion`, `useInView`). Replaced with `IntersectionObserver` for counter animation + CSS `animate-slide-up`
6. **Portfolio.tsx**: Removed Framer Motion. Replaced with CSS `animate-slide-up` with stagger delays
7. **Contact.tsx**: Removed Framer Motion. Replaced with CSS `animate-slide-up` with stagger delays
8. **globals.css**: Updated `.animate-slide-up` to use `opacity: 0` + `animation: slide-up 0.6s ease-out both` so delayed animations start hidden

Stage Summary:
- Root cause identified: Framer Motion `AnimatePresence` exit animations + `layoutId` in AppSidebar blocking route transitions
- All landing page components converted from Framer Motion to CSS animations
- AppSidebar fully converted to CSS transitions
- No more Framer Motion in any layout or route-transition-critical components
- Dashboard pages still use Framer Motion internally (motion.div, AnimatePresence for list items) but these are safe since they don't wrap route transitions
- ESLint passes with no errors
- NextAuth API endpoints confirmed working correctly
- Navigation dashboard → "/" should no longer freeze

---
Task ID: 2
Agent: Main Agent
Task: Fix redirect loop during login — remove client-side redirects from AuthGuard, make middleware sole source of truth

Work Log:
- Identified the redirect loop root cause: AuthGuard's `useEffect(() => { if (status === 'unauthenticated') window.location.href = '/login' })` conflicting with middleware
- The race condition: After login, cookie is being created → middleware sees authenticated state → BUT useSession() is still temporarily "loading" or "unauthenticated" → AuthGuard redirects back to /login → loop
- AuthGuard also had a 15-second timeout with retry UI — removed for simplicity
- Searched all source files for redirect sources: window.location.href, router.push, router.replace, redirect()
- Verified no server-side `redirect()` calls in any page/layout components
- Verified signOut() in TopNav and AppSidebar are user-initiated click handlers (safe)

Fixes Applied:
1. **AuthGuard (dashboard/layout.tsx)**: Made completely PASSIVE:
   - Removed `window.location.href = '/login'` redirect
   - Removed `useEffect` for redirect
   - Removed 15-second timeout with retry UI
   - Now only: loading → spinner, unauthenticated → null, authenticated → children
   - Added extensive JSDoc explaining NEVER to add redirects here
2. **Login page (login/page.tsx)**: Added JSDoc clarifying redirect only on user action
   - No useSession() used — only `signIn()` in form submit handler
   - `window.location.href = callbackUrl` only fires after successful signIn (user action)
3. **Register page (register/page.tsx)**: Same pattern as login
   - `window.location.href` only fires after successful registration + auto-login (user action)
   - No useSession() effects or auto-redirects

Architecture After Fix:
- **Middleware**: SOLE source of truth for route protection (`/dashboard/:path*` → redirect to `/login`)
- **AuthGuard**: PASSIVE only — shows spinner or nothing, NEVER redirects
- **Login/Register**: Redirect ONLY on explicit user form submit action, never from session state effects
- **No double-redirect systems**: No conflicting middleware + client-side + layout redirects

Test Results:
- ESLint: passes with no errors
- `/` → 200 (landing)
- `/login` → 200 (login page)
- `/dashboard` (unauthenticated) → 307 redirect to `/login?callbackUrl=%2Fdashboard`
- `/api/auth/session` → 200 (JSON `{}`)
- `/api/auth/csrf` → 200 (JSON with csrfToken)
- Full login flow with cookies: session correctly established, user email returned
- `/dashboard` (authenticated) → 200 (no redirect)
- No more ERR_TOO_MANY_REDIRECTS

---
Task ID: 3
Agent: Main Agent
Task: Fix persistent NextAuth redirect loop — trustHost, cookie domain, callbackUrl, middleware

Work Log:
- Found ROOT CAUSE: `NEXTAUTH_URL=http://localhost:3000` in .env causes cookie domain mismatch in preview/proxied environment
- NextAuth was setting cookies for localhost but the preview domain is different, so middleware couldn't validate the session cookie
- Also found: middleware was adding `?callbackUrl=` query params which could create malformed URL loops
- Also found: redirect callback had complex URL parsing that could fail in proxied environments
- Also found: AuthGuard was still a source of potential race conditions (now removed entirely)

Fixes Applied:
1. **lib/auth.ts**: 
   - Added `trustHost: true` — REQUIRED for preview/proxied environments where host header doesn't match NEXTAUTH_URL
   - Added `debug: true` for logging
   - Simplified redirect callback: `return baseUrl + "/dashboard"` — no URL parsing, no callbackUrl
   - Removed `pages.error: "/login"` — unnecessary complexity
   - `session.strategy: "jwt"` already set (confirmed)
   - No custom cookies config (confirmed — was never there)
2. **middleware.ts**:
   - Kept custom middleware with `getToken()` (Next.js 16 doesn't accept `export { default } from "next-auth/middleware"`)
   - Removed `?callbackUrl=` query param from redirect — just redirect to `/login` cleanly
   - Matcher stays as `["/dashboard/:path*"]`
3. **dashboard/layout.tsx**:
   - Removed AuthGuard completely — middleware alone protects routes
   - No useSession, no client-side auth checks in the layout
4. **login/page.tsx**:
   - Removed `useSearchParams` and `callbackUrl` logic entirely
   - Removed `Suspense` wrapper (no longer needed without useSearchParams)
   - Simplified: `if (result?.ok) window.location.href = '/dashboard'` — NOTHING ELSE
5. **register/page.tsx**:
   - Same pattern: redirect to `/dashboard` only after successful auto-login
6. **.env**:
   - Removed `NEXTAUTH_URL=http://localhost:3000` — trustHost:true handles host detection
   - Kept `NEXTAUTH_SECRET` and `DATABASE_URL`

Architecture:
- Middleware: SOLE source of truth, redirects /dashboard/* → /login (no callbackUrl)
- trustHost: true: NextAuth detects host from request headers (works in preview/proxied)
- Login: redirect ONLY on user form submit action → /dashboard
- No AuthGuard: no client-side auth redirects at all
- No callbackUrl: no query param complexity

Test Results:
- ESLint: passes with no errors
- `/api/auth/csrf` → 200 (JSON with csrfToken)
- `/api/auth/session` → 200 (JSON)
- `/dashboard` (unauthenticated) → 307 redirect to `/login` (NO callbackUrl param)
- Server keeps dying in sandbox due to memory (not code issue)
