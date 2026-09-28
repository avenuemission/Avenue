# Security

How sign-in, the admin passcode, rate limits, headers and database access keep the site safe, and how to change them without opening a hole.

## Leader sign-in

| Step | Where | What happens |
|---|---|---|
| 1 | `/login` → `POST /api/auth/request-code` | Sends a one-time code (OTP: a short code by email) through Supabase Auth, **only** if the email is in `leaders`. The answer is the same either way, so nobody can test which emails are leaders |
| 2 | `/login`, `verifyCode()` in `lib/client/auth.ts` | The browser checks the code with Supabase. supabase-js keeps the session in `localStorage` |
| 3 | Every leader API call | `leaderFetch` sends `Authorization: Bearer <access token>` |
| 4 | `requireLeader(request)`, first line of every leader route | Verifies the token with Supabase, takes the **verified** email, looks it up in `leaders` |

- `avenue_auth_session` in localStorage is a display cache (name for the header). The server never trusts it.
- The caller's email only ever comes from the verified token. A route never reads "who am I" from the body or query.
- `requireLeader` answers: 401 no or expired token, 403 not in `leaders`, 500 auth outage.
- Asking for access (`POST /api/leader-access`) creates a **pending** leader (`full_access = false`). Validated, honeypot field, rate limited, same answer whether or not the email exists, server-made id.

### Full access vs pending

| | Pending (`full_access = false`) | Full access |
|---|---|---|
| Sign in, training, profile, check-ins, My People | ✅ | ✅ |
| Network page | Own node, who sent them, own descendants only | Whole tree |
| Other people's emails in `/api/network` | ❌ | ❌ (emails never leave the server) |
| Leader resources (`/api/leader-resources`) | ❌ 403 | ✅ |
| Workshop sessions, results, clear, AI | ❌ 403 | ✅ |
| Leader emails | ❌ not sent | ✅ |

The check is `auth.leader.fullAccess` inside each route. The page hiding a button is not the protection.

## Admin passcode

The admin page (`/leaders/admin`) unlocks with one shared passcode: the `ADMIN_API_KEY` env var. The owner chose a passcode on purpose. Do not replace it with accounts without asking.

| Part | How |
|---|---|
| Stored | `sessionStorage` key `avenue_admin_key`: this browser tab only, gone when the tab closes |
| Sent | `Authorization: Bearer <passcode>` on every `/api/admin/*` call (`adminFetch`) |
| Checked | `requireAdmin(request)`, first line of every admin route |
| Compared | Both sides hashed with SHA-256, then `crypto.timingSafeEqual` (constant time: response time says nothing about how close a guess was) |
| Lockout | Per IP, per 15-minute window. `RATE.adminFail` says 5, and the database blocks once the count is **over** 5, so 6 wrong tries get through and then that IP gets 429 until the window ends |
| Logging | Failures log `admin auth failed ip=<ip> path=<path>`, successes log the path. The key is never logged |
| On 401 | The browser clears the stored passcode and shows the sign-in form again |

Before the key check, `requireAdmin` confirms `SUPABASE_SERVICE_ROLE_KEY` really is a service role key, and returns a clear 500 if not.

## Rate limits

All limits live in `RATE` in `src/lib/server/rateLimit.ts`. Change them there, not at the call site. Counters are in the `rate_limits` table, via the `rate_limit_hit` and `rate_limit_blocked` database functions. If the limiter itself fails, the request fails (500); it never silently lets traffic through.

| Rule | Limit | Keyed by | Used on |
|---|---|---|---|
| `form` | 30 per 10 min | IP | `POST /api/forms/[type]`, `POST /api/apest-results` |
| `formRecipient` | 3 per hour | Visitor's email | The confirmation email for those forms (skipped, not refused, when over) |
| `signup` | 5 per hour | IP | `POST /api/leader-access` |
| `openai` | 60 per hour | IP | `POST /api/apest-results` when it calls OpenAI |
| `workshopCode` | 300 per 10 min | IP | `/api/workshops/validate-code` |
| `workshopSubmit` | 200 per 10 min | IP | `/api/workshops/submit` |
| `adminFail` | 5 per 15 min (6 in practice, see above) | IP | Wrong admin passcodes (`requireAdmin`) |
| `crossingScore` | 60 per 10 min | IP | `POST /api/crossing-scores` (the Vision page game only sends a score that makes the top 10) |

- Per-IP limits are sized for a room, not a person: at church or an in-room workshop everyone shares the venue's one IP.
- The IP comes from Netlify's `x-nf-client-connection-ip` header, which a visitor cannot fake (`lib/server/clientIp.ts`).
- Sign-in codes are also rate limited by Supabase Auth itself (it answers 429).

## Other protections

- **Public forms** (`POST /api/forms/[type]`): the server picks every recipient. The admin copy goes to a fixed address; the visitor copy goes only to the one validated address in the form. Fixed templates, every value escaped, size caps, a honeypot field.
- **APEST results**: the email text is signed on the server (HMAC) when shown, and checked when sent, so a visitor cannot put their own text in an Avenue email.
- **Errors**: callers get a generic message; the real cause goes to the server log (`serverError` in `lib/server/http.ts`).
- **Admin-entered URLs** must be `https:`. Leader avatars must be `data:image/(png|jpeg|webp);base64,`.
- **Leader resources** in `private/` are served only through the leader API, with a path check that stops `../` escapes.
- **Unsubscribe links** (`/api/email/unsubscribe`) carry a random token only. GET shows a button and writes nothing (mail scanners open links); POST turns emails off. This URL is inside sent emails: never move it.

## Security headers and CSP

Set for every path in `next.config.ts` from `src/lib/server/securityHeaders.ts`. Netlify ignores `netlify.toml` headers for pages Next renders, so this is the only place.

| Header | Value |
|---|---|
| `Strict-Transport-Security` | 2 years, subdomains |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation, payment, usb all off |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` |
| `Content-Security-Policy` | Enforced (not report-only). Built by `buildCsp()` |

The CSP (content security policy: the list of places the browser may load from) is static, with no nonce, so pages stay statically rendered. That means `'unsafe-inline'` for scripts and styles. The origin lists are the real protection.

### Adding a new external origin

1. Find the directive: a script is `script-src`, an image `img-src`, a `fetch` or beacon `connect-src`, an iframe `frame-src`, a font `font-src`.
2. Add the origin to that list in `ORIGINS` in `securityHeaders.ts`, with a short comment saying what uses it.
3. Update `securityHeaders.test.ts`.
4. Run `npm run build && npm start` and open every page that uses it. The browser console shows any CSP block.

The Supabase origin (and its `wss://` twin) is added from `NEXT_PUBLIC_SUPABASE_URL`. Dev mode alone adds `'unsafe-eval'`.

## The anon key after 018

Today the anon key still has old grants and five public read policies, kept so the old live code works until the push. `supabase/migrations/018_post_push_lockdown.sql` removes them. After it runs:

- The anon and authenticated roles have no access to any table, sequence or function in `public`.
- Every table has RLS on and no policies.
- **The anon key can do nothing but sign in.** Leaking it exposes no data.

The service role key is the key to everything. It lives only in server env vars. Never give it a `NEXT_PUBLIC_` prefix.
