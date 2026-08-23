# search-market

Research pipeline for finding digital-services / digital-products opportunities from web search results and storing them in PostgreSQL.

## Current workflow

1. `scripts/migrate.py` creates the raw-SQL intelligence schema.
2. `scripts/first_research_run.py` stores the first research cycle.
3. `scripts/report.py` prints a secret-safe aggregate report.
4. The Next.js dashboard reads the same PostgreSQL database and shows opportunities, summaries, evidence, runs, and backlog.

The local `.env` may contain either `DATABASE_URL=postgresql://...` or a raw `postgresql://...` connection string. Scripts and the Next.js app use the same `.env` and never print the database URL.

## Python research scripts

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python scripts/migrate.py
python scripts/report.py
```

## Dashboard

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Quality gates:

```bash
npm run lint
npm run typecheck
npm run build
npm audit
```
