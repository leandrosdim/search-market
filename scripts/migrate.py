from __future__ import annotations

import psycopg

from config import load_database_url

SCHEMA_SQL = """
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'opportunities'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'opportunities' AND column_name = 'slug'
    ) THEN
        ALTER TABLE opportunities RENAME TO web_search_opportunities_bootstrap;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS research_runs (
    id BIGSERIAL PRIMARY KEY,
    run_type TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'running',
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    research_duration_seconds INTEGER,
    sources_investigated INTEGER NOT NULL DEFAULT 0,
    searches_performed INTEGER NOT NULL DEFAULT 0,
    signals_collected INTEGER NOT NULL DEFAULT 0,
    new_opportunities INTEGER NOT NULL DEFAULT 0,
    existing_opportunities_updated INTEGER NOT NULL DEFAULT 0,
    rejected_opportunities INTEGER NOT NULL DEFAULT 0,
    report_path TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS sources (
    id BIGSERIAL PRIMARY KEY,
    source_type TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    geography TEXT,
    credibility INTEGER NOT NULL DEFAULT 3 CHECK (credibility BETWEEN 1 AND 5),
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS search_queries (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT NOT NULL REFERENCES research_runs(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    strategy TEXT NOT NULL,
    geography TEXT,
    source_target TEXT NOT NULL DEFAULT 'web',
    result_count INTEGER NOT NULL DEFAULT 0,
    searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS market_signals (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES research_runs(id) ON DELETE SET NULL,
    source_id BIGINT REFERENCES sources(id) ON DELETE SET NULL,
    query_id BIGINT REFERENCES search_queries(id) ON DELETE SET NULL,
    signal_type TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    geography TEXT,
    customer_segment TEXT,
    pain_point TEXT,
    current_solution TEXT,
    willingness_to_pay TEXT,
    credibility INTEGER NOT NULL DEFAULT 3 CHECK (credibility BETWEEN 1 AND 5),
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (url, signal_type)
);

CREATE TABLE IF NOT EXISTS opportunities (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'DISCOVERED' CHECK (status IN ('DISCOVERED','RESEARCHING','WATCHLIST','PROMISING','HIGH_PRIORITY','REJECTED','ARCHIVED')),
    market TEXT NOT NULL,
    geography TEXT,
    customer_segment TEXT NOT NULL,
    problem TEXT NOT NULL,
    current_solution TEXT,
    proposed_product TEXT NOT NULL,
    differentiation TEXT,
    business_model TEXT,
    suggested_pricing TEXT,
    mvp TEXT,
    technical_approach TEXT,
    distribution_first_10 TEXT,
    distribution_100 TEXT,
    risks TEXT,
    why_now TEXT,
    decision TEXT NOT NULL DEFAULT 'WATCH' CHECK (decision IN ('YES','MAYBE — NEEDS VALIDATION','WATCH','NO')),
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity_signal_links (
    opportunity_id BIGINT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    signal_id BIGINT NOT NULL REFERENCES market_signals(id) ON DELETE CASCADE,
    relevance TEXT NOT NULL DEFAULT 'supporting',
    PRIMARY KEY (opportunity_id, signal_id)
);

CREATE TABLE IF NOT EXISTS competitors (
    id BIGSERIAL PRIMARY KEY,
    opportunity_id BIGINT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT,
    positioning TEXT,
    pricing TEXT,
    strengths TEXT,
    weaknesses TEXT,
    recurring_complaints TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (opportunity_id, name)
);

CREATE TABLE IF NOT EXISTS competitor_sources (
    id BIGSERIAL PRIMARY KEY,
    competitor_id BIGINT NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
    source_id BIGINT REFERENCES sources(id) ON DELETE SET NULL,
    source_url TEXT NOT NULL,
    source_title TEXT,
    source_type TEXT,
    context TEXT,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (competitor_id, source_url)
);

CREATE TABLE IF NOT EXISTS opportunity_scores (
    id BIGSERIAL PRIMARY KEY,
    opportunity_id BIGINT NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    run_id BIGINT REFERENCES research_runs(id) ON DELETE SET NULL,
    pain_severity INTEGER NOT NULL CHECK (pain_severity BETWEEN 0 AND 20),
    evidence_of_demand INTEGER NOT NULL CHECK (evidence_of_demand BETWEEN 0 AND 20),
    willingness_to_pay INTEGER NOT NULL CHECK (willingness_to_pay BETWEEN 0 AND 15),
    competition_gap INTEGER NOT NULL CHECK (competition_gap BETWEEN 0 AND 15),
    feasibility INTEGER NOT NULL CHECK (feasibility BETWEEN 0 AND 10),
    time_to_mvp INTEGER NOT NULL CHECK (time_to_mvp BETWEEN 0 AND 5),
    recurring_revenue INTEGER NOT NULL CHECK (recurring_revenue BETWEEN 0 AND 5),
    distribution INTEGER NOT NULL CHECK (distribution BETWEEN 0 AND 5),
    builder_fit INTEGER NOT NULL CHECK (builder_fit BETWEEN 0 AND 5),
    total INTEGER GENERATED ALWAYS AS (pain_severity + evidence_of_demand + willingness_to_pay + competition_gap + feasibility + time_to_mvp + recurring_revenue + distribution + builder_fit) STORED,
    rationale TEXT NOT NULL,
    scored_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rejected_ideas (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES research_runs(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS research_backlog (
    id BIGSERIAL PRIMARY KEY,
    opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','DONE','SKIPPED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_after TIMESTAMPTZ,
    UNIQUE (opportunity_id, task)
);

CREATE TABLE IF NOT EXISTS research_instructions (
    id BIGSERIAL PRIMARY KEY,
    category TEXT NOT NULL,
    instruction TEXT NOT NULL,
    rationale TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'user_prompt',
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (category, instruction)
);

CREATE INDEX IF NOT EXISTS idx_research_instructions_active_priority ON research_instructions(is_active, priority DESC, category);

ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';

DROP VIEW IF EXISTS latest_opportunity_scores;

CREATE OR REPLACE VIEW latest_opportunity_scores AS
SELECT DISTINCT ON (o.id)
    o.id AS opportunity_id,
    o.name,
    o.summary,
    o.status,
    o.market,
    o.customer_segment,
    s.total,
    s.scored_at,
    o.decision
FROM opportunities o
JOIN opportunity_scores s ON s.opportunity_id = o.id
ORDER BY o.id, s.scored_at DESC, s.id DESC;

CREATE INDEX IF NOT EXISTS idx_market_signals_run ON market_signals(run_id);
CREATE INDEX IF NOT EXISTS idx_market_signals_type ON market_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_market_signals_geo ON market_signals(geography);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunity_scores_total ON opportunity_scores(total DESC);
CREATE INDEX IF NOT EXISTS idx_backlog_status_priority ON research_backlog(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_competitors_opportunity ON competitors(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_competitor_sources_competitor ON competitor_sources(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_sources_source_url ON competitor_sources(source_url);

INSERT INTO competitor_sources (competitor_id, source_url, source_title, source_type, context)
SELECT c.id, c.url, c.name, 'competitor_profile', c.positioning
FROM competitors c
WHERE c.url IS NOT NULL AND c.url <> ''
ON CONFLICT (competitor_id, source_url) DO UPDATE SET
    source_title = EXCLUDED.source_title,
    source_type = EXCLUDED.source_type,
    context = EXCLUDED.context;

INSERT INTO competitor_sources (competitor_id, source_id, source_url, source_title, source_type, context)
SELECT DISTINCT c.id, ms.source_id, ms.url, ms.title, ms.signal_type, ms.excerpt
FROM competitors c
JOIN opportunities o ON o.id = c.opportunity_id
JOIN opportunity_signal_links osl ON osl.opportunity_id = o.id
JOIN market_signals ms ON ms.id = osl.signal_id
WHERE c.name <> ''
  AND (
    ms.title ILIKE '%' || c.name || '%'
    OR ms.excerpt ILIKE '%' || c.name || '%'
    OR COALESCE(ms.current_solution, '') ILIKE '%' || c.name || '%'
  )
ON CONFLICT (competitor_id, source_url) DO UPDATE SET
    source_id = COALESCE(EXCLUDED.source_id, competitor_sources.source_id),
    source_title = EXCLUDED.source_title,
    source_type = EXCLUDED.source_type,
    context = EXCLUDED.context;

-- Legacy smoke-test tables from initial bootstrap may exist; keep them harmlessly.
"""


def main() -> None:
    database_url = load_database_url()
    with psycopg.connect(database_url) as conn:
        with conn.transaction():
            conn.execute(SCHEMA_SQL)
    print("Migration complete: ensured persistent opportunity-intelligence schema")


if __name__ == "__main__":
    main()
