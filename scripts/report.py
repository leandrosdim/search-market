from __future__ import annotations

import psycopg
from psycopg.rows import dict_row

from config import load_database_url


def main() -> None:
    database_url = load_database_url()
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        totals = conn.execute(
            """
            SELECT
                (SELECT count(*) FROM research_runs) AS research_runs,
                (SELECT count(*) FROM market_signals) AS market_signals,
                (SELECT count(*) FROM opportunities) AS opportunities,
                (SELECT count(*) FROM rejected_ideas) AS rejected_ideas,
                (SELECT count(*) FROM research_backlog WHERE status = 'OPEN') AS open_backlog
            """
        ).fetchone()
        print(
            "DB report: "
            f"research_runs={totals['research_runs']} "
            f"market_signals={totals['market_signals']} "
            f"opportunities={totals['opportunities']} "
            f"rejected_ideas={totals['rejected_ideas']} "
            f"open_backlog={totals['open_backlog']}"
        )
        rows = conn.execute(
            """
            SELECT name, summary, total, status, decision, market, customer_segment
            FROM latest_opportunity_scores
            ORDER BY total DESC, scored_at DESC
            LIMIT 10
            """
        ).fetchall()
        for i, row in enumerate(rows, 1):
            print(f"{i}. {row['total']}/100 | {row['status']} | {row['decision']} | {row['name']}")
            print(f"   summary: {row['summary']}")
            print(f"   market: {row['market']}")
            print(f"   customer: {row['customer_segment'][:180]}")


if __name__ == "__main__":
    main()
