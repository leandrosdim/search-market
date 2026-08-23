# AGENTS.md — search-market

Guidance for OpenCode and other coding agents working in this repository.

## Project purpose

`search-market` is a software-market opportunity intelligence system.

It continuously researches global software/product opportunities, stores evidence in PostgreSQL, scores opportunities, and exposes the results through a Next.js dashboard.

Primary user goal: discover evidence-backed software opportunities that a capable developer/team could realistically monetize to roughly €2,000–€5,000+ MRR.

## Current stack

- Next.js `16.3.2` App Router
- React `19.2.8`
- TypeScript
- Tailwind CSS v4
- Raw PostgreSQL via `pg`
- Python helper/research scripts using `psycopg`
- Existing `.env` file contains the PostgreSQL connection string

## Important project paths

- Dashboard app:
  - `app/page.tsx`
  - `app/layout.tsx`
  - `app/globals.css`
- DB/dashboard access:
  - `lib/db.ts`
  - `lib/dashboard.ts`
- Python research/database scripts:
  - `scripts/config.py`
  - `scripts/migrate.py`
  - `scripts/report.py`
  - `scripts/first_research_run.py`
  - `scripts/populate_opportunity_summaries.py`
- Docs/reports:
  - `docs/architecture.md`
  - `reports/`
- Data snapshots:
  - `data/`

## Non-negotiable rules

1. **Do not expose secrets.**
   - Never print, copy, commit, or summarize the actual `.env` connection string.
   - It is OK to say whether `DATABASE_URL`/Postgres connection is present.
   - Do not paste `.env` values into prompts, docs, logs, screenshots, or reports.

2. **Use the existing `.env`.**
   - The project intentionally supports either:
     - `DATABASE_URL=postgresql://...`, or
     - a raw `postgresql://...` line in `.env`.
   - Preserve this behavior in both Python and Next.js code.

3. **Use raw SQL.**
   - Do not add Prisma, Drizzle, TypeORM, Sequelize, or another ORM/query builder.
   - Keep database access explicit and easy to inspect.
   - If adding writes/mutations, use explicit transaction handling.

4. **Preserve the scoring model.**
   Do not change the 100-point scoring model unless the user explicitly asks.

   Current score components:
   - Pain severity: 20
   - Evidence of demand: 20
   - Willingness to pay: 15
   - Competition gap: 15
   - Solo/small-team feasibility: 10
   - Time to MVP: 5
   - Recurring revenue potential: 5
   - Distribution/customer acquisition: 5
   - Builder technical fit: 5

5. **Every opportunity needs a plain-language summary.**
   - The `opportunities.summary` column is required for dashboard readability.
   - Write summaries for a non-specialist user.
   - Explain what the opportunity is about in simple language.

6. **Deduplicate opportunities.**
   - Before creating a new opportunity, check existing opportunity records.
   - If the same buyer/pain/product thesis already exists, attach new evidence instead of creating duplicates.

7. **Current research focus.**
   - Do not over-focus on EU/Greece regulatory arbitrage.
   - Prioritize products/SaaS/apps/tools already working in the US or other mature markets but weak, absent, expensive, or poorly localized in Greece/EU.
   - Ask: “What is already working extremely well elsewhere but has not been properly brought to Greece or Europe?”
   - Regulatory signals are allowed only when they materially support a broader product opportunity.

8. **Do not push to git unless the user explicitly asks in the current conversation.**

## Database model overview

See `docs/architecture.md` for the detailed model.

Important tables/views:

- `research_runs`
- `search_queries`
- `sources`
- `market_signals`
- `opportunities`
- `opportunity_signal_links`
- `competitors`
- `opportunity_scores`
- `rejected_ideas`
- `research_backlog`
- `research_instructions`
- `latest_opportunity_scores`

Lifecycle statuses:

`DISCOVERED`, `RESEARCHING`, `WATCHLIST`, `PROMISING`, `HIGH_PRIORITY`, `REJECTED`, `ARCHIVED`

## Dashboard expectations

The dashboard should remain:

- clear for a non-technical user;
- visually polished and readable;
- mobile-responsive;
- useful for quickly understanding which opportunities are most promising;
- connected to the live Postgres data, not hardcoded static data.

When changing dashboard UI, preserve or improve:

- top summary card;
- stats cards;
- ranked opportunity cards;
- plain-language summaries;
- recent research runs;
- validation backlog;
- evidence signals.

## Verification commands

Before reporting completion after code changes, run:

```bash
npm run lint
npm run typecheck
npm run build
npm audit
```

If Python database scripts were changed, also run:

```bash
. .venv/bin/activate
python scripts/migrate.py
python scripts/report.py
```

If dashboard behavior changed, run the app and browser-check it:

```bash
npm run dev
```

Then open the local URL and verify the page renders without console errors.

## OpenCode usage guidance

For bounded OpenCode tasks, use a single scoped prompt and stop after the task.

Preferred command pattern for Leandros:

```bash
opencode run --agent build --model ollama-cloud/glm-5.1 "$(cat /tmp/search-market-task.md)"
```

For UI/UX/dashboard tasks, use the globally installed OpenCode skills when useful:

- `claude-design` before implementation for design direction
- `popular-web-designs` for modern dashboard/layout inspiration without cloning
- `humanizer` for readable user-facing text

Do not let OpenCode continue into unrelated future tasks. After each task, report:

1. Files created/modified
2. What changed
3. Assumptions/decisions
4. Verification commands and results
5. Any remaining risks or suggested next step

## Common pitfalls

- Do not hardcode database values or credentials.
- Do not break support for raw-postgres-line `.env` files.
- Do not replace the evidence-backed system with generic startup-idea generation.
- Do not inflate opportunity scores.
- Do not create duplicate opportunity records for the same underlying product thesis.
- Do not add an ORM for convenience.
- Do not rely only on build success for browser-facing UI changes; browser-verify when possible.
