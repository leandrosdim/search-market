"use client";

import { useEffect, useState } from "react";
import type { OpportunityRow } from "@/lib/dashboard";

function scoreClass(score: number) {
  if (score >= 80) return "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30";
  if (score >= 70) return "bg-cyan-400/15 text-cyan-100 ring-cyan-300/30";
  if (score >= 60) return "bg-amber-400/15 text-amber-100 ring-amber-300/30";
  return "bg-slate-400/15 text-slate-200 ring-slate-300/20";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 16).replace("T", " ");
}

function InfoBlock({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function CompetitorsPanel({ opportunity }: { opportunity: OpportunityRow }) {
  if (opportunity.competitors.length === 0) {
    return <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">No competitors stored yet.</p>;
  }

  return (
    <div className="space-y-4">
      {opportunity.competitors.map((competitor) => (
        <article key={competitor.id} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-semibold text-white">{competitor.name}</h4>
              {competitor.url ? (
                <a className="mt-1 inline-block break-all text-sm text-cyan-200 hover:text-cyan-100" href={competitor.url} target="_blank" rel="noreferrer">
                  {competitor.url}
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoBlock label="Positioning" value={competitor.positioning} />
            <InfoBlock label="Pricing" value={competitor.pricing} />
            <InfoBlock label="Strengths" value={competitor.strengths} />
            <InfoBlock label="Weaknesses / gap" value={competitor.weaknesses} />
            <InfoBlock label="Recurring complaints" value={competitor.recurringComplaints} />
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Found / validated in</p>
            {competitor.sources.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No source URLs stored.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {competitor.sources.map((source) => (
                  <a
                    key={`${competitor.id}-${source.url}`}
                    className="block rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.06]"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="font-semibold text-cyan-100">{source.title || source.type || "Source"}</span>
                    {source.type ? <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{source.type}</span> : null}
                    <span className="mt-1 block break-all text-xs text-slate-500">{source.url}</span>
                    {source.context ? <span className="mt-2 block text-xs leading-5 text-slate-400">{source.context}</span> : null}
                  </a>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function OpportunityModal({ opportunity, onClose }: { opportunity: OpportunityRow; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="opportunity-modal-title" onMouseDown={onClose}>
      <div className="my-4 w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/50" onMouseDown={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/95 p-5 backdrop-blur sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${scoreClass(opportunity.total)}`}>{opportunity.total}/100</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">{opportunity.status}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">{opportunity.decision}</span>
                {opportunity.geography ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{opportunity.geography}</span> : null}
              </div>
              <h3 id="opportunity-modal-title" className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{opportunity.name}</h3>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{opportunity.summary}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.12]">
              Close
            </button>
          </div>
        </div>

        <div className="space-y-8 p-5 sm:p-6">
          <section>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-200/80">Search thesis</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <InfoBlock label="Market" value={opportunity.market} />
              <InfoBlock label="Customer" value={opportunity.customerSegment} />
              <InfoBlock label="Problem" value={opportunity.problem} />
              <InfoBlock label="Current solution" value={opportunity.currentSolution} />
              <InfoBlock label="Proposed product" value={opportunity.proposedProduct} />
              <InfoBlock label="Differentiation" value={opportunity.differentiation} />
              <InfoBlock label="Business model" value={opportunity.businessModel} />
              <InfoBlock label="Suggested pricing" value={opportunity.suggestedPricing ?? "Needs validation"} />
              <InfoBlock label="MVP" value={opportunity.mvp} />
              <InfoBlock label="Technical approach" value={opportunity.technicalApproach} />
              <InfoBlock label="First 10 customers" value={opportunity.distributionFirst10} />
              <InfoBlock label="Path to 100 customers" value={opportunity.distribution100} />
              <InfoBlock label="Risks" value={opportunity.risks} />
              <InfoBlock label="Why now" value={opportunity.whyNow} />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-200/80">Competitors</p>
                <h4 className="mt-2 text-xl font-semibold text-white">{opportunity.competitorCount} competitors found</h4>
              </div>
              <p className="text-sm text-slate-400">Names, URLs, pricing, positioning, strengths, weaknesses and source links.</p>
            </div>
            <div className="mt-4">
              <CompetitorsPanel opportunity={opportunity} />
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-emerald-200/80">Evidence</p>
                <h4 className="mt-2 text-xl font-semibold text-white">{opportunity.evidenceCount} evidence signals</h4>
              </div>
              <p className="text-sm text-slate-400">The URLs/signals attached to this opportunity.</p>
            </div>
            {opportunity.evidence.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-500">No evidence links stored.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {opportunity.evidence.map((signal) => (
                  <article key={signal.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-100">{signal.signalType}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">Credibility {signal.credibility}/5</span>
                      {signal.geography ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{signal.geography}</span> : null}
                      <span className="text-xs text-slate-500">{formatDate(signal.discoveredAt)}</span>
                    </div>
                    <a className="mt-3 block text-base font-semibold text-cyan-100 hover:text-cyan-50" href={signal.url} target="_blank" rel="noreferrer">{signal.title}</a>
                    <p className="mt-1 break-all text-xs text-slate-500">{signal.url}</p>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{signal.excerpt}</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <InfoBlock label="Pain point" value={signal.painPoint} />
                      <InfoBlock label="Current solution" value={signal.currentSolution} />
                      <InfoBlock label="Willingness to pay" value={signal.willingnessToPay} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export function OpportunityTable({ opportunities }: { opportunities: OpportunityRow[] }) {
  const [selected, setSelected] = useState<OpportunityRow | null>(null);

  return (
    <>
      <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Score</th>
                <th className="min-w-[18rem] px-4 py-3 font-semibold">Opportunity</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Verdict</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Market</th>
                <th className="min-w-[10rem] px-4 py-3 font-semibold">Customer</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Pricing</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Evidence</th>
                <th className="px-4 py-3 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {opportunities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No opportunities found yet. Run a research cycle to populate this table.
                  </td>
                </tr>
              ) : (
                opportunities.map((opportunity) => (
                  <tr
                    key={opportunity.id}
                    tabIndex={0}
                    onClick={() => setSelected(opportunity)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(opportunity);
                      }
                    }}
                    className="cursor-pointer bg-white/[0.025] align-top transition hover:bg-cyan-300/[0.06] focus:bg-cyan-300/[0.08] focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
                  >
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${scoreClass(opportunity.total)}`}>
                        {opportunity.total}/100
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{opportunity.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{opportunity.summary}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">{opportunity.status}</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">{opportunity.decision}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="text-slate-300">{opportunity.market}</p>
                      {opportunity.geography ? <p className="mt-1 text-xs text-slate-500">{opportunity.geography}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-slate-300">{opportunity.customerSegment}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-300">
                      {opportunity.suggestedPricing ?? <span className="text-slate-500">Needs validation</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">
                      <p className="text-lg font-semibold text-white">{opportunity.evidenceCount}</p>
                      <p className="text-xs text-slate-500">evidence</p>
                      <p className="mt-2 text-lg font-semibold text-white">{opportunity.competitorCount}</p>
                      <p className="text-xs text-slate-500">competitors</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100 ring-1 ring-cyan-300/20">Open modal</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? <OpportunityModal opportunity={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
