import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { isConfigured } from "@/lib/env";
import { recordEdits, bumpVocabulary } from "@/lib/usage";

export const runtime = "nodejs";

// The learning loop's write side. When a user saves a project we compare the
// captions they kept against what the AI first produced: how much they changed
// is an accuracy signal per engine, and the new proper nouns they added become
// learned vocabulary that biases their future transcriptions. No audio, no raw
// transcript is stored — only counts + short terms.

function words(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Multiset symmetric-difference size = words added + words removed. */
function editedCount(original: string, final: string): number {
  const counts = new Map<string, number>();
  for (const w of words(original)) counts.set(w, (counts.get(w) || 0) + 1);
  let added = 0;
  for (const w of words(final)) {
    const c = counts.get(w) || 0;
    if (c > 0) counts.set(w, c - 1);
    else added++;
  }
  let removed = 0;
  for (const c of counts.values()) removed += c;
  return added + removed;
}

/** Capitalized terms present in the final text but absent from the AI output. */
function learnedTerms(original: string, final: string): string[] {
  const orig = new Set(words(original));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of (final || "").split(/\s+/)) {
    const term = raw.replace(/[^\p{L}\p{N}'-]/gu, "");
    if (term.length < 3) continue;
    if (!/^[A-Z]/.test(term)) continue; // proper-noun-ish
    const lower = term.toLowerCase();
    if (orig.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    out.push(term);
  }
  return out.slice(0, 25);
}

export async function POST(req: Request) {
  if (!isConfigured.db()) return NextResponse.json({ ok: true });
  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ ok: true });

  const body = (await req.json().catch(() => null)) as {
    provider?: string;
    model?: string;
    originalText?: string;
    finalText?: string;
  } | null;
  if (!body?.originalText || !body?.finalText) return NextResponse.json({ ok: true });

  const original = body.originalText.slice(0, 20_000);
  const final = body.finalText.slice(0, 20_000);

  const edited = editedCount(original, final);
  if (body.provider && body.model) {
    void recordEdits(body.provider, body.model, edited);
  }
  void bumpVocabulary(session.user.id, learnedTerms(original, final));

  return NextResponse.json({ ok: true, edited });
}
