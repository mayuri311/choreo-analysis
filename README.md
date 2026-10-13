# Choreo Review

Timestamped peer review for team dance videos. Comments appear along the scrubber SoundCloud-style, grouped by jathi.

- **Practice videos**: everyone in the video comments. A comment is either tagged to people or general. "About me" shows comments tagging you **plus** all general comments. You can also filter by jathi.
- **Retention videos**: only the dancer and captains can see the video, and only captains can comment.

Videos live on YouTube as **unlisted** links. The app stores only the video id, the comments, and the jathi timings.

## Stack
Next.js 16 (App Router, Cache Components) · Tailwind v4 · Supabase (auth, Postgres, row-level security, realtime).

## Local development
Needs Docker for the local Supabase stack.

```bash
npm install
npx supabase start          # prints the API URL + anon key
cp .env.example .env.local  # fill in NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY
npx supabase db reset       # applies migrations + seed
npm run dev
```

Seeded users (password `password123`, use "Sign in with a password"):
`captain@team.test` (captain), plus `anika@`, `ravi@`, `meera@team.test` (members).
Add `SUPABASE_SERVICE_ROLE_KEY` from `npx supabase status` to `.env.local`. Adding members and first-time setup need it.

## Tests
- `npm test`: unit tests for comment filtering, jathi timing, and YouTube URL parsing.
- `npm run test:db`: runs the real migration and seed in in-process Postgres (PGlite, no Docker needed) and checks every permission rule as each seeded user.

## How sign-in works
No emails are sent at any point.
1. A captain adds someone's email on the **Team** page. Their account exists right away, so they can be added to videos and tagged.
2. On their first visit, they choose **First time here?**, enter that email and pick a password.
3. After that they sign in with their password. If they forget it, a captain clicks **reset password** on the Team page, and they set a new one the same way.

Public sign-up is off; accounts are only created by captains. Trade-off: anyone who knows a teammate's email could claim that account before the teammate does. The Team page shows who has set up, and a captain can reset or remove an account if needed.

## Deploying
1. Create a Supabase project and run `npx supabase link` then `npx supabase db push`. Don't run the seed in production.
2. In Supabase → **Authentication → Sign In / Providers**: turn off **Allow new users to sign up**, and leave **Secure password change** off.
3. Deploy to Vercel with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` set. The service role key is secret: it must never get the `NEXT_PUBLIC_` prefix.
4. Make yourself the first captain. If you already have an account, run this in the SQL editor:
   `update profiles set role = 'captain' where email = 'you@andrew.cmu.edu';`
   Otherwise, add your email to `allowed_emails` with role `captain`, then go to **Authentication → Users → Add user**, enter your email and check **Auto confirm**. Then choose **First time here?** on the site. Everyone after that is added from the **Team** page.

## Where things are
| | |
|---|---|
| `supabase/migrations/` | schema, permissions (RLS), `my_dashboard()` |
| `lib/filterComments.ts` | the person/jathi filter rules |
| `components/review/` | player hook, timeline, comment list, composer, filters |
| `app/videos/[id]/jathis` | marking where each jathi starts, and who's in the video |
| `app/admin` | invites, roles, songs & jathis (captains only) |
