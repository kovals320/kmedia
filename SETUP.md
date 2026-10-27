# How this app was built (and how to build another one like it)

A full record of the `media.kneapps.fyi` project, written so a new conversation (or a new person)
can rebuild it, or clone it for another family/domain, without the original chat.

> **kmedia (Kibbutz Nir Eliyahu) copy:** cloned from `kovals320/media` on 2026-10-17. Domain `media.kneapps.fyi`,
> Supabase shared project `home` with prefix `kmedia_`, its own Immich server (`kne-media`, 192.168.1.144).
> Sections 3, 4 and 7 describe THIS deployment. Section 11 records how it was set up.

> **Starting a new conversation with this file:** read sections 10 (how Dor likes to work), 9 and 12 (gotchas),
> and 3 (accounts). The code itself is in the public repos `kovals320/kmedia` and `kovals320/media`:
> clone them to read or copy code. For a NEW app, pick a new table prefix that is not taken (section 12).

---

## 1. What the app is

A public, read-only media site for Kibbutz Nir Eliyahu (site name `קיבוץ ניר אליהו - מדיה`) (Hebrew, right-to-left, mobile-first):

- **Home**: two tiles, Photos and Films, each with a live total.
- **Photos**: read from a home **Immich** server. One tile per year (newest first), year page is one
  continuous grid (newest photo first), full-screen viewer with swipe, sideways full screen and share links.
- **Films**: read from **YouTube playlists**. All playlists are merged into one list (duplicates removed),
  grouped by the year written in the title, in-app player, share links.
- **Admin** (`/login`, one admin only, no sign-up): add/remove playlists, set display titles for films,
  "refresh content" button, report of photos stored in another year's folder.
- Anyone with the link can view. Nobody but the admin can change anything. Hidden from search engines.

## 2. Architecture

```
GitHub repo ──push──> Vercel (Next.js) ──> media.kneapps.fyi   (Cloudflare DNS: CNAME, DNS only / grey cloud)
                           │
                           ├── Supabase (shared project "home"): playlists, display titles, admin list, admin login
                           ├── YouTube Data API (server-side key): playlist contents
                           └── Immich at photos.kneapps.fyi (Cloudflare Tunnel to the home server, read-only API key)
                                 └── photos are served through the app: /api/photo/[id]/thumb|full (cached on Vercel's CDN)
```

Stack: Next.js 16 (App Router, TypeScript), Tailwind v4, `@supabase/ssr`, fonts Secular One + Assistant.

**Colors** are defined once in `src/app/globals.css` (`@theme`) and used everywhere through the token names
(`paper`, `ink`, `muted`, `sun`, `sun-deep`, `lake`, `lake-deep`, `print`), so a copy gets its own look by editing that block
(plus `themeColor` in `layout.tsx`, the dark viewer background `bg-[#...]` in `VideoBrowser.tsx` / `YearView.tsx`,
and the three gradient "prints" on the home page `src/app/(app)/page.tsx`).

| Token | media (family) | kmedia (kibbutz) |
|---|---|---|
| `paper` (background) | `#f6f7f2` cool off-white | `#f4efe3` wheat cream |
| `ink` (text) | `#1d2b36` navy | `#23301f` dark olive |
| `muted` | `#66737e` | `#62675b` |
| `sun` / `sun-deep` (Photos tile, warm accent) | `#f2c14e` / `#e0a526` yellow | `#e08a54` / `#c56f3b` clay |
| `lake` / `lake-deep` (Films tile, buttons) | `#2f5d8c` / `#234a72` blue | `#3f6b3a` / `#2f5430` field green |
| `print` | `#fffdf7` | `#fffcf2` |
| viewer background | `#0d1620` | `#111a12` |

**Install as an app (PWA):** `src/app/manifest.ts` (name, short name `מדיה ניר אליהו`, colors), icons in `public/`
(`icon-192/512.png`, `icon-maskable-512.png`, `apple-touch-icon.png`, `favicon-32.png`: two tilted tiles, clay with a photo
mark and green with a play mark), `public/sw.js` (does nothing but make it installable; caches nothing, so content is always fresh),
and `src/components/InstallPrompt.tsx`: a banner on phones only. Android/Chrome gets an "התקנה" button; iPhone gets
"Share → Add to Home Screen" instructions (Safari has no install API). "Not now" hides it for 14 days (localStorage);
never shown inside the installed app. A copy for another site must redraw the icons and change the names.

