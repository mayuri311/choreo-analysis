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
Magic-link emails go to the local inbox at http://127.0.0.1:54324.

## Tests
- `npm test`: unit tests for comment filtering, jathi timing, and YouTube URL parsing.
- `npm run test:db`: runs the real migration and seed in in-process Postgres (PGlite, no Docker needed) and checks every permission rule as each seeded user.

## Deploying
1. Create a Supabase project and run `npx supabase link` then `npx supabase db push`. Don't run the seed in production.
2. In Supabase → Auth → URL configuration, set the site URL and add `https://<your-domain>/auth/callback` as a redirect URL.
3. Add the first captain: `insert into allowed_emails (email, display_name, role) values ('you@andrew.cmu.edu', 'Your Name', 'captain');`. After that, captains invite everyone else from the **Team** page.
4. Deploy to Vercel with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set.

## Where things are
| | |
|---|---|
| `supabase/migrations/` | schema, permissions (RLS), `my_dashboard()` |
| `lib/filterComments.ts` | the person/jathi filter rules |
| `components/review/` | player hook, timeline, comment list, composer, filters |
| `app/videos/[id]/jathis` | marking where each jathi starts, and who's in the video |
| `app/admin` | invites, roles, songs & jathis (captains only) |
