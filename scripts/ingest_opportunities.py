from __future__ import annotations

import argparse
import json
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from config import load_database_url


def infer_service_idea(title: str, description: str, query: str) -> tuple[str, str, str]:
    text = f"{title} {description}".lower()
    if any(term in text for term in ["grant", "funding", "calls", "tender", "rfp", "procurement"]):
        return (
            "Tender/grant monitoring and proposal support",
            "SMEs, agencies, and consultants pursuing public/private funded projects",
            "Funding/procurement signal",
        )
    if any(term in text for term in ["ai", "automation", "workflow", "agent"]):
        return (
            "AI workflow automation, internal tools, and agent-assisted operations",
            "Teams with repetitive knowledge-work or back-office bottlenecks",
            "AI/automation demand signal",
        )
    if any(term in text for term in ["compliance", "regulation", "directive", "cybersecurity", "gdpr"]):
        return (
            "Compliance-ready digital audits, dashboards, documentation, and reporting tools",
            "Regulated SMEs, professional services, and operations teams",
            "Regulation/compliance signal",
        )
    if any(term in text for term in ["ecommerce", "marketplace", "online sales", "booking"]):
        return (
            "Conversion-focused web platforms, booking flows, and customer portals",
            "Local businesses and service providers moving transactions online",
            "Online sales/customer acquisition signal",
        )
    return (
        "Discovery call to translate the trend into a focused digital service/product offer",
        "SMEs or professional teams affected by this market trend",
        f"Search query signal: {query}",
    )


def load_items(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict) and "results" in payload:
        payload = payload["results"]
    if not isinstance(payload, list):
        raise ValueError("Input JSON must be a list or {'results': [...]} object")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Insert web search opportunity results into Postgres")
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--label", default="manual-smoke-test")
    args = parser.parse_args()

    items = load_items(args.input)
    if not items:
        print("No input results to insert")
        return

    database_url = load_database_url()
    inserted_or_updated = 0
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        with conn.transaction():
            run_ids: dict[str, int] = {}
            for item in items:
                query = str(item.get("query") or "digital services opportunities").strip()
                if query not in run_ids:
                    run_id = conn.execute(
                        "INSERT INTO search_runs (run_label, query) VALUES (%s, %s) RETURNING id",
                        (args.label, query),
                    ).fetchone()["id"]
                    run_ids[query] = int(run_id)

                title = str(item.get("title") or "").strip()
                url = str(item.get("url") or "").strip()
                description = str(item.get("description") or item.get("snippet") or "").strip()
                if not title or not url:
                    continue
                service_idea, target_customer, market_signal = infer_service_idea(title, description, query)
                conn.execute(
                    """
                    INSERT INTO opportunities (
                        run_id, query, title, url, description,
                        market_signal, service_idea, target_customer
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (url) DO UPDATE SET
                        run_id = EXCLUDED.run_id,
                        query = EXCLUDED.query,
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        market_signal = EXCLUDED.market_signal,
                        service_idea = EXCLUDED.service_idea,
                        target_customer = EXCLUDED.target_customer,
                        updated_at = now()
                    """,
                    (
                        run_ids[query],
                        query,
                        title,
                        url,
                        description,
                        market_signal,
                        service_idea,
                        target_customer,
                    ),
                )
                inserted_or_updated += 1
    print(f"Ingest complete: {inserted_or_updated} opportunity rows inserted/updated")


if __name__ == "__main__":
    main()