Keep text contrast at least 4.5:1 (checked for kmedia: ink/paper 12.1, white/lake 6.2, ink/sun 5.2).

**Speed (2026-10-27):** functions run in Frankfurt (`vercel.json` → `"regions": ["fra1"]`, next to Supabase eu-central-1;
the Vercel default was Washington, which made every request cross the Atlantic). The home page is cached (ISR, 30 min,
refreshed right away by admin changes); the "ניהול / יציאה" links are checked in the browser (`AdminLinks.tsx`) so no
cookie makes it dynamic. Playlists and display titles are read without cookies and cached (tag `kmedia-videos-db`,
cleared by every admin change). Don't add `cookies()` / `getViewer()` to the home page or it becomes slow again.

## 3. Accounts and where things live

| Service | What | Notes |
|---|---|---|
| GitHub | `kovals320/kmedia` | Vercel deploys every push to `main` |
| Vercel | team "Apps" (`apps-2265`), project `kmedia` | The Vercel connector in Claude gets 403 on this team, so import, env vars and domain are done in the browser. Do NOT add the Supabase integration offered on import |
| Cloudflare | zone `kneapps.fyi` | `media` CNAME to Vercel (DNS only). `photos` = Cloudflare Tunnel `kne-immich` to Immich |
| Supabase | shared project `home` (`pjujibzoscawmstarerz`) | Shared with other apps, so **every table/function/bucket uses the `kmedia_` prefix** |
| Immich | home server `kne-media`, `192.168.1.144`, user `kne`, Ubuntu + Docker | Immich v3, port 2283. SSH: `ssh kne@192.168.1.144` |
| YouTube | kibbutz playlist(s) | Videos and playlists must be **Unlisted** (not Private). API key from Google Cloud project `media-dorh` (shared with the media site) |

## 4. Environment variables (Vercel, all environments)

| Name | Type | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Config | `https://<project>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | Supabase publishable key (`sb_publishable_...`) |
| `YOUTUBE_API_KEY` | **Secret** | Google Cloud key restricted to YouTube Data API v3, no application restriction |
| `IMMICH_URL` | Config | `https://photos.kneapps.fyi` |
| `IMMICH_API_KEY` | **Secret** | Immich key with read-only permissions (see 7) |

`/api/health` checks Supabase, YouTube and Immich.

## 5. Supabase schema (prefix `kmedia_`)

Run as one migration in a new project (change the admin email):

```sql
-- Admins who can sign in and edit (everyone else views publicly). Locked: change only via SQL.
create table public.kmedia_members (
  email text primary key check (email = lower(email)),
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);
alter table public.kmedia_members enable row level security;
insert into public.kmedia_members (email, display_name, role) values ('dor@kne.org.il', 'דור', 'admin');

create or replace function public.kmedia_is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kmedia_members where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
create or replace function public.kmedia_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kmedia_members
                 where email = lower(coalesce(auth.jwt() ->> 'email', '')) and role = 'admin');
$$;
revoke execute on function public.kmedia_is_member() from public, anon;
revoke execute on function public.kmedia_is_admin() from public, anon;
grant execute on function public.kmedia_is_member() to authenticated;
grant execute on function public.kmedia_is_admin() to authenticated;

create policy "kmedia_members read by members" on public.kmedia_members
  for select to authenticated using (public.kmedia_is_member());
create policy "kmedia_members locked" on public.kmedia_members
  for all to authenticated using (false) with check (false);

-- YouTube playlists (sources only; all videos are merged)
create table public.kmedia_playlists (
  id uuid primary key default gen_random_uuid(),
  youtube_playlist_id text not null unique,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.kmedia_playlists enable row level security;
create policy "kmedia_playlists public read" on public.kmedia_playlists
  for select to anon, authenticated using (true);
create policy "kmedia_playlists managed by admins" on public.kmedia_playlists
  for all to authenticated using (public.kmedia_is_admin()) with check (public.kmedia_is_admin());

-- Display titles set in the app (e.g. add a year to a video from another channel). YouTube unchanged.
create table public.kmedia_video_titles (
  video_id text primary key check (video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  title text not null check (length(trim(title)) > 0),
  updated_at timestamptz not null default now()
);
alter table public.kmedia_video_titles enable row level security;
create policy "kmedia_video_titles public read" on public.kmedia_video_titles
  for select to anon, authenticated using (true);
create policy "kmedia_video_titles managed by admins" on public.kmedia_video_titles
  for all to authenticated using (public.kmedia_is_admin()) with check (public.kmedia_is_admin());

-- Site switches set on the admin page (added 2026-10-24, migration kmedia_settings).
create table public.kmedia_settings (
  key text primary key check (key ~ '^[a-z_]{1,40}$'),
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.kmedia_settings enable row level security;
create policy "kmedia_settings public read" on public.kmedia_settings
  for select to anon, authenticated using (true);
create policy "kmedia_settings managed by admins" on public.kmedia_settings
  for all to authenticated using (public.kmedia_is_admin()) with check (public.kmedia_is_admin());
insert into public.kmedia_settings (key, value) values ('show_people', 'false'::jsonb);
```

