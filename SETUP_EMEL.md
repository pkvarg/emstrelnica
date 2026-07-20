# Emel — local setup runbook

This is a standalone copy of the `strelnica` reservation system, prepared as a separate
project so the original stays untouched. Source was copied without `node_modules`, `.next`,
`.git`, build artifacts, or the original `.env.local`. A fresh `.env.local` with newly
generated secrets and a `docker-compose.yml` for local Postgres were added.

Stack: Next.js 16 · Drizzle ORM (postgres.js) · next-auth · next-intl (sk/hu) · pg-boss · argon2 · pnpm.

## 0. One-time: re-init git cleanly (do this first)

The initial `git init` was performed from a sandbox whose filesystem could not delete git's
temporary files, so the `.git` created there contains uncleanable garbage objects. Re-init on
your Mac (native filesystem) for a pristine repo:

```bash
cd ~/PW/Emel
rm -rf .git
git init
git add -A
git commit -m "Initial commit: Emel copy of strelnica reservation system"
```

No remote is configured (intentional). Add one later with `git remote add origin …` when ready.

## 1. Start local Postgres (Docker)

```bash
cd ~/PW/Emel
docker compose up -d          # postgres:16, exposed on host port 5433
docker compose ps             # wait until state is "healthy"
```

Host port is **5433** (not 5432) so it won't clash with the original strelnica DB if that's
also running. `DATABASE_URL` in `.env.local` already points at 5433.

## 2. Install dependencies

```bash
corepack enable               # ensures pnpm 10.18 (see package.json packageManager)
pnpm install
```

Node 22 is required (`.nvmrc`). Use `nvm use` if you manage versions with nvm.

## 3. Apply migrations + seed

```bash
pnpm db:migrate               # applies drizzle/0000 … 0016 (17 migrations)
pnpm seed:admin               # creates the admin user
pnpm seed:consent             # seeds cookie/consent defaults
```

## 4. Run the app

```bash
pnpm dev                      # http://localhost:5001
```

## Notes

- `.env.local` holds freshly generated secrets and is git-ignored (never committed).
  `APP_ENCRYPTION_KEY` is a valid 32-byte base64 key.
- `NEXT_PUBLIC_HONO_API_URL` points at `http://localhost:3013` — the external Hono notifier
  (SMS/email). If it isn't running, the app still boots; outbound notifications just won't send.
- To reset the database completely: `docker compose down -v && docker compose up -d` then re-run
  step 3.

## Next phase (not done yet)

Adapting the demo to pitch Hunter Club and EMEL. The key model gap identified: the current
schema treats each range as a single bookable unit, whereas both prospects need **per-lane /
per-box concurrent capacity** (Hunter Club: 8 lanes at 25 m/45 m; EMEL: 6 boxes on the 50 m plus
separate 25 m pistol, shotgun, parkur ranges and event spaces), plus booking add-ons
(instructor, gun rental, ammo).
