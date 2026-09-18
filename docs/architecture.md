# Search Market Intelligence Architecture

## Goal

Continuously research global software markets and store evidence-backed opportunities in PostgreSQL so scores can evolve over time.

## Database model

- `research_runs`: one row per manual/daily execution, with counts and report path.
- `search_queries`: exact queries, strategy, geography, and result counts.
- `sources`: deduplicated evidence sources by URL with credibility score.
- `market_signals`: atomic evidence items: complaint, competitor, regulation, pricing, freelance demand, arbitrage signal, etc.
- `opportunities`: deduplicated opportunity records with lifecycle status and product thesis.
- `opportunity_signal_links`: many-to-many links from evidence to opportunities.
- `competitors`: product/price/positioning/weakness data per opportunity.
- `competitor_sources`: URLs where each competitor was found or validated, so every opportunity can show competitor names plus search/research sources.
- `opportunity_scores`: immutable score history using the required 100-point model.
- `rejected_ideas`: rejected concepts and reasons, kept as intelligence.
- `research_backlog`: follow-up research tasks for future daily runs.
- `research_instructions`: active research rules/instructions that explain how opportunities are discovered, filtered, scored, rejected, and reported.
- `latest_opportunity_scores`: view for current ranking.

## Lifecycle

`DISCOVERED -> RESEARCHING -> WATCHLIST -> PROMISING -> HIGH_PRIORITY`, or `REJECTED/ARCHIVED`.

## Deduplication

Each opportunity has a `dedupe_key` based on market + customer + core pain. New evidence is attached to an existing opportunity when it supports the same buyer/pain/job-to-be-done.

## First-run note

The first smoke test created simple `search_runs`/`opportunities` tables. The production schema now uses `research_runs`, `market_signals`, and the normalized tables above. The legacy table name conflict is avoided by using the richer `research_runs` table and expanding `opportunities` in place.
