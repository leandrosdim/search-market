import { query } from "@/lib/db";

export type DashboardStats = {
  researchRuns: number;
  marketSignals: number;
  opportunities: number;
  rejectedIdeas: number;
  openBacklog: number;
  sources: number;
};

export type CompetitorSourceRow = {
  url: string;
  title: string | null;
  type: string | null;
  context: string | null;
};

export type CompetitorRow = {
  id: number;
  name: string;
  url: string | null;
  positioning: string | null;
  pricing: string | null;
  strengths: string | null;
  weaknesses: string | null;
  recurringComplaints: string | null;
  sources: CompetitorSourceRow[];
};

export type OpportunityRow = {
  id: number;
  name: string;
  summary: string;
  status: string;
  decision: string;
  market: string;
  geography: string | null;
  customerSegment: string;
  problem: string;
  currentSolution: string | null;
  proposedProduct: string;
  differentiation: string | null;
  businessModel: string | null;
  suggestedPricing: string | null;
  mvp: string | null;
  technicalApproach: string | null;
  distributionFirst10: string | null;
  distribution100: string | null;
  risks: string | null;
  whyNow: string | null;
  total: number;
  scoredAt: string;
  evidenceCount: number;
  competitorCount: number;
  competitors: CompetitorRow[];
  evidence: OpportunityEvidenceRow[];
};

export type OpportunityEvidenceRow = {
  id: number;
  signalType: string;
  title: string;
  url: string;
  excerpt: string;
  geography: string | null;
  customerSegment: string | null;
  painPoint: string | null;
  currentSolution: string | null;
  willingnessToPay: string | null;
  credibility: number;
  discoveredAt: string;
};

export type RunRow = {
  id: number;
  runType: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  searchesPerformed: number;
  signalsCollected: number;
  newOpportunities: number;
  rejectedOpportunities: number;
  reportPath: string | null;
};

export type SignalRow = {
  id: number;
  signalType: string;
  title: string;
  url: string;
  geography: string | null;
  discoveredAt: string;
};

export type BacklogRow = {
  id: number;
  opportunityName: string | null;
  task: string;
  priority: number;
  status: string;
};

export type ResearchInstructionRow = {
  id: number;
  category: string;
  instruction: string;
  rationale: string;
  source: string;
  priority: number;
};

function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "");
}

