from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from config import load_database_url

ROOT = Path(__file__).resolve().parents[1]
RESULTS_PATH = ROOT / "data" / "first-deep-research-results.json"
REPORT_PATH = ROOT / "reports" / f"daily-software-opportunity-intelligence-{datetime.now(timezone.utc).date().isoformat()}.md"


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80]


def source_type(strategy: str) -> str:
    return {
        "complaint": "community/complaint",
        "pain": "pain/manual-workflow",
        "freelance-demand": "freelance-marketplace",
        "regulation": "regulatory",
        "geographic-arbitrage": "geographic-arbitrage",
        "competitor-complaint": "software-directory",
        "emerging": "market-research",
        "vertical-saas": "vertical-market",
        "developer-tools": "developer-community",
        "ecommerce": "merchant-community",
        "public-sector": "regulatory",
    }.get(strategy, "web")


def signal_type(strategy: str) -> str:
    return {
        "complaint": "complaint",
        "pain": "manual_workflow",
        "freelance-demand": "freelance_request",
        "regulation": "regulatory_change",
        "geographic-arbitrage": "geographic_arbitrage",
        "competitor-complaint": "competitor_landscape",
        "emerging": "market_growth",
        "vertical-saas": "vertical_pain",
        "developer-tools": "developer_tooling",
        "ecommerce": "merchant_pain",
        "public-sector": "regulatory_change",
    }.get(strategy, "market_signal")


def geography_for(query: str, title: str, url: str) -> str:
    blob = f"{query} {title} {url}".lower()
    if "greece" in blob or "greek" in blob or "mydata" in blob:
        return "Greece"
    if "eu" in blob or "europe" in blob or "gdpr" in blob or "eaa" in blob or "shopify" in blob:
        return "EU"
    if "uk" in blob:
        return "UK"
    if "usa" in blob or "fcc.gov" in blob or "nist.gov" in blob or "cisa.gov" in blob:
        return "USA"
    return "Global"


