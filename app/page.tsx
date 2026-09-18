import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import { OpportunityTable } from "./OpportunityTable";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 16).replace("T", " ");
}

function scoreClass(score: number) {
  if (score >= 80) return "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30";
  if (score >= 70) return "bg-cyan-400/15 text-cyan-100 ring-cyan-300/30";
  if (score >= 60) return "bg-amber-400/15 text-amber-100 ring-amber-300/30";
  return "bg-slate-400/15 text-slate-200 ring-slate-300/20";
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-slate-950/20">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value.toLocaleString()}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default async function Home() {
  const { stats, opportunities, runs, signals, backlog, instructions } = await getDashboardData();
  const topOpportunity = opportunities[0];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 px-6 py-8 shadow-2xl shadow-cyan-950/20 sm:px-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-200/80">Search Market</p>
          <div className="mt-4 max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              Opportunity intelligence dashboard
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              Live view of the software-market research database: scored opportunities, plain-language summaries,
              evidence signals, daily runs, and next validation tasks.
            </p>
            <Link
              href="/instructions"
              className="mt-5 inline-block rounded-xl bg-violet-500/15 px-5 py-2.5 text-sm font-semibold text-violet-100 ring-1 ring-violet-300/30 transition hover:bg-violet-500/25"
            >
              Manage research instructions
            </Link>
          </div>
          {topOpportunity ? (
            <div className="mt-8 rounded-3xl border border-cyan-300/20 bg-cyan-300/[0.06] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${scoreClass(topOpportunity.total)}`}>
                  Top score {topOpportunity.total}/100
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">{topOpportunity.status}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">{topOpportunity.decision}</span>
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-white">{topOpportunity.name}</h2>
              <p className="mt-3 max-w-5xl text-sm leading-6 text-slate-300">{topOpportunity.summary}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard label="Research runs" value={stats.researchRuns} hint="Daily/manual executions" />
        <StatCard label="Signals" value={stats.marketSignals} hint="Evidence items collected" />
        <StatCard label="Sources" value={stats.sources} hint="Unique URLs tracked" />
        <StatCard label="Opportunities" value={stats.opportunities} hint="Deduplicated theses" />
        <StatCard label="Rejected" value={stats.rejectedIdeas} hint="Ideas ruled out" />
        <StatCard label="Backlog" value={stats.openBacklog} hint="Open validation tasks" />
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-slate-950/20 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-violet-200/80">Ranked opportunities</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">What the searches found</h2>
          </div>
          <p className="text-sm text-slate-400">Sorted by latest score. Each row includes a non-technical summary.</p>
        </div>

        <OpportunityTable opportunities={opportunities} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
          <h2 className="text-2xl font-semibold text-white">Recent research runs</h2>
          <div className="mt-5 space-y-3">
            {runs.map((run) => (
              <div key={run.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">#{run.id} · {run.runType}</p>
                  <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-100">{run.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">Started {formatDate(run.startedAt)} · Finished {formatDate(run.finishedAt)}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-xl bg-white/[0.06] p-2"><b>{run.searchesPerformed}</b><br /><span className="text-slate-500">searches</span></div>
                  <div className="rounded-xl bg-white/[0.06] p-2"><b>{run.signalsCollected}</b><br /><span className="text-slate-500">signals</span></div>
                  <div className="rounded-xl bg-white/[0.06] p-2"><b>{run.newOpportunities}</b><br /><span className="text-slate-500">new opps</span></div>
                </div>
                {run.reportPath ? <p className="mt-3 break-all text-xs text-cyan-200">{run.reportPath}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
          <h2 className="text-2xl font-semibold text-white">Open validation backlog</h2>
          <div className="mt-5 space-y-3">
            {backlog.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs text-amber-100">Priority {item.priority}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{item.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">{item.task}</p>
                {item.opportunityName ? <p className="mt-2 text-xs text-slate-500">For: {item.opportunityName}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-200/80">Research rules</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Instructions the agent follows</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-400">
            These are the active research instructions stored in Postgres. They explain how opportunities are discovered,
            filtered, scored, rejected, and reported.
          </p>
        </div>
        <div className="mt-5 overflow-hidden rounded-3xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="min-w-[28rem] px-4 py-3 font-semibold">Instruction</th>
                  <th className="min-w-[18rem] px-4 py-3 font-semibold">Why it matters</th>
                  <th className="px-4 py-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {instructions.map((item) => (
                  <tr key={item.id} className="bg-white/[0.025] align-top transition hover:bg-white/[0.055]">
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded-full bg-violet-400/15 px-3 py-1 text-xs font-semibold text-violet-100 ring-1 ring-violet-300/20">
                        {item.priority}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium text-cyan-100">{item.category}</td>
                    <td className="px-4 py-4 leading-6 text-slate-100">{item.instruction}</td>
                    <td className="px-4 py-4 leading-6 text-slate-400">{item.rationale || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <h2 className="text-2xl font-semibold text-white">Latest evidence signals</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {signals.map((signal) => (
            <a key={signal.id} href={signal.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-300/30 hover:bg-white/[0.07]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-400/15 px-3 py-1 text-xs text-cyan-100">{signal.signalType}</span>
                {signal.geography ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{signal.geography}</span> : null}
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-slate-100">{signal.title}</p>
              <p className="mt-2 text-xs text-slate-500">{formatDate(signal.discoveredAt)}</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