export async function getDashboardData() {
  const [statsRow] = await query<{
    research_runs: string;
    market_signals: string;
    opportunities: string;
    rejected_ideas: string;
    open_backlog: string;
    sources: string;
  }>(`
    SELECT
      (SELECT count(*) FROM research_runs) AS research_runs,
      (SELECT count(*) FROM market_signals) AS market_signals,
      (SELECT count(*) FROM opportunities) AS opportunities,
      (SELECT count(*) FROM rejected_ideas) AS rejected_ideas,
      (SELECT count(*) FROM research_backlog WHERE status = 'OPEN') AS open_backlog,
      (SELECT count(*) FROM sources) AS sources
  `);

  const rawOpportunities = await query<{
    id: string;
    name: string;
    summary: string;
    status: string;
    decision: string;
    market: string;
    geography: string | null;
    customer_segment: string;
    problem: string;
    current_solution: string | null;
    proposed_product: string;
    differentiation: string | null;
    business_model: string | null;
    suggested_pricing: string | null;
    mvp: string | null;
    technical_approach: string | null;
    distribution_first_10: string | null;
    distribution_100: string | null;
    risks: string | null;
    why_now: string | null;
    total: string;
    scored_at: Date;
    evidence_count: string;
    competitor_count: string;
  }>(`
    SELECT
      o.id,
      o.name,
      o.summary,
      o.status,
      o.decision,
      o.market,
      o.geography,
      o.customer_segment,
      o.problem,
      o.current_solution,
      o.proposed_product,
      o.differentiation,
      o.business_model,
      o.suggested_pricing,
      o.mvp,
      o.technical_approach,
      o.distribution_first_10,
      o.distribution_100,
      o.risks,
      o.why_now,
      s.total,
      s.scored_at,
      count(DISTINCT osl.signal_id) AS evidence_count,
      count(DISTINCT c.id) AS competitor_count
    FROM latest_opportunity_scores s
    JOIN opportunities o ON o.id = s.opportunity_id
    LEFT JOIN opportunity_signal_links osl ON osl.opportunity_id = o.id
    LEFT JOIN competitors c ON c.opportunity_id = o.id
    GROUP BY o.id, s.total, s.scored_at
    ORDER BY s.total DESC, s.scored_at DESC
    LIMIT 20
  `);

  const opportunityIds = rawOpportunities.map((row) => toNumber(row.id));
  const rawCompetitors = opportunityIds.length > 0
    ? await query<{
        opportunity_id: string;
        id: string;
        name: string;
        url: string | null;
        positioning: string | null;
        pricing: string | null;
        strengths: string | null;
        weaknesses: string | null;
        recurring_complaints: string | null;
        sources: unknown;
      }>(`
        SELECT
          c.opportunity_id,
          c.id,
          c.name,
          c.url,
          c.positioning,
          c.pricing,
          c.strengths,
          c.weaknesses,
          c.recurring_complaints,
          COALESCE(
            json_agg(
              json_build_object(
                'url', cs.source_url,
                'title', cs.source_title,
                'type', cs.source_type,
                'context', cs.context
              ) ORDER BY cs.discovered_at DESC, cs.id DESC
            ) FILTER (WHERE cs.id IS NOT NULL),
            '[]'::json
          ) AS sources
        FROM competitors c
        LEFT JOIN competitor_sources cs ON cs.competitor_id = c.id
        WHERE c.opportunity_id = ANY($1::bigint[])
        GROUP BY c.id
        ORDER BY c.opportunity_id, c.name
      `, [opportunityIds])
    : [];

  const competitorsByOpportunity = new Map<number, CompetitorRow[]>();
  for (const row of rawCompetitors) {
    const opportunityId = toNumber(row.opportunity_id);
    const list = competitorsByOpportunity.get(opportunityId) ?? [];
    const sources = Array.isArray(row.sources) ? row.sources : [];
    list.push({
      id: toNumber(row.id),
      name: row.name,
      url: row.url,
      positioning: row.positioning,
      pricing: row.pricing,
      strengths: row.strengths,
      weaknesses: row.weaknesses,
      recurringComplaints: row.recurring_complaints,
      sources: sources
        .filter((source): source is Record<string, unknown> => source !== null && typeof source === "object")
        .map((source) => ({
          url: String(source.url ?? ""),
          title: source.title === null || source.title === undefined ? null : String(source.title),
          type: source.type === null || source.type === undefined ? null : String(source.type),
          context: source.context === null || source.context === undefined ? null : String(source.context),
        }))
        .filter((source) => source.url.length > 0),
    });
    competitorsByOpportunity.set(opportunityId, list);
  }


  const rawEvidence = opportunityIds.length > 0
    ? await query<{
        opportunity_id: string;
        id: string;
        signal_type: string;
        title: string;
        url: string;
        excerpt: string;
        geography: string | null;
        customer_segment: string | null;
        pain_point: string | null;
        current_solution: string | null;
        willingness_to_pay: string | null;
        credibility: number;
        discovered_at: Date;
      }>(`
        SELECT
          osl.opportunity_id,
          ms.id,
          ms.signal_type,
          ms.title,
          ms.url,
          ms.excerpt,
          ms.geography,
          ms.customer_segment,
          ms.pain_point,
          ms.current_solution,
          ms.willingness_to_pay,
          ms.credibility,
          ms.discovered_at
        FROM opportunity_signal_links osl
        JOIN market_signals ms ON ms.id = osl.signal_id
        WHERE osl.opportunity_id = ANY($1::bigint[])
        ORDER BY osl.opportunity_id, ms.credibility DESC, ms.discovered_at DESC, ms.id DESC
      `, [opportunityIds])
    : [];

  const evidenceByOpportunity = new Map<number, OpportunityEvidenceRow[]>();
  for (const row of rawEvidence) {
    const opportunityId = toNumber(row.opportunity_id);
    const list = evidenceByOpportunity.get(opportunityId) ?? [];
    list.push({
      id: toNumber(row.id),
      signalType: row.signal_type,
      title: row.title,
      url: row.url,
      excerpt: row.excerpt,
      geography: row.geography,
      customerSegment: row.customer_segment,
      painPoint: row.pain_point,
      currentSolution: row.current_solution,
      willingnessToPay: row.willingness_to_pay,
      credibility: toNumber(row.credibility),
      discoveredAt: toIso(row.discovered_at),
    });
    evidenceByOpportunity.set(opportunityId, list);
  }

  const rawRuns = await query<{
    id: string;
    run_type: string;
    status: string;
    started_at: Date;
    finished_at: Date | null;
    searches_performed: number;
    signals_collected: number;
    new_opportunities: number;
    rejected_opportunities: number;
    report_path: string | null;
  }>(`
    SELECT id, run_type, status, started_at, finished_at, searches_performed,
      signals_collected, new_opportunities, rejected_opportunities, report_path
    FROM research_runs
    ORDER BY started_at DESC
    LIMIT 8
  `);

  const rawSignals = await query<{
    id: string;
    signal_type: string;
    title: string;
    url: string;
    geography: string | null;
    discovered_at: Date;
  }>(`
    SELECT id, signal_type, title, url, geography, discovered_at
    FROM market_signals
    ORDER BY discovered_at DESC, id DESC
    LIMIT 12
  `);

  const rawBacklog = await query<{
    id: string;
    opportunity_name: string | null;
    task: string;
    priority: number;
    status: string;
  }>(`
    SELECT b.id, o.name AS opportunity_name, b.task, b.priority, b.status
    FROM research_backlog b
    LEFT JOIN opportunities o ON o.id = b.opportunity_id
    WHERE b.status = 'OPEN'
    ORDER BY b.priority DESC, b.created_at ASC
    LIMIT 10
  `);

  const rawInstructions = await query<{
    id: string;
    category: string;
    instruction: string;
    rationale: string;
    source: string;
    priority: number;
  }>(`
    SELECT id, category, instruction, rationale, source, priority
    FROM research_instructions
    WHERE is_active = true
    ORDER BY priority DESC, category ASC, id ASC
  `);

  const stats: DashboardStats = {
    researchRuns: toNumber(statsRow.research_runs),
    marketSignals: toNumber(statsRow.market_signals),
    opportunities: toNumber(statsRow.opportunities),
    rejectedIdeas: toNumber(statsRow.rejected_ideas),
    openBacklog: toNumber(statsRow.open_backlog),
    sources: toNumber(statsRow.sources),
  };

  const opportunities: OpportunityRow[] = rawOpportunities.map((row) => {
    const id = toNumber(row.id);
    return {
      id,
      name: row.name,
      summary: row.summary,
      status: row.status,
      decision: row.decision,
      market: row.market,
      geography: row.geography,
      customerSegment: row.customer_segment,
      problem: row.problem,
      currentSolution: row.current_solution,
      proposedProduct: row.proposed_product,
      differentiation: row.differentiation,
      businessModel: row.business_model,
      suggestedPricing: row.suggested_pricing,
      mvp: row.mvp,
      technicalApproach: row.technical_approach,
      distributionFirst10: row.distribution_first_10,
      distribution100: row.distribution_100,
      risks: row.risks,
      whyNow: row.why_now,
      total: toNumber(row.total),
      scoredAt: toIso(row.scored_at),
      evidenceCount: toNumber(row.evidence_count),
      competitorCount: toNumber(row.competitor_count),
      competitors: competitorsByOpportunity.get(id) ?? [],
      evidence: evidenceByOpportunity.get(id) ?? [],
    };
  });

  const runs: RunRow[] = rawRuns.map((row) => ({
    id: toNumber(row.id),
    runType: row.run_type,
    status: row.status,
    startedAt: toIso(row.started_at),
    finishedAt: row.finished_at ? toIso(row.finished_at) : null,
    searchesPerformed: toNumber(row.searches_performed),
    signalsCollected: toNumber(row.signals_collected),
    newOpportunities: toNumber(row.new_opportunities),
    rejectedOpportunities: toNumber(row.rejected_opportunities),
    reportPath: row.report_path,
  }));

  const signals: SignalRow[] = rawSignals.map((row) => ({
    id: toNumber(row.id),
    signalType: row.signal_type,
    title: row.title,
    url: row.url,
    geography: row.geography,
    discoveredAt: toIso(row.discovered_at),
  }));

  const backlog: BacklogRow[] = rawBacklog.map((row) => ({
    id: toNumber(row.id),
    opportunityName: row.opportunity_name,
    task: row.task,
    priority: toNumber(row.priority),
    status: row.status,
  }));

  const instructions: ResearchInstructionRow[] = rawInstructions.map((row) => ({
    id: toNumber(row.id),
    category: row.category,
    instruction: row.instruction,
    rationale: row.rationale,
    source: row.source,
    priority: toNumber(row.priority),
  }));

  return { stats, opportunities, runs, signals, backlog, instructions };
}