def upsert_opportunity(cur, run_id: int, opp: dict) -> int:
    row = cur.execute(
        """
        INSERT INTO opportunities (
            slug, name, status, market, geography, customer_segment, problem,
            current_solution, proposed_product, differentiation, business_model,
            suggested_pricing, mvp, technical_approach, distribution_first_10,
            distribution_100, risks, why_now, decision, dedupe_key, updated_at
        ) VALUES (
            %(slug)s, %(name)s, %(status)s, %(market)s, %(geography)s, %(customer_segment)s,
            %(problem)s, %(current_solution)s, %(proposed_product)s, %(differentiation)s,
            %(business_model)s, %(suggested_pricing)s, %(mvp)s, %(technical_approach)s,
            %(distribution_first_10)s, %(distribution_100)s, %(risks)s, %(why_now)s,
            %(decision)s, %(dedupe_key)s, now()
        )
        ON CONFLICT (dedupe_key) DO UPDATE SET
            name = EXCLUDED.name,
            status = EXCLUDED.status,
            market = EXCLUDED.market,
            geography = EXCLUDED.geography,
            customer_segment = EXCLUDED.customer_segment,
            problem = EXCLUDED.problem,
            current_solution = EXCLUDED.current_solution,
            proposed_product = EXCLUDED.proposed_product,
            differentiation = EXCLUDED.differentiation,
            business_model = EXCLUDED.business_model,
            suggested_pricing = EXCLUDED.suggested_pricing,
            mvp = EXCLUDED.mvp,
            technical_approach = EXCLUDED.technical_approach,
            distribution_first_10 = EXCLUDED.distribution_first_10,
            distribution_100 = EXCLUDED.distribution_100,
            risks = EXCLUDED.risks,
            why_now = EXCLUDED.why_now,
            decision = EXCLUDED.decision,
            updated_at = now()
        RETURNING id
        """,
        opp,
    ).fetchone()
    oid = int(row["id"])
    cur.execute(
        """
        INSERT INTO opportunity_scores (
            opportunity_id, run_id, pain_severity, evidence_of_demand, willingness_to_pay,
            competition_gap, feasibility, time_to_mvp, recurring_revenue,
            distribution, builder_fit, rationale
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (oid, run_id, *opp["score"], opp["score_rationale"]),
    )
    for comp in opp.get("competitors", []):
        cur.execute(
            """
            INSERT INTO competitors (opportunity_id, name, url, positioning, pricing, strengths, weaknesses, recurring_complaints)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (opportunity_id, name) DO UPDATE SET
              url=EXCLUDED.url, positioning=EXCLUDED.positioning, pricing=EXCLUDED.pricing,
              strengths=EXCLUDED.strengths, weaknesses=EXCLUDED.weaknesses,
              recurring_complaints=EXCLUDED.recurring_complaints
            """,
            (oid, comp["name"], comp.get("url"), comp.get("positioning"), comp.get("pricing"), comp.get("strengths"), comp.get("weaknesses"), comp.get("complaints")),
        )
    return oid


def build_opportunities() -> list[dict]:
    opps = [
        {
            "slug": "eu-greece-e-invoicing-shopify-mydata-bridge",
            "name": "EU/Greece e-invoicing and VAT bridge for Shopify/B2B SMBs",
            "status": "PROMISING",
            "market": "E-commerce compliance / tax automation",
            "geography": "Greece / EU",
            "customer_segment": "EU Shopify merchants and Greek SMBs selling B2B who need VAT ID capture, compliant invoices, myDATA/Peppol workflows, and accounting handoff without Shopify Plus pricing.",
            "problem": "EU B2B merchants need legally correct VAT invoice data at checkout and country-specific e-invoicing/reporting. Shopify merchants report that native checkout VAT/invoice support is unavailable or locked behind Shopify Plus, forcing manual textarea/email workflows and third-party app patchwork.",
            "current_solution": "Manual checkout notes/email collection, accountant cleanup, multiple Shopify apps, Shopify Plus, or local invoicing providers disconnected from the storefront.",
            "proposed_product": "A localized EU invoice-compliance layer: VAT ID collection/validation, invoice-request widget, order-to-invoice workflow, Greek myDATA/QR readiness, Peppol/export support, accountant dashboard, and country deadline checklists.",
            "differentiation": "Start narrow with Greece + Shopify B2B pain, then expand country modules. Compete on local compliance, language, accountant workflow, and lower price than Shopify Plus rather than cloning generic invoicing apps.",
            "business_model": "SaaS subscription with usage tiers by order volume; optional setup/accountant onboarding fee.",
            "suggested_pricing": "€49–€149/month for SMB stores; €299+ for higher-volume or multi-country B2B stores; €300–€1,000 setup for myDATA/accounting mapping.",
            "mvp": "Shopify app or storefront widget that captures invoice/VAT fields, validates EU VAT IDs, generates compliant invoice data exports/PDFs, supports Greek required fields/QR handoff, and gives accountants a review queue.",
            "technical_approach": "Next.js app + PostgreSQL, Shopify app/auth/webhooks, VIES validation, AADE/myDATA integration research, invoice PDF/XML generation, background jobs, audit trail, accountant roles.",
            "distribution_first_10": "Direct outreach to Greek Shopify agencies, accountants serving e-commerce merchants, Shopify community posters with EU VAT complaints, and Greek merchant groups before October 2026 rollout.",
            "distribution_100": "Partnerships with accountants/agencies, Shopify App Store listing around EU VAT/myDATA keywords, country-specific landing pages, webinars about 2026 e-invoicing deadlines.",
            "risks": "Compliance accuracy and provider certification complexity; Shopify checkout limitations; country-by-country legal differences; incumbent invoicing vendors; app-store distribution competition.",
            "why_now": "Greek B2B e-invoicing rollout begins in 2026, EU mandates are expanding, and merchants are publicly complaining about Shopify's missing native EU VAT/invoice workflow.",
            "decision": "MAYBE — NEEDS VALIDATION",
            "dedupe_key": "ecommerce-compliance|eu-greece-shopify-b2b-vat-einvoicing",
            "score": (17, 17, 13, 12, 7, 3, 5, 3, 5),
            "score_rationale": "Strong regulatory and merchant-pain evidence; willingness to pay is plausible because compliance is mandatory and Shopify Plus is expensive. Score held below 80 because myDATA certification/API complexity and local competition need validation.",
            "competitors": [
                {"name": "Shopify Plus", "url": "https://www.shopify.com/plus", "positioning": "Enterprise Shopify tier with checkout customization", "pricing": "$2,300/month cited by merchants", "strengths": "Native platform control", "weaknesses": "Too expensive for SMB B2B merchants", "complaints": "EU VAT/invoice fields reportedly unavailable natively below Plus."},
                {"name": "Sufio / Shopify invoice apps", "url": "https://apps.shopify.com/", "positioning": "Invoice automation apps", "pricing": "Varies by app/order volume", "strengths": "Existing Shopify distribution", "weaknesses": "May not solve checkout VAT capture or local myDATA end-to-end", "complaints": "Merchants describe third-party app patchwork breaking native checkout experience."},
                {"name": "EDICOM", "url": "https://edicomgroup.com/", "positioning": "Certified e-invoicing provider", "pricing": "Enterprise/provider pricing", "strengths": "Certification and compliance depth", "weaknesses": "Likely heavy for small Shopify merchants", "complaints": "Not SMB-native storefront workflow."},
            ],
            "source_urls": ["https://edicomgroup.com/blog/greece-mandatory-electronic-invoice", "https://community.shopify.com/t/invoice-and-vat-option-on-checkout-for-europe/392729", "https://www.eu-einvoicing.com/", "https://www.libautech.com/best-shopify-apps/top-shopify-invoice-and-receipt-apps", "https://apps.shopify.com/eas-eu-compliance?surface_intra_position=1&surface_type=partners&surface_version=simplified"],
        },
        {
            "slug": "eaa-accessibility-compliance-for-saas-smes",
            "name": "EU Accessibility Act compliance workflow for SaaS/SME websites",
            "status": "WATCHLIST",
            "market": "Accessibility compliance / QA automation",
            "geography": "EU / UK / USA-to-EU sellers",
            "customer_segment": "Small SaaS makers, plugins, e-commerce businesses, and agencies serving EU users that need practical WCAG/EAA remediation without enterprise audit budgets.",
            "problem": "The EAA is now in effect and covers many digital services, but small teams lack a practical workflow that turns accessibility scans into prioritized developer tasks, evidence logs, and compliance documentation.",
            "current_solution": "One-off manual audits, generic scanner tools, accessibility widgets, agency retainers, or ignoring compliance until a complaint appears.",
            "proposed_product": "Developer-friendly accessibility compliance pipeline: crawl/scans, keyboard/screen-reader checklists, AI-assisted remediation suggestions, GitHub/Jira tickets, conformance evidence vault, recurring monitoring, agency client reporting.",
            "differentiation": "Focus on small software teams and agencies: actionable tickets and evidence history instead of just red/yellow scanner dashboards or generic widgets.",
            "business_model": "SaaS plus agency seats; recurring site/app monitoring; optional paid human review marketplace later.",
            "suggested_pricing": "€39–€99/month per small site/app; €199–€499/month agency plans; paid remediation reviews.",
            "mvp": "Crawler for key pages + axe/WCAG checks + manual-test checklist + issue prioritization + exportable EAA evidence report + recurring scan alerts.",
            "technical_approach": "Playwright crawler, axe-core, PostgreSQL, Next.js dashboard, GitHub/Jira integrations, report generation, optional screen-reader testing guides and AI code suggestions.",
            "distribution_first_10": "Target web agencies and plugin/SaaS makers publishing EAA guides; offer free scans for EU-facing sites and convert remediation reporting.",
            "distribution_100": "SEO around EAA compliance for SaaS/Shopify/WordPress, agency partner program, freemium scanner, integrations with CI/GitHub.",
            "risks": "Crowded scanner market; legal claims must be carefully worded; automated tools miss many accessibility issues; microenterprise exemptions reduce urgency for some buyers.",
            "why_now": "EAA took effect June 2025; software makers and SMEs are now being told compliance is mandatory for EU digital products/services.",
            "decision": "WATCH",
            "dedupe_key": "compliance|eaa-accessibility-saas-sme-workflow",
            "score": (15, 14, 10, 10, 8, 4, 4, 3, 5),
            "score_rationale": "Real regulatory driver and clear technical fit, but competition is broad and willingness to pay among small businesses requires validation. Strong watchlist candidate, not high-priority yet.",
            "competitors": [
                {"name": "includeUs / AccessEU", "url": "https://accessibility.eu/sme-services", "positioning": "SME accessibility compliance services/widgets/audits", "pricing": "Not extracted", "strengths": "Compliance positioning and human+automated offering", "weaknesses": "Less developer-workflow specific", "complaints": "No recurring complaints found in first pass."},
                {"name": "Equalize Digital / accessibility scanners", "url": "https://freemius.com/blog/eu-accessibility-act-software-compliance", "positioning": "Accessibility testing/remediation ecosystem", "pricing": "Varies", "strengths": "Domain expertise", "weaknesses": "Market fragmented", "complaints": "Generic scanners can miss human-judgment issues."},
            ],
            "source_urls": ["https://freemius.com/blog/eu-accessibility-act-software-compliance", "https://accessibility.eu/sme-services", "https://welldressedwalrus.com/eu-accessibility-act-and-us-businesses", "https://www.supervisor.com/insight/european-accessibility-act-compliance"],
        },
        {
            "slug": "whatsapp-clinic-no-show-automation",
            "name": "WhatsApp-first no-show reduction system for small clinics",
            "status": "WATCHLIST",
            "market": "Healthcare operations / appointment automation",
            "geography": "Global, with EU/local-language variants",
            "customer_segment": "Small private clinics, dental practices, diagnostic centers, and therapy practices with high no-show rates and front-desk phone workload.",
            "problem": "Clinics lose appointment revenue and staff time from 15–30% no-show rates. Phone calls are inefficient, SMS/email are ignored, and many small clinics need WhatsApp-based confirmation/reschedule flows tied to their booking system.",
            "current_solution": "Manual calls, SMS reminders, calendar reminders, generic booking software, or custom n8n/Twilio automations.",
            "proposed_product": "WhatsApp Business appointment automation: confirmation, 24–48h reminder, same-day nudge, confirm/reschedule/cancel replies, waitlist refill, opt-in/out, and booking-system sync.",
            "differentiation": "Narrowly optimize for small clinic ROI and local workflows/language rather than generic messaging automation. Sell saved slots, not messages.",
            "business_model": "Monthly subscription plus per-message pass-through; setup fee for booking/EHR integration.",
            "suggested_pricing": "€79–€249/month per clinic/location + WhatsApp costs; €300–€1,500 integration setup.",
            "mvp": "Import appointments by CSV/API, send approved WhatsApp templates, parse confirm/cancel/reschedule replies, notify staff, measure avoided no-shows and recovered slots.",
            "technical_approach": "Next.js/PostgreSQL, WhatsApp Business API provider, scheduler/queues, lightweight rules engine, calendar/booking integrations, consent/audit logs.",
            "distribution_first_10": "Manual outreach to local clinics/dentists, demo no-show ROI calculator, integrate first with Google Calendar/CSV and one common Greek/EU booking system.",
            "distribution_100": "Partnerships with clinic website/marketing agencies, medical software integrators, WhatsApp templates in local languages, case studies showing no-show reduction.",
            "risks": "Healthcare privacy/consent; integration fragmentation; WhatsApp template approval/platform dependency; existing practice-management systems may add the feature.",
            "why_now": "WhatsApp automation adoption is rising, multiple vendors publish clinic-specific no-show workflows, and small clinics are under revenue pressure.",
            "decision": "WATCH",
            "dedupe_key": "healthcare-ops|whatsapp-clinic-no-show-reminders",
            "score": (16, 14, 11, 9, 8, 4, 4, 3, 5),
            "score_rationale": "Pain and ROI are clear; multiple independent articles describe the workflow. Score limited by many existing reminder tools and need for primary buyer interviews/local integration validation.",
            "competitors": [
                {"name": "Sprix / Durran AI / Beeps Digital style services", "url": "https://durranai.com/blog/whatsapp-appointment-reminders-for-clinics", "positioning": "WhatsApp clinic automation services", "pricing": "Not extracted", "strengths": "Directly targets the same workflow", "weaknesses": "Often service/automation-led rather than standardized local SaaS", "complaints": "No complaint pattern extracted yet."},
                {"name": "Generic practice-management systems", "url": None, "positioning": "Booking/EHR platforms with reminders", "pricing": "Varies", "strengths": "Already own appointment data", "weaknesses": "May lack WhatsApp/localized two-way rescheduling", "complaints": "Need to mine reviews."},
            ],
            "source_urls": ["https://beepsdigital.com/blog/clinic-whatsapp-appointment-reminders/", "https://durranai.com/blog/whatsapp-appointment-reminders-for-clinics", "https://sprix.io/blog/medical-clinics-cut-no-shows-whatsapp-reminders/", "https://tabeeb-hub.com/en/blog/whatsapp-reminders-reduce-clinic-no-shows"],
        },
        {
            "slug": "subcontractor-whatsapp-excel-project-tracker",
            "name": "Lightweight WhatsApp/Excel replacement for small construction subcontractors",
            "status": "WATCHLIST",
            "market": "Construction vertical SaaS",
            "geography": "Global / EU localization possible",
            "customer_segment": "Construction subcontractors with 5–30 employees who coordinate jobs through WhatsApp, spreadsheets, PDFs, and phone calls but cannot justify enterprise construction software.",
            "problem": "Construction teams use spreadsheets for estimating, scheduling, progress, cost tracking, and reports, but version conflicts, unclear accountability, and manual reconciliation become project risk. Existing construction SaaS is numerous and often broad/enterprise-oriented.",
            "current_solution": "Excel/Google Sheets, WhatsApp groups, email, paper/PDF forms, Procore/Buildertrend/Sage/Houzz Pro or custom consultant-built workflows.",
            "proposed_product": "Mobile-first job tracker for subcontractors: WhatsApp-friendly task updates, photo/progress logs, simple change orders, invoice/payment milestones, Excel import/export, and accountant handoff.",
            "differentiation": "Do the valuable 20% for small subcontractors rather than full construction ERP. Keep WhatsApp as the input layer and Excel export as an escape hatch.",
            "business_model": "Per-company subscription with seat/job limits; optional onboarding/templates.",
            "suggested_pricing": "€49–€199/month per subcontractor business; €500 setup for migration/templates.",
            "mvp": "Jobs, tasks, team assignment, WhatsApp/photo update intake, daily/weekly report, change-order log, invoice milestone checklist, CSV/Excel import/export.",
            "technical_approach": "Next.js/PWA + PostgreSQL, mobile UI, WhatsApp/email ingestion, file/photo storage, PDF/Excel exports, role-based sharing links for owners/GCs.",
            "distribution_first_10": "Interview local electricians/plumbers/HVAC subcontractors; partner with accountants/estimators; migrate one active spreadsheet into the app as a paid pilot.",
            "distribution_100": "Trade associations, local construction Facebook groups, templates for niches, referral from accountants/suppliers, SEO by trade and country.",
            "risks": "Very crowded category with 288+ listed tools; construction buyers may resist process change; support/onboarding can become service-heavy; differentiation must be very niche.",
            "why_now": "Spreadsheet risk remains visible, mobile/WhatsApp workflows are normalized, and large construction tools leave a small-subcontractor simplicity gap.",
            "decision": "WATCH",
            "dedupe_key": "construction|small-subcontractor-whatsapp-excel-tracker",
            "score": (14, 13, 10, 8, 8, 4, 4, 3, 5),
            "score_rationale": "Pain is real and software spend exists, but competition is intense and differentiation/distribution must be proven in a narrow trade/geography.",
            "competitors": [
                {"name": "Procore", "url": "https://www.procore.com/project-management/schedule", "positioning": "Construction management platform", "pricing": "Custom/enterprise", "strengths": "Comprehensive and trusted", "weaknesses": "Can be too broad/expensive for small subcontractors", "complaints": "Need review mining."},
                {"name": "Buildertrend / Sage / Houzz Pro / Knowify", "url": "https://www.softwareadvice.com/construction/subcontractor-software-comparison/", "positioning": "Construction/subcontractor software", "pricing": "Varies", "strengths": "Established category", "weaknesses": "Crowded and often not WhatsApp-first", "complaints": "Listings show weaker areas such as reporting/mobile/contract features for some vendors."},
            ],
            "source_urls": ["https://www.ingenious.build/blog-posts/construction-software-alternative-excel", "https://www.softwareadvice.com/construction/subcontractor-software-comparison/", "https://www.getapp.com/finance-accounting-software/billing-invoicing/w/whatsapp/", "https://logiciel.io/capabilities/project-management-software-for-small-construction-company"],
        },
        {
            "slug": "ai-sales-call-to-crm-followup-agent",
            "name": "AI sales-call transcript to CRM/follow-up operations agent",
            "status": "WATCHLIST",
            "market": "AI workflow automation / RevOps",
            "geography": "Global",
            "customer_segment": "Small B2B sales, account-management, and agencies that manually turn call transcripts into CRM notes, tasks, proposals, and follow-ups.",
            "problem": "Freelance demand shows companies paying developers to build Claude/LLM-powered business operations platforms where teams manually process call transcripts and operational handoffs after calls.",
            "current_solution": "Manual notes, CRM updates by reps, Zapier/n8n custom automations, Gong/Fireflies/Otter plus manual cleanup, custom Upwork builds.",
            "proposed_product": "A narrow AI operations agent that ingests call transcripts, extracts next steps, updates CRM/project tools, drafts follow-up emails/proposals, and routes approvals with audit trails.",
            "differentiation": "Package repeated custom automation jobs into a productized RevOps workflow for small teams, with human approval and CRM-specific templates.",
            "business_model": "Subscription by seats/connected calls plus usage; setup fee for CRM/playbook configuration.",
            "suggested_pricing": "€99–€399/month for small teams; €500–€2,000 setup for custom CRM/workflow mapping.",
            "mvp": "Upload/pull transcripts, summarize, extract action items, draft follow-up, create CRM tasks/notes in HubSpot/Pipedrive, approval queue, logs.",
            "technical_approach": "Next.js/PostgreSQL, OAuth integrations, queue workers, LLM extraction/evaluation, prompt versioning, approval UX, PII safeguards.",
            "distribution_first_10": "Mine Upwork/Reddit/agency operations requests; sell productized implementation to agencies and B2B service firms using HubSpot/Pipedrive.",
            "distribution_100": "Integration marketplace listings, templates by CRM/industry, partner with RevOps consultants, content around post-call automation ROI.",
            "risks": "Crowded AI meeting assistant market; platform/API dependencies; output accuracy; customers may prefer existing tools; evidence from first pass is thinner than regulatory opportunities.",
            "why_now": "LLM extraction is now good enough, freelance jobs show custom demand, and teams are actively automating manual transcript-to-operations work.",
            "decision": "MAYBE — NEEDS VALIDATION",
            "dedupe_key": "ai-revops|call-transcript-crm-followup-agent",
            "score": (13, 11, 10, 8, 8, 4, 4, 3, 5),
            "score_rationale": "Technically feasible with real custom-development signals, but first-pass evidence is weaker and the adjacent AI meeting/CRM market is crowded. Needs more complaint and pricing research.",
            "competitors": [
                {"name": "Fireflies / Otter / Gong adjacent tools", "url": None, "positioning": "Meeting transcription and sales intelligence", "pricing": "Varies", "strengths": "Own meeting transcript workflow", "weaknesses": "May not deeply execute bespoke post-call ops", "complaints": "Need review mining."},
                {"name": "Zapier / n8n custom workflows", "url": "https://n8n.io/workflows/8015-automate-ai-upwork-proposal-generation-with-apify-google-gemini-and-sheets/", "positioning": "Flexible automation", "pricing": "Subscription/self-hosted", "strengths": "Flexible and known", "weaknesses": "Requires setup and maintenance", "complaints": "Businesses still commission custom builds."},
            ],
            "source_urls": ["https://www.upwork.com/freelance-jobs/apply/Automation-Developer-Needed-Build-Claude-Powered-Business-Operations-Platform_~022075993111440504091", "https://www.upwork.com/nx/search/jobs?q=AI%2Bautomation%2Bn8n%2Bchatbot&sort=recency", "https://n8n.io/workflows/8015-automate-ai-upwork-proposal-generation-with-apify-google-gemini-and-sheets/", "https://marketintelo.com/report/ai-workflow-automation-agentic-enterprise-software-market"],
        },
    ]
    return opps


def main() -> None:
    start = time.time()
    data = json.loads(RESULTS_PATH.read_text(encoding="utf-8"))["results"]
    database_url = load_database_url()
    with psycopg.connect(database_url, row_factory=dict_row) as conn:
        with conn.transaction():
            cur = conn
            run_id = int(cur.execute(
                "INSERT INTO research_runs (run_type, status, notes) VALUES (%s,%s,%s) RETURNING id",
                ("manual-first-execution", "running", "First execution from full autonomous market opportunity prompt"),
            ).fetchone()["id"])
            query_ids: dict[tuple[str, str], int] = {}
            signal_ids_by_url: dict[str, int] = {}
            for r in data:
                key = (r["query"], r["strategy"])
                if key not in query_ids:
                    qid = int(cur.execute(
                        "INSERT INTO search_queries (run_id, query, strategy, geography, result_count) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                        (run_id, r["query"], r["strategy"], geography_for(r["query"], r["title"], r["url"]), sum(1 for x in data if x["query"] == r["query"])),
                    ).fetchone()["id"])
                    query_ids[key] = qid
                sid = int(cur.execute(
                    """
                    INSERT INTO sources (source_type, name, url, geography, credibility, last_seen_at)
                    VALUES (%s,%s,%s,%s,%s,now())
                    ON CONFLICT (url) DO UPDATE SET last_seen_at=now(), source_type=EXCLUDED.source_type, name=EXCLUDED.name, geography=EXCLUDED.geography
                    RETURNING id
                    """,
                    (source_type(r["strategy"]), r["title"][:250], r["url"], geography_for(r["query"], r["title"], r["url"]), 3),
                ).fetchone()["id"])
                sig_id = int(cur.execute(
                    """
                    INSERT INTO market_signals (run_id, source_id, query_id, signal_type, title, url, excerpt, geography, credibility)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (url, signal_type) DO UPDATE SET
                      run_id=EXCLUDED.run_id, source_id=EXCLUDED.source_id, query_id=EXCLUDED.query_id,
                      title=EXCLUDED.title, excerpt=EXCLUDED.excerpt, geography=EXCLUDED.geography
                    RETURNING id
                    """,
                    (run_id, sid, query_ids[key], signal_type(r["strategy"]), r["title"][:500], r["url"], r["description"][:4000], geography_for(r["query"], r["title"], r["url"]), 3),
                ).fetchone()["id"])
                signal_ids_by_url[r["url"]] = sig_id

            opps = build_opportunities()
            for opp in opps:
                oid = upsert_opportunity(cur, run_id, opp)
                for url in opp["source_urls"]:
                    sig_id = signal_ids_by_url.get(url)
                    if sig_id:
                        cur.execute(
                            "INSERT INTO opportunity_signal_links (opportunity_id, signal_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                            (oid, sig_id),
                        )
                for task in [
                    f"Find 5 primary buyer complaints/interviews for {opp['name']}",
                    f"Validate competitor pricing and local Greek/EU alternatives for {opp['name']}",
                    f"Check distribution channels and first-10-customer outreach list for {opp['name']}",
                ]:
                    cur.execute(
                        "INSERT INTO research_backlog (opportunity_id, task, priority) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                        (oid, task, 4 if opp["status"] == "PROMISING" else 3),
                    )

            rejected = [
                ("Generic small-business CRM", "Rejected as too saturated in first pass: G2/PCMag show many mature low-cost CRM options and no narrow underserved niche was proven."),
                ("Generic API testing/documentation tool", "Rejected for now: many strong developer-tool alternatives exist; first pass found listicles rather than repeated high-intent complaints."),
                ("Generic AI workflow automation platform", "Rejected as too broad: market is large but crowded; needs a narrow wedge such as call-to-CRM or vertical workflow."),
            ]
            for name, reason in rejected:
                cur.execute(
                    "INSERT INTO rejected_ideas (run_id, name, reason, evidence_summary) VALUES (%s,%s,%s,%s) ON CONFLICT (name) DO UPDATE SET reason=EXCLUDED.reason, evidence_summary=EXCLUDED.evidence_summary",
                    (run_id, name, reason, "First-pass web/search evidence did not justify a standalone opportunity."),
                )
            duration = int(time.time() - start)
            cur.execute(
                """
                UPDATE research_runs SET status='completed', finished_at=now(), research_duration_seconds=%s,
                  sources_investigated=%s, searches_performed=%s, signals_collected=%s,
                  new_opportunities=%s, existing_opportunities_updated=0, rejected_opportunities=%s,
                  report_path=%s
                WHERE id=%s
                """,
                (duration, len({r["url"] for r in data}), len({r["query"] for r in data}), len(data), len(opps), len(rejected), str(REPORT_PATH), run_id),
            )
    print(f"Persisted first research run: {len(data)} signals, {len(build_opportunities())} opportunities, {len(rejected)} rejected ideas")
    print(f"Report path reserved: {REPORT_PATH}")


if __name__ == "__main__":
    main()
