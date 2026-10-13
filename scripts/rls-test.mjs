import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";

// Runs the real migration + seed in in-process Postgres (no Docker needed) and
// checks the permission rules by acting as each seeded user.
const root = new URL("../supabase/", import.meta.url);
const migrations = readdirSync(new URL("migrations/", root)).filter((f) => f.endsWith(".sql")).sort();
const migration = migrations.map((f) => readFileSync(new URL(`migrations/${f}`, root), "utf8")).join("\n");
const seed = readFileSync(new URL("seed.sql", root), "utf8");
const db = new PGlite({ extensions: { pgcrypto } });

// Minimal stand-in for what Supabase provides before migrations run.
await db.exec(`
  create extension pgcrypto;
  create role anon; create role authenticated; create role service_role;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  create schema auth;
  grant usage on schema auth to authenticated, anon;
  create table auth.users (
    instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
    email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz, confirmation_token text, recovery_token text,
    email_change_token_new text, email_change text);
  create table auth.identities (
    id uuid primary key, user_id uuid, provider_id text, identity_data jsonb, provider text,
    last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create publication supabase_realtime;
`);
await db.exec(migration);
await db.exec(seed);

const U = {
  captain: "00000000-0000-0000-0000-00000000000c",
  anika: "00000000-0000-0000-0000-00000000000a",
  ravi: "00000000-0000-0000-0000-00000000000b",
};
const PRACTICE = "20000000-0000-0000-0000-000000000001";
const RETENTION = "20000000-0000-0000-0000-000000000002";