Supabase Auth: add `https://<domain>/**` to **Authentication → URL Configuration → Redirect URLs**
(do not change the Site URL if the project is shared), so password-reset links come back to this app.
The admin signs in with an existing Supabase user (email + password). There is no sign-up in the app.

## 6. YouTube

- Playlists (and the videos in them) must be **Unlisted** or Public. Private ones can't be read with an API key and are skipped.
- **Sorting** = the year written in the title (`1950–2099`, anywhere in the title). Titles without a year come first.
  Within a year, alphabetically by title (the year itself is ignored), then by upload date. YouTube keeps no "filmed on" date (it strips file metadata; "Recording date" is usually empty).
- The app removes duplicates by video ID. YouTube's playlist count includes duplicates and private videos, so it is often higher.
  Bulk "Add to playlist" in YouTube Studio adds duplicates; a clean way is to create a fresh playlist from Studio → Content → select all → Add to playlist → new.
- Videos from other channels: save them to one of your playlists. If the title has no year, set a display title on the admin page.
- Results are cached 30 minutes (tag `youtube`); the admin "refresh content" button clears it.
- **Search** on the Films page (in the browser, no server call): every word must appear in the title. Hebrew is matched loosely:
  no niqqud, final letters = regular letters (סרטון finds סרטונים), quotes ignored (טו = ט"ו). Next/previous in the player move through the results.

## 7. Immich (photos)

**Server layout**
- Photos live on the server in `/home/kne/Pictures/<year>/...` (1964–2022, ~34,300 photos, ~100 GB), mounted **read-only** into Immich:
  `- ${EXTERNAL_PATH}:/usr/src/app/external:ro` in `~/immich-app/docker-compose.yml`, with `EXTERNAL_PATH=/home/kne/Pictures` in `~/immich-app/.env`.
- One **External Library per year**, named exactly the year (`1964`, `1965`, ...), import path `/usr/src/app/external/<year>`.
  The app only shows external libraries whose name is a year, so phone-backup uploads stay private.
  `~/Pictures` also has `README.txt`, `exiftool.exe` and `exiftool_files/`; they are not in any library.
- A new year folder needs a new library: Administration → External Libraries → Create, name = the year,
  import path `/usr/src/app/external/<year>`, then scan.

**Users**: one admin user that owns the libraries. Photos belong to the user who owns the library; deleting a user deletes its photos.
To switch the admin's email, edit the existing user's email (don't create a new user and delete the old one).

**API key for the app** (Account Settings → API Keys): read-only permissions only:
`asset.read`, `asset.view`, `library.read`, `timeline.read`, `person.read` (plus `library.statistics` optional). Nothing with update/delete/upload.

**Cloudflare Tunnel** (Cloudflare dashboard → Networking → Tunnels → Create tunnel, type Cloudflared):
```bash
sudo docker run -d --name cloudflared --restart unless-stopped cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --token <token from the Cloudflare page>
```
Then Configure → Routes → Add published application: subdomain `photos`, domain `kneapps.fyi`, service `http://192.168.1.144:2283`.
(Use the server's LAN address, not `localhost`: cloudflared runs in its own container.) Tunnel name `kne-immich`, container name `cloudflared`.

**Second cloudflared on this server (found 2026-10-27):** besides the Docker container, a systemd service `cloudflared`
(apt package from Cloudflare's repo, token in `/etc/cloudflared/token`) runs a DIFFERENT tunnel, ID `6ca1f407-...`.
Its purpose is not yet known (check its routes in the dashboard); don't remove it until it is. It is updated by
`apt upgrade` (2026.10.4 on 2026-10-27) and restarted automatically by needrestart.

**Server maintenance** (Ubuntu 26.04 LTS): security updates install automatically (unattended-upgrades is on).
About once a month: `sudo apt update && sudo apt upgrade -y` (keep existing config files if asked). Docker updates restart
the containers (about a minute of downtime; they come back by themselves). Check afterwards with
`sudo docker ps` (all healthy) and `[ -f /var/run/reboot-required ] && echo reboot`. "Deferred due to phasing" = wait, nothing to do.
Immich is NOT updated by apt: update its Docker images separately, only after reading its release notes.

**Updating cloudflared** (done 2026-10-27 to 2026.10.3 after Cloudflare's eMudhra certificate notice; the container now uses a
pinned version tag, not `latest`). Restarting the old container is NOT enough: pull the new image and recreate the container.
The token is taken from the running container (it is argument 5), never typed or shown. About 5–10 s of downtime.
```bash
V=2026.10.3   # the version Cloudflare asks for
sudo docker pull cloudflare/cloudflared:$V
TOKEN=$(sudo docker inspect cloudflared --format '{{index .Args 5}}')
if [ ${#TOKEN} -gt 100 ] && [ "${TOKEN:0:3}" = "eyJ" ]; then
  sudo docker stop cloudflared && sudo docker rename cloudflared cloudflared-old && \
  sudo docker run -d --name cloudflared --restart unless-stopped cloudflare/cloudflared:$V tunnel --no-autoupdate run --token "$TOKEN"
else echo "token not found, nothing changed"; fi; unset TOKEN
sudo docker logs cloudflared 2>&1 | grep -c "Registered tunnel connection"   # expect 4
sudo docker rm cloudflared-old && sudo docker rmi cloudflare/cloudflared:<old tag>
```
(If `index .Args 5` is not the token, list positions and lengths with
`sudo docker inspect cloudflared --format '{{range $i,$a := .Args}}{{$i}}: {{len $a}}{{"\n"}}{{end}}'`.)
(Free plan limits each upload through the tunnel to 100 MB; upload large files from inside the home network.)

**People (faces)** (`getPeople` / `getPersonPhotos` in `src/lib/immich.ts`): needs `person.read` on the app's API key.
- Only people who were given a **name** in Immich (Explore → People) and are not hidden appear; unnamed faces are never shown,
  and `/api/person/[id]` refuses their face pictures. Only photos from the year folders are counted and shown.
- Photos page: an "אנשים" row (most photos first) above the years; `/photos/people`: everyone A–Z with a search box (13+ people);
  `/photos/people/<id>`: that person's photos, newest first, same viewer and share links as a year.
- The face picture is the one chosen in Immich; it updates (new address `?v=`) when changed there. Cached 1 hour like the rest.
- **Off by default.** Switch on the admin page ("אנשים בעמוד התמונות"), stored in Supabase table `kmedia_settings`
  (`show_people`, public read, admin write; `src/lib/settings.ts`, cached 1 hour, cleared when the switch changes).
  When off: no row on the Photos page, `/photos/people*` is 404, and face pictures are refused. If the setting
  can't be read, it counts as off. When on, it is public like the rest of the site.

**How the app dates photos** (`src/lib/immich.ts`)
1. A camera wrote real capture info (EXIF make/model present): Immich's date.
2. Otherwise, a date in the file name: WhatsApp `IMG-YYYYMMDD-WA####`, Pixel `PXL_YYYYMMDD_HHMMSS`, `IMG_YYYYMMDD_HHMMSS`, screenshots...
   (WhatsApp strips EXIF, so Immich would otherwise use the copy date.) Switch: `USE_FILENAME_DATES`.
3. Otherwise Immich's date. The year a photo appears under = the year of that date (folder only if no date).
- Year covers: photos marked **favorite (heart)** in Immich; several in a year rotate daily. No heart: a fixed photo.
- Lists cached 1 hour (tag `immich`); the admin "refresh content" button clears it.

**Day-to-day routine**
- Add photos: copy into the year folder (`scp "C:\path\*" kne@192.168.1.144:/home/kne/Pictures/2022/`), Immich → Administration →
  External Libraries → **Scan All Libraries**, then "refresh content" in the app.
- Remove photos from the site permanently: delete in Immich, run `~/hide-deleted.sh` (answer lowercase `y`), then scan.
- Bring back a photo deleted in the past: empty Immich's trash first (or restore it), then copy the file back and scan.
  (Otherwise Immich still sees it as trashed, and `hide-deleted.sh` would move it out again.)

**`~/hide-deleted.sh`** (moves files that are in Immich's trash out of the scanned folder, so a scan can't bring them back):
```bash
#!/bin/bash
SRC=/home/kne/Pictures
DEST=/home/kne/Pictures-hidden
LIST=$(mktemp)
sudo docker exec immich_postgres psql -U postgres -d immich -At -c "select \"originalPath\" from asset where \"deletedAt\" is not null and \"originalPath\" like '/usr/src/app/external/%';" \
  | sed 's#^/usr/src/app/external/##' \
  | while IFS= read -r f; do if [ -f "$SRC/$f" ]; then printf '%s\n' "$f"; fi; done > "$LIST"
COUNT=$(wc -l < "$LIST")
if [ "$COUNT" -eq 0 ]; then echo "No new deleted photos to move."; rm -f "$LIST"; exit 0; fi
echo "Found $COUNT deleted photos still in the photos folder:"
cut -d/ -f1 "$LIST" | sort | uniq -c
read -r -p "Move them to $DEST? (y/n) " ok
if [ "$ok" != "y" ]; then echo "Nothing moved."; rm -f "$LIST"; exit 0; fi
rsync -a --remove-source-files --files-from="$LIST" "$SRC/" "$DEST/"
echo "Moved $COUNT photos. Now run 'Scan All Libraries' in Immich."
rm -f "$LIST"
```

(`hide-deleted.sh` is not installed on this server yet; create it from the block above when first needed.)

**Backup** to an external disk (NTFS, mounted at `/mnt/backup`, into its own folder only):
```bash
sudo mkdir -p /mnt/backup && sudo mount /dev/sda1 /mnt/backup
sudo mkdir -p /mnt/backup/family-media-backup/immich-app
sudo rsync -rt --info=progress2 /home/kne/Pictures /home/kne/Pictures-hidden /mnt/backup/family-media-backup/
sudo cp ~/immich-app/docker-compose.yml ~/immich-app/.env /mnt/backup/family-media-backup/immich-app/
sudo cp ~/hide-deleted.sh /mnt/backup/family-media-backup/
```

## 8. Cloning this project for another family / domain

1. **GitHub**: Dor creates the repo in the browser (github.com/new, owner `kovals320`, **empty**: no README/.gitignore/license).
   Claude attaches it with push access, copies this code (everything except `.git`) and pushes to `main`.
2. **Change in the code**:
   - Hebrew site name `קיבוץ ניר אליהו - מדיה` (home title, `layout.tsx` metadata, page titles).
   - Admin email in the Supabase migration.
   - Table prefix if sharing a Supabase project with this app (e.g. `media2_`): rename tables/functions in SQL **and** in the code
     (`grep -rn "kmedia_" src`). With a new, separate Supabase project the prefix can stay.
   - `src/lib/immich.ts`: library names must still be years; adjust if the other server is organised differently.
   - Colors: the `@theme` block (section 2), so it doesn't look identical to the other sites.
   - `package.json` name, README title.
3. **Supabase**: new project (or the shared one with a new prefix) → run the SQL in section 5 → add the redirect URL.
4. **Vercel**: import the repo (team Apps), add the 5 environment variables (section 4), **skip the Supabase integration** it offers, Deploy.
5. **Cloudflare**: on the other domain, add the Vercel domain in Vercel, then the CNAME it asks for (DNS only).
   Create a new tunnel for the other Immich server (`photos.<other domain>`).
6. **Immich on the other computer**: external libraries per year, read-only mount, read-only API key.
7. **YouTube**: Unlisted playlist(s), add them on the admin page, YouTube API key (can reuse a key or create a new one).
8. Check `/api/health`, then the home page, Photos and Films.

## 9. Lessons and gotchas from building it

- The sandbox couldn't reach the npm registry, so the starter was written by hand; Vercel installs packages at build time.
- The Vercel connector returned 403 for the team, so project import/domain were done in the browser.
- Destructive SQL (dropping tables) through the Supabase connector was cancelled twice; the user deleted them in the dashboard.
- Storage policies on `storage.objects` can't be altered by migrations here (`must be owner`).
- Hebrew: "סרטון" ends with a final nun (ן) while "סרטונים" has a regular nun (נ), so a search for one doesn't match the other.
- Play icons are not mirrored in RTL. Swiping right = next photo (like turning a Hebrew page).
- Never type passwords or secret keys for the user; they paste keys into Vercel themselves (Secret type).

## 10. Working preferences of the owner (Dor)

- Writes in Hebrew; **replies in English**.
- **One conversation per project.** The kmedia conversation covers only the kibbutz server (`kne@192.168.1.144`);
  the family media site and its server (192.168.1.253) are handled in a separate conversation. Don't mix them.
- Setup work in general: one step at a time, explained, wait for confirmation.
- For server / SSH work: **one step at a time**, wait for the output before the next step.
- For app features: build the whole thing and report when done (don't ask at every step).
- Tables of each project get the project's prefix (`kmedia_` here).

## 11. How the kmedia deployment was set up (2026-10-17)

1. GitHub repo `kovals320/kmedia` created empty; code copied from `media`, renamed (`kmedia_` prefix, site name), pushed.
2. Supabase (`home`): migration `kmedia_initial` = section 5 with the `kmedia_` prefix, admin `dor@kne.org.il` (same Supabase user as media).
   Redirect URL `https://media.kneapps.fyi/**` added.
3. Immich had ONE library `Photos` over the whole folder (no favorites, albums or named people), so it was deleted and
   replaced by one library per year, through the API with a temporary all-permission key (deleted afterwards):
   ```bash
   read -rsp "Paste key: " KEY; echo
   OWNER=<ownerId from GET /api/libraries>
   for y in $(ls ~/Pictures | grep -E '^[0-9]{4}$'); do
     curl -s -o /dev/null -w "$y %{http_code}\n" -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" \
       -d "{\"ownerId\":\"$OWNER\",\"name\":\"$y\",\"importPaths\":[\"/usr/src/app/external/$y\"]}" http://localhost:2283/api/libraries
   done
   for id in $(curl -s -H "x-api-key: $KEY" http://localhost:2283/api/libraries | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
     curl -s -o /dev/null -X POST -H "x-api-key: $KEY" http://localhost:2283/api/libraries/$id/scan
   done
   unset KEY
   ```
   App key `kmedia-app`: read-only permissions (section 7).
4. Cloudflare Tunnel `kne-immich` → `photos.kneapps.fyi` → `http://192.168.1.144:2283`.
5. Vercel project `kmedia` (team Apps), 5 env vars, domain `media.kneapps.fyi` (CNAME, DNS only).
6. Playlist added on the admin page. `/api/health` all connected.

## 12. Shared accounts: what exists, and gotchas for the next app (as of 2026-10-18)

**Supabase project `home` (`pjujibzoscawmstarerz`, eu-central-1) is shared by all of Dor's apps.** Prefixes in use:
`home_`, `sport_`, `sec_`, `shirim3_`, `media_`, `kmedia_`. A new app takes a new, unused prefix for every table,
function, policy and storage bucket. Free Supabase plans allow only 2 active projects, so sharing is the default.
Each app adds its own `https://<domain>/**` under Authentication → URL Configuration → Redirect URLs; never change the Site URL.

**GitHub** `kovals320`: repos `media`, `kmedia`, `sec`, `home`, `sport`, `shirim3`, `ff` (all public).
**Domains** on Cloudflare: `dorh.fyi` (family), `kneapps.fyi` (kibbutz). Sites go on subdomains with a Vercel CNAME, DNS only.
**Google Cloud** project `media-dorh`: YouTube Data API v3 enabled; its API key is used by both media sites.

What worked / didn't from Claude's side (cloud session):
- `gh repo list` and account-wide GitHub API calls are blocked. Public repos can be cloned directly; a new repo must be
  attached (add_repo with push access) before pushing. Claude cannot create GitHub repos; Dor creates them.
- The Vercel connector returns 403 on team Apps (`apps-2265`), so Vercel work (import, env vars, domains, redeploy) is done
  by Dor in the browser; Claude gives exact names/values. Its `search_repo` tool can still list the GitHub repos.
- The Supabase connector works: list tables, apply migrations, read publishable keys.
- The sites block crawlers (robots), so Claude can't fetch `/api/health`; Dor opens it and pastes the result.
- Immich admin work over SSH is easiest through Immich's REST API with a temporary API key read with
  `read -rsp` (never pasted into the chat), deleted at the end. Keys and tokens never go in the chat.
- Cloudflare Tunnel route to Immich must use the server's LAN IP, not `localhost`.
