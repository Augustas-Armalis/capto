import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, aiMetric, userVocabulary, captionCorrection } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Learning" };
export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "augustas.armalis@aiacquisition.com";

// Capto's learning loop, made visible: which engine people correct the least
// (the signal the "Auto" engine ranks on), the vocabulary it's learned, and how
// much raw training data has accumulated. Admin-only.
export default async function LearningPage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) redirect("/signin");
  if ((session.user.email ?? "").toLowerCase() !== ADMIN_EMAIL) redirect("/dashboard");

  let engines: { provider: string; model: string; runs: number; words: number; editedWords: number; accuracy: number }[] = [];
  let vocab: { term: string; weight: number }[] = [];
  let corrections = 0;
  let correctionsTable = true;

  if (isConfigured.db()) {
    const db = getDb();
    try {
      const rows = await db.select().from(aiMetric);
      engines = rows
        .map((r) => ({
          provider: r.provider,
          model: r.model,
          runs: r.runs,
          words: r.words,
          editedWords: r.editedWords,
          accuracy: r.words > 0 ? Math.max(0, 1 - r.editedWords / r.words) : 1,
        }))
        .sort((a, b) => b.accuracy - a.accuracy || b.words - a.words);
    } catch {}
    try {
      const v = await db
        .select({ term: userVocabulary.term, weight: sql<number>`sum(${userVocabulary.weight})` })
        .from(userVocabulary)
        .groupBy(userVocabulary.term)
        .orderBy(desc(sql`sum(${userVocabulary.weight})`))
        .limit(40);
      vocab = v.map((r) => ({ term: r.term, weight: Number(r.weight) }));
    } catch {}
    try {
      const [c] = await db.select({ n: sql<number>`count(*)` }).from(captionCorrection);
      corrections = Number(c?.n ?? 0);
    } catch {
      correctionsTable = false; // migration 0005 not applied yet
    }
  }

  const totalRuns = engines.reduce((s, e) => s + e.runs, 0);
  const totalWords = engines.reduce((s, e) => s + e.words, 0);
  const totalEdited = engines.reduce((s, e) => s + e.editedWords, 0);
  const overallAcc = totalWords > 0 ? Math.max(0, 1 - totalEdited / totalWords) : 1;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10">
      <h1 className="heading text-4xl text-[var(--color-fg)]">Learning</h1>
      <p className="mt-2 text-[var(--color-fg-muted)]">
        How Capto&rsquo;s caption AI is improving from real usage — admin only.
      </p>

      {/* headline stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Transcriptions", value: totalRuns.toLocaleString() },
          { label: "Words transcribed", value: totalWords.toLocaleString() },
          { label: "Overall accuracy", value: pct(overallAcc) },
          { label: "Training pairs", value: correctionsTable ? corrections.toLocaleString() : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-5">
            <div className="text-xs uppercase tracking-wide text-[var(--color-fg-subtle)]">{s.label}</div>
            <div className="display mt-1 text-3xl tnum text-white">{s.value}</div>
          </div>
        ))}
      </div>

      {/* engine leaderboard */}
      <h2 className="heading mt-10 mb-3 text-lg">Engine accuracy (what &ldquo;Auto&rdquo; ranks on)</h2>
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-elev)] text-left text-[var(--color-fg-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Engine</th>
              <th className="px-4 py-2.5 font-medium tnum">Runs</th>
              <th className="px-4 py-2.5 font-medium tnum">Words</th>
              <th className="px-4 py-2.5 font-medium tnum">Edited</th>
              <th className="px-4 py-2.5 font-medium tnum">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {engines.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[var(--color-fg-subtle)]">No transcriptions recorded yet.</td></tr>
            ) : engines.map((e) => (
              <tr key={`${e.provider}/${e.model}`} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2.5 text-white">{e.provider} · {e.model}</td>
                <td className="px-4 py-2.5 tnum text-[var(--color-fg-muted)]">{e.runs.toLocaleString()}</td>
                <td className="px-4 py-2.5 tnum text-[var(--color-fg-muted)]">{e.words.toLocaleString()}</td>
                <td className="px-4 py-2.5 tnum text-[var(--color-fg-muted)]">{e.editedWords.toLocaleString()}</td>
                <td className="px-4 py-2.5 tnum font-semibold text-white">{pct(e.accuracy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">
        Accuracy = 1 − edited&nbsp;words / words. Higher means people corrected that engine less, so Auto prefers it.
      </p>

      {/* learned vocabulary */}
      <h2 className="heading mt-10 mb-3 text-lg">Learned vocabulary</h2>
      {vocab.length === 0 ? (
        <p className="text-sm text-[var(--color-fg-subtle)]">No terms learned yet — they appear as users fix proper nouns/brand names.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {vocab.map((v) => (
            <span key={v.term} className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-[var(--color-bg-elev)] px-2.5 py-1 text-sm text-[var(--color-fg)]">
              {v.term}<span className="tnum text-[var(--color-fg-subtle)]">×{v.weight}</span>
            </span>
          ))}
        </div>
      )}

      {/* dataset export */}
      <h2 className="heading mt-10 mb-3 text-lg">Training dataset</h2>
      {correctionsTable ? (
        <p className="text-sm text-[var(--color-fg-muted)]">
          {corrections.toLocaleString()} (AI&nbsp;→&nbsp;edited) caption pairs collected.{" "}
          <a href="/api/studio/feedback" download="capto-corrections.ndjson" className="text-[var(--color-brand)] underline-offset-2 hover:underline">
            Download dataset (NDJSON)
          </a>
        </p>
      ) : (
        <p className="text-sm text-[var(--color-warning)]">
          The training-pairs table isn&rsquo;t created yet — run <code className="rounded bg-[var(--color-bg-elev)] px-1.5 py-0.5">npm run db:migrate</code> to start collecting + enable export. (Engine accuracy + vocabulary above are already learning.)
        </p>
      )}
    </div>
  );
}
