import Link from "next/link";
import { listInstructions, type ResearchInstruction } from "@/lib/research-instructions";
import {
  createInstructionAction,
  deactivateInstructionAction,
  reactivateInstructionAction,
  updateInstructionAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function priorityBadge(priority: number) {
  const colors: Record<number, string> = {
    5: "bg-violet-400/15 text-violet-100 ring-violet-300/20",
    4: "bg-cyan-400/15 text-cyan-100 ring-cyan-300/20",
    3: "bg-amber-400/15 text-amber-100 ring-amber-300/20",
    2: "bg-slate-400/15 text-slate-200 ring-slate-300/20",
    1: "bg-slate-400/10 text-slate-300 ring-slate-300/10",
  };
  return colors[priority] ?? colors[3];
}

function formatDate(iso: string) {
  return iso ? iso.slice(0, 10) : "—";
}

function PrioritySelect({ defaultValue = 3 }: { defaultValue?: number }) {
  return (
    <select
      name="priority"
      defaultValue={String(defaultValue)}
      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30"
    >
      <option value="5">5 — Highest</option>
      <option value="4">4 — High</option>
      <option value="3">3 — Medium</option>
      <option value="2">2 — Low</option>
      <option value="1">1 — Lowest</option>
    </select>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{children}</label>;
}

function InstructionEditForm({ item }: { item: ResearchInstruction }) {
  const updateAction = updateInstructionAction.bind(null, item.id);
  const deactivateAction = deactivateInstructionAction.bind(null, item.id);
  const reactivateAction = reactivateInstructionAction.bind(null, item.id);

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition hover:border-white/15">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${priorityBadge(item.priority)}`}>
          Priority {item.priority}
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100">{item.category}</span>
        {item.source ? <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-slate-400">{item.source}</span> : null}
        {item.isActive ? (
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs text-emerald-100 ring-1 ring-emerald-300/20">Active</span>
        ) : (
          <span className="rounded-full bg-slate-400/15 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-300/20">Inactive</span>
        )}
        <span className="ml-auto text-xs text-slate-500">Updated {formatDate(item.updatedAt)}</span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-100">{item.instruction}</p>
      {item.rationale ? <p className="mt-2 text-sm leading-6 text-slate-400">{item.rationale}</p> : null}

      <details className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">Edit instruction</summary>
        <form action={updateAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Category <span className="text-red-400">*</span></FieldLabel>
            <input name="category" required maxLength={120} defaultValue={item.category} className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div>
            <FieldLabel>Priority (1–5)</FieldLabel>
            <PrioritySelect defaultValue={item.priority} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Instruction <span className="text-red-400">*</span></FieldLabel>
            <textarea name="instruction" required maxLength={2000} rows={3} defaultValue={item.instruction} className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div>
            <FieldLabel>Why it matters</FieldLabel>
            <input name="rationale" maxLength={2000} defaultValue={item.rationale} className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div>
            <FieldLabel>Source</FieldLabel>
            <input name="source" maxLength={200} defaultValue={item.source} className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_active" value="true" defaultChecked={item.isActive} className="h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-cyan-400" />
              Active
            </label>
            <button type="submit" className="ml-auto rounded-xl bg-cyan-500/20 px-5 py-2 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-300/30 transition hover:bg-cyan-500/30">
              Save changes
            </button>
          </div>
        </form>
      </details>

      <div className="mt-4 flex justify-end">
        {item.isActive ? (
          <form action={deactivateAction}>
            <button type="submit" className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100 transition hover:bg-amber-400/20">Deactivate</button>
          </form>
        ) : (
          <form action={reactivateAction}>
            <button type="submit" className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100 transition hover:bg-emerald-400/20">Reactivate</button>
          </form>
        )}
      </div>
    </article>
  );
}

export default async function InstructionsPage() {
  const instructions = await listInstructions(true);
  const activeCount = instructions.filter((item) => item.isActive).length;
  const inactiveCount = instructions.length - activeCount;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/" className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-300/30 hover:bg-white/[0.09]">
          &larr; Back to dashboard
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 px-6 py-8 shadow-2xl shadow-cyan-950/20 sm:px-8">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-violet-200/80">Research rules</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Manage research instructions</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            These rules guide how opportunities are discovered, filtered, scored, and reported. You can create new instructions, edit existing ones, or deactivate rules that no longer apply.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-emerald-100 ring-1 ring-emerald-300/20">{activeCount} active</span>
            <span className="rounded-full bg-slate-400/15 px-3 py-1 text-slate-200 ring-1 ring-slate-300/20">{inactiveCount} inactive</span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-200/80">New instruction</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Add a research rule</h2>
        </div>

        <form action={createInstructionAction} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Category <span className="text-red-400">*</span></FieldLabel>
            <input name="category" required maxLength={120} placeholder="e.g. Discovery strategy" className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div>
            <FieldLabel>Priority (1–5)</FieldLabel>
            <PrioritySelect />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel>Instruction <span className="text-red-400">*</span></FieldLabel>
            <textarea name="instruction" required maxLength={2000} rows={3} placeholder="What the agent should do or follow" className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div>
            <FieldLabel>Why it matters</FieldLabel>
            <input name="rationale" maxLength={2000} placeholder="Optional explanation" className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div>
            <FieldLabel>Source</FieldLabel>
            <input name="source" maxLength={200} placeholder="e.g. user_prompt" className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="is_active" value="true" defaultChecked className="h-4 w-4 rounded border-white/20 bg-white/[0.06] accent-cyan-400" />
              Active immediately
            </label>
            <button type="submit" className="ml-auto rounded-xl bg-cyan-500/20 px-6 py-2.5 text-sm font-semibold text-cyan-100 ring-1 ring-cyan-300/30 transition hover:bg-cyan-500/30">
              Create instruction
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-200/80">All instructions</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Active and inactive rules ({instructions.length})</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-400">Deactivate is a safe soft-delete. Inactive rules remain visible here and can be reactivated.</p>
        </div>

        <div className="mt-5 space-y-4">
          {instructions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-slate-400">No instructions found.</div>
          ) : (
            instructions.map((item) => <InstructionEditForm key={item.id} item={item} />)
          )}
        </div>
      </section>
    </main>
  );
}
