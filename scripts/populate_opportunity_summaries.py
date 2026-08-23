from __future__ import annotations

import psycopg
from config import load_database_url

SUMMARIES = {
    "eu-greece-e-invoicing-shopify-mydata-bridge": "A tool for Shopify/e-commerce stores in Greece and Europe that helps them collect VAT/invoice details correctly and prepare compliant e-invoices for systems like myDATA. In simple words: it helps online shops stop handling business invoices manually and avoid expensive Shopify Plus/custom work.",
    "whatsapp-clinic-no-show-automation": "A WhatsApp reminder and rescheduling system for small clinics, dentists, and medical practices. In simple words: it sends automatic appointment reminders, lets patients confirm/cancel/reschedule, and helps clinics reduce empty appointment slots.",
    "eaa-accessibility-compliance-for-saas-smes": "A compliance workflow tool for websites, SaaS products, and agencies that need to meet EU Accessibility Act/WCAG requirements. In simple words: it scans a site/app, explains accessibility problems, creates developer tasks, and keeps proof that the business is working toward compliance.",
    "subcontractor-whatsapp-excel-project-tracker": "A simple mobile/WhatsApp-first project tracker for small construction subcontractors who currently coordinate jobs with Excel, WhatsApp, PDFs, and phone calls. In simple words: it replaces messy spreadsheets with one place for jobs, photos, tasks, changes, and reports.",
    "ai-sales-call-to-crm-followup-agent": "An AI assistant that turns sales-call transcripts into CRM notes, tasks, follow-up emails, and next steps. In simple words: after a sales call, it does the boring admin work so the salesperson does not manually update HubSpot/Pipedrive or write follow-ups from scratch.",
}


def main() -> None:
    with psycopg.connect(load_database_url()) as conn:
        with conn.transaction():
            for slug, summary in SUMMARIES.items():
                conn.execute(
                    "UPDATE opportunities SET summary = %s, updated_at = now() WHERE slug = %s",
                    (summary, slug),
                )
    print(f"Updated summaries for {len(SUMMARIES)} existing opportunities")


if __name__ == "__main__":
    main()
