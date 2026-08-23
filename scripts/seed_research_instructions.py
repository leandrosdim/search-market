from __future__ import annotations

import psycopg
from config import load_database_url

INSTRUCTIONS = [
    ("Mission", "Continuously research global software markets and discover real, evidence-backed software business opportunities that a capable developer/team could build and monetize.", "Defines the overall purpose of the system.", "initial_user_prompt", 5),
    ("Revenue target", "Prioritize opportunities with a realistic path toward €2,000–€5,000+ monthly revenue, with preference for opportunities capable of growing substantially beyond that.", "Keeps research focused on commercially meaningful products.", "initial_user_prompt", 5),
    ("Evidence standard", "Do not classify an opportunity as strong based purely on reasoning; serious opportunities need real web evidence, preferably 3–5 independent signals.", "Prevents speculative startup ideas from being treated as validated opportunities.", "initial_user_prompt", 5),
    ("Evidence standard", "Separate facts, inferences, and assumptions; do not present assumptions as facts.", "Keeps reports honest and decision-useful.", "initial_user_prompt", 5),
    ("Primary focus", "Prioritize products, SaaS, apps, browser extensions, AI tools, developer tools, and digital services that already work in the US or another mature market but are weak, absent, expensive, or poorly localized in Greece/EU.", "This is the latest user correction to the research focus.", "user_correction", 5),
    ("Primary focus", "Do not over-focus on EU/Greece regulatory arbitrage; use regulatory signals only when they materially support a broader product opportunity.", "The user explicitly corrected the schedule focus away from regulatory arbitrage.", "user_correction", 5),
    ("Geographic arbitrage", "Ask: What is already working extremely well elsewhere but has not been properly brought to Greece or Europe?", "Core search question for localized/differentiated product opportunities.", "user_correction", 5),
    ("Geographic arbitrage", "Do not recommend simply cloning a product; identify the validated underlying problem and how a localized or differentiated product could legitimately compete.", "Avoids low-quality clone ideas and forces defensibility.", "initial_user_prompt", 5),
    ("Discovery strategy", "Use five discovery strategies: discover new products, attack proven markets, discover pain, identify emerging opportunities, and rank ruthlessly by profitability.", "Defines broad research coverage.", "initial_user_prompt", 4),
    ("Discovery strategy", "Search for repeated complaints such as alternatives, too expensive, too complex, manual Excel workflows, missing automation, and 'is there an app for this' style demand.", "Complaint patterns reveal buyer pain.", "initial_user_prompt", 4),
    ("Discovery strategy", "Regularly mine freelance marketplaces and job boards for repeated custom automation, integration, dashboard, scraping, AI-agent, and reporting requests.", "Repeated paid custom work can indicate a product opportunity.", "initial_user_prompt", 4),
    ("Discovery strategy", "Mine competitor complaints from Reddit, G2, Capterra, app stores, Chrome Web Store, Trustpilot, GitHub issues, forums, and social media.", "Negative reviews of paid products reveal market gaps.", "initial_user_prompt", 4),
    ("Sources", "Prefer primary sources whenever possible and never rely entirely on SEO listicles or generic startup-idea articles.", "Improves research quality and avoids copied generic claims.", "initial_user_prompt", 5),
    ("Sources", "Five websites copying the same announcement count as one signal, not five independent signals.", "Prevents evidence inflation.", "initial_user_prompt", 5),
    ("Competition", "Competition is not automatically negative because it proves customers may pay, but penalize saturated markets without a clear underserved niche.", "Balances market validation with differentiation risk.", "initial_user_prompt", 4),
    ("Competition", "Reject or heavily penalize opportunities where many mature competitors exist, prices are low, satisfaction is high, switching costs are high, or differentiation is weak.", "Keeps scores conservative.", "initial_user_prompt", 4),
    ("Opportunity detail", "For each serious opportunity, research the problem, customer, current solution, competitors, market gap, product, differentiation, monetization, pricing, revenue math, MVP, technical approach, distribution, risks, why now, sources, and verdict.", "Defines the required opportunity record/report depth.", "initial_user_prompt", 5),
    ("Scoring", "Use the fixed 100-point scoring model: pain 20, evidence 20, willingness to pay 15, competition gap 15, feasibility 10, time to MVP 5, recurring revenue 5, distribution 5, builder fit 5.", "The scoring model must remain stable for longitudinal comparison.", "initial_user_prompt", 5),
    ("Scoring", "Do not inflate scores; scores above 80 should be difficult to earn.", "Maintains ranking quality.", "initial_user_prompt", 5),
    ("Database", "Use PostgreSQL as persistent intelligence memory for opportunities, runs, signals, evidence, sources, competitors, pricing, complaints, scores, status, geography, rejected ideas, watchlists, reports, and backlog.", "The database is the durable system memory.", "initial_user_prompt", 5),
    ("Database", "Before creating a new opportunity, search existing opportunities and attach evidence to similar records instead of creating duplicates.", "Prevents duplicate noisy opportunity records.", "initial_user_prompt", 5),
    ("Database", "Store score history so opportunity assessments evolve over time as new evidence appears.", "Enables longitudinal intelligence.", "initial_user_prompt", 4),
    ("Lifecycle", "Use opportunity lifecycle statuses such as DISCOVERED, RESEARCHING, WATCHLIST, PROMISING, HIGH_PRIORITY, REJECTED, and ARCHIVED.", "Makes opportunity state clear.", "initial_user_prompt", 4),
    ("Daily run", "Daily execution should perform broad discovery, target roughly 20–50 meaningful market signals when quality allows, and identify about 3–5 opportunities worthy of detailed reporting.", "Defines daily operating rhythm without forcing quantity.", "initial_user_prompt", 4),
    ("Daily run", "Some days may produce zero genuinely good opportunities; never manufacture good ideas simply because a report is expected.", "Prevents fake quality.", "initial_user_prompt", 5),
    ("Daily run", "Do not search the exact same queries every day; rotate industries, professions, countries, communities, software categories, complaint patterns, marketplaces, regulatory topics, technologies, and trends.", "Maintains research diversity.", "initial_user_prompt", 4),
    ("Report", "Each daily report should include date, research duration, sources, queries, signals, new/updated/rejected opportunities, executive summary, top opportunities, geographic arbitrage watch, watchlist movements, new signals, rejected ideas, and research backlog.", "Defines expected report structure.", "initial_user_prompt", 4),
    ("Backlog", "At the end of each run, create research backlog tasks such as checking local competitors, pricing, reviews, API feasibility, distribution, and buyer complaints.", "Makes future runs cumulative.", "initial_user_prompt", 4),
    ("Meta-analysis", "Periodically analyze the database to identify recurring problems, weak-software industries, customer types that repeatedly complain, gaining opportunities, and clusters across small opportunities.", "Turns stored evidence into higher-level strategy.", "initial_user_prompt", 3),
    ("Skepticism", "Act as though your own money will fund the product; do not confuse interesting technology, social excitement, search volume, or absence of competitors with a business opportunity.", "Keeps research commercially skeptical.", "initial_user_prompt", 5),
    ("Decision", "For every opportunity ask whether it is rational for a capable developer to invest months of work to reach at least €2,000–€5,000 MRR, then answer YES, MAYBE — NEEDS VALIDATION, WATCH, or NO.", "Forces a final investment-oriented verdict.", "initial_user_prompt", 5),
    ("Dashboard", "Every opportunity must have a plain-language summary explaining what it is about so the user can understand the table quickly.", "User requested easier-to-understand opportunity records.", "user_correction", 5),
]


def main() -> None:
    with psycopg.connect(load_database_url()) as conn:
        with conn.transaction():
            for category, instruction, rationale, source, priority in INSTRUCTIONS:
                conn.execute(
                    """
                    INSERT INTO research_instructions (category, instruction, rationale, source, priority, is_active, updated_at)
                    VALUES (%s, %s, %s, %s, %s, true, now())
                    ON CONFLICT (category, instruction) DO UPDATE SET
                      rationale = EXCLUDED.rationale,
                      source = EXCLUDED.source,
                      priority = EXCLUDED.priority,
                      is_active = true,
                      updated_at = now()
                    """,
                    (category, instruction, rationale, source, priority),
                )
    print(f"Seeded {len(INSTRUCTIONS)} active research instructions")


if __name__ == "__main__":
    main()