async function as(user, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${U[user]}', false); set role authenticated;`);
  try {
    return { rows: (await db.query(sql, params)).rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec("reset role");
  }
}

let failures = 0;
function check(name, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + JSON.stringify(detail)}`);
  if (!ok) failures++;
}

let r;
r = await as("anika", "select id from videos order by id");
check("dancer sees practice + own retention", r.rows?.length === 2, r);
r = await as("ravi", "select id from videos");
check("other member sees only the practice video", r.rows?.length === 1 && r.rows[0].id === PRACTICE, r);
r = await as("captain", "select id from videos");
check("captain sees both", r.rows?.length === 2, r);

r = await as("ravi", "select id from comments where video_id = $1", [RETENTION]);
check("other member can't read retention comments", r.rows?.length === 0, r);
r = await as("anika", "select id from comments where video_id = $1", [RETENTION]);
check("dancer reads captain feedback", r.rows?.length === 1, r);

r = await as("anika", "insert into comments (video_id, author_id, t_sec, body) values ($1, $2, 5, 'self') returning id", [RETENTION, U.anika]);
check("dancer can't comment on own retention video", !!r.error, r);
r = await as("captain", "insert into comments (video_id, author_id, t_sec, body) values ($1, $2, 5, 'nice') returning id", [RETENTION, U.captain]);
check("captain comments on retention video", r.rows?.length === 1, r);
r = await as("ravi", "insert into comments (video_id, author_id, t_sec, body, tags) values ($1, $2, 50, 'tagged', $3) returning id", [PRACTICE, U.ravi, [U.anika]]);
check("member posts tagged practice comment", r.rows?.length === 1, r);
r = await as("ravi", "insert into comments (video_id, author_id, t_sec, body) values ($1, $2, 50, 'spoof') returning id", [PRACTICE, U.anika]);
check("can't post as someone else", !!r.error, r);

r = await as("ravi", "update comments set body = 'hacked' where author_id = $1 returning id", [U.anika]);
check("can't edit others' comments", r.rows?.length === 0, r);
r = await as("ravi", "update comments set video_id = $1 where author_id = $2 returning id", [RETENTION, U.ravi]);
check("can't move a comment to another video", !!r.error, r);
r = await as("ravi", "delete from comments where author_id = $1 returning id", [U.anika]);
check("member can't delete others' comments", r.rows?.length === 0, r);

r = await as("ravi", "update profiles set role = 'captain' where id = $1", [U.ravi]);
check("member can't promote themselves", !!r.error, r);
r = await as("ravi", "update profiles set display_name = 'Ravi K' where id = $1 returning id", [U.ravi]);
check("member renames themselves", r.rows?.length === 1, r);
r = await as("ravi", "select set_role($1, 'captain')", [U.ravi]);
check("member can't call set_role", !!r.error, r);
r = await as("ravi", "select email from allowed_emails");
check("member can't read invite list", r.rows?.length === 0, r);

r = await as("ravi", "insert into videos (kind, youtube_id, title, uploaded_by) values ('practice', 'aqz-KE-bpKQ', 'x', $1) returning id", [U.ravi]);
check("member can't create a practice video", !!r.error, r);
r = await as("captain", "insert into videos (kind, youtube_id, title, uploaded_by) values ('practice', 'aqz-KE-bpKQ', 'x', $1) returning id", [U.captain]);
check("captain creates a practice video", r.rows?.length === 1, r);
r = await as("ravi", "insert into videos (kind, youtube_id, title, uploaded_by, subject_id) values ('retention', 'aqz-KE-bpKQ', 'x', $1, $2) returning id", [U.ravi, U.anika]);
check("member can't create retention video for someone else", !!r.error, r);
r = await as("ravi", "insert into videos (kind, youtube_id, title, uploaded_by, subject_id) values ('retention', 'aqz-KE-bpKQ', 'mine', $1, $1) returning id", [U.ravi]);
check("member creates own retention video", r.rows?.length === 1, r);
const raviRet = r.rows?.[0]?.id;
r = await as("anika", "select id from videos where id = $1", [raviRet]);
check("...which other members can't see", r.rows?.length === 0, r);

r = await as("ravi", "insert into video_jathi_marks (video_id, jathi_id, start_sec) select $1, id, 1 from jathis limit 1", [PRACTICE]);
check("non-uploader can't edit jathi marks", !!r.error, r);

r = await as("anika", "select id, kind, comment_count, tagged_me, new_count, captain_comments from my_dashboard() order by kind");
const prac = r.rows?.find((x) => x.id === PRACTICE);
const ret = r.rows?.find((x) => x.kind === "retention");
check("dashboard: practice counts (7 total, 3 tag Anika, 5 new by others)",
  prac && Number(prac.comment_count) === 7 && Number(prac.tagged_me) === 3 && Number(prac.new_count) === 5, r);
check("dashboard: retention has captain feedback", ret && Number(ret.captain_comments) === 2, r);
await as("anika", "insert into video_views (video_id, user_id) values ($1, $2)", [PRACTICE, U.anika]);
r = await as("anika", "select new_count from my_dashboard() where id = $1", [PRACTICE]);
check("dashboard: new count clears after viewing", Number(r.rows?.[0]?.new_count) === 0, r);

try {
  await db.query("insert into auth.users (id, email) values (gen_random_uuid(), 'stranger@gmail.com')");
  check("uninvited signup is blocked", false, "insert succeeded");
} catch (e) {
  check("uninvited signup is blocked", /invite list/.test(e.message), e.message);
}

// a new account (created by a captain's invite) must choose a password before using the app
await db.exec("insert into allowed_emails (email, display_name) values ('newbie@team.test', 'Newbie')");
U.newbie = (await db.query(
  "insert into auth.users (id, email, encrypted_password) values (gen_random_uuid(), 'newbie@team.test', crypt(gen_random_uuid()::text, gen_salt('bf'))) returning id",
)).rows[0].id;
r = await as("newbie", "select password_set from profiles where id = $1", [U.newbie]);
check("new account must still choose a password", r.rows?.[0]?.password_set === false, r);
r = await as("newbie", "update profiles set password_set = true where id = $1", [U.newbie]);
check("can't mark password as set by updating the profile directly", !!r.error, r);
await as("newbie", "select mark_password_set()");
r = await as("ravi", "select password_set from profiles where id = $1", [U.newbie]);
check("mark_password_set sets the caller's flag", r.rows?.[0]?.password_set === true, r);

console.log(failures ?`\n${failures} FAILED` : "\nall passed");
process.exit(failures ? 1 : 0);
