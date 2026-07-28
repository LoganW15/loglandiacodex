# Loglandia Codex — Deployment Guide

This is a Vite + React project. `src/LoglandiaShell.jsx` is the entire app.

## 1. Add your god portrait images

You already have these from `Loglandia_God_Codex_SITE.zip`. Unzip that and
copy its `images/` folder's *contents* into:

    loglandia-site/public/images/

The code references paths like `/images/aymere_portrait.png`, and anything
in Vite's `public/` folder is served from the site root, so this just works
once the files are there. If an image is missing or misnamed, the site
falls back to a plain placeholder box — it won't break the page.

## 2. Test it locally (optional but recommended)

You'll need Node.js installed (18+). Then, in the `loglandia-site` folder:

    npm install
    npm run dev

This opens a local dev server (usually `http://localhost:5173`) so you can
click through the whole site before deploying anything.

## 3. Put it on GitHub

Netlify deploys best from a Git repo (auto-redeploys every time you push).

    cd loglandia-site
    git init
    git add .
    git commit -m "Loglandia Codex"

Then create a new empty repo on github.com, and push:

    git remote add origin https://github.com/YOUR-USERNAME/loglandia-codex.git
    git branch -M main
    git push -u origin main

(No GitHub account/repo yet? You can also skip Git entirely — Netlify supports
dragging a folder straight into their dashboard. See step 4b below.)

## 4a. Deploy on Netlify (from GitHub — recommended)

1. Go to netlify.com and sign up / log in (free tier is plenty for this).
2. "Add new site" → "Import an existing project" → connect GitHub → pick
   your `loglandia-codex` repo.
3. Netlify should auto-detect the build settings from `netlify.toml`
   already in this project:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Click Deploy. First build takes a minute or two.
5. You'll get a random `something-random.netlify.app` URL immediately —
   fully live. You can rename it (Site settings → Change site name) or
   attach your own domain later (Site settings → Domain management).

## 4b. Deploy on Netlify (drag-and-drop — no GitHub needed)

If you'd rather skip Git entirely:

    cd loglandia-site
    npm install
    npm run build

This creates a `dist/` folder. Go to netlify.com → "Add new site" →
"Deploy manually", and drag that `dist` folder into the browser window.
Done — but note you'll need to repeat this manually every time you want
to update the site, since there's no repo for Netlify to watch.

## 5. Set up Supabase (for the character-saving feature)

The Character Builder's "Save" button and the Player Characters gallery
are already wired to talk to Supabase — they just need real credentials.

1. Go to supabase.com → sign up → "New project." Pick any name/region,
   set a database password (save it somewhere), wait ~2 minutes for it
   to provision.
2. Once it's ready, go to the SQL Editor (left sidebar) and run this,
   exactly as written:

       create table characters (
         id uuid default gen_random_uuid() primary key,
         owner_name text not null,
         data jsonb not null,
         created_at timestamptz default now()
       );
       alter table characters enable row level security;
       create policy "public read" on characters for select using (true);
       create policy "public insert" on characters for insert with check (true);
       create policy "public update" on characters for update using (true);

   (This matches exactly what's already documented in a comment at the
   top of `LoglandiaShell.jsx` — the RLS policies here are wide open,
   which is fine for a small trusted group of ~7 players and not fine
   for a public-facing site with strangers on it.)

3. Go to Project Settings → API. Copy the **Project URL** and the
   **anon public** key (not the service_role key — never expose that
   one in frontend code).
4. Open `src/LoglandiaShell.jsx`, find these two lines near the top:

       const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
       const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

   Replace both placeholder strings with your real values.
5. Commit and push (or re-drag `dist` if you're doing manual deploys).
   Once deployed, "Save" in the Builder and the Player Characters
   gallery will both work for real, shared across everyone who visits
   the site.

## 6. Change the GM password

Also near the top of `LoglandiaShell.jsx`:

    const GM_PASSWORD = "loglandia";

Change this to whatever you want before deploying for real. Note this
is a client-side check only (see the comment above it in the code) —
fine for keeping casual eyes off spoilers, not real security.

## What's already done for you

- All Codex content (races, gods, locations, organizations, characters)
- The Character Builder, Codex, Mechanics, Tales, and Map modules
- Supabase wiring (`supaFetch` helper) — just needs credentials
- A `netlify.toml` with the right build command and a catch-all redirect
  so client-side routing doesn't 404 on refresh
