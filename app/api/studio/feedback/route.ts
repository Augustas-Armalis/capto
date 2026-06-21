import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, captionCorrection } from "@/lib/db";
import { isConfigured } from "@/lib/env";
import { recordEdits, bumpVocabulary } from "@/lib/usage";

export const runtime = "nodejs";

const ADMIN_EMAIL = "augustas.armalis@aiacquisition.com";

// ── edit-signal helpers (shared shape with /api/ai/feedback) ──
function toWords(s: string): string[] {
  return (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s']/gu, " ").split(/\s+/).filter(Boolean);
}
/** Multiset symmetric-difference = words added + words removed. */
function editedCount(original: string, final: string): number {
  const counts = new Map<string, number>();
  for (const w of toWords(original)) counts.set(w, (counts.get(w) || 0) + 1);
  let added = 0;
  for (const w of toWords(final)) {
    const c = counts.get(w) || 0;
    if (c > 0) counts.set(w, c - 1);
    else added++;
  }
  let removed = 0;
  for (const c of counts.values()) removed += c;
  return added + removed;
}
/** Proper-noun-ish terms the user added that the AI didn't produce. */
function learnedTerms(original: string, final: string): string[] {
  const orig = new Set(toWords(original));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of (final || "").split(/\s+/)) {
    const term = raw.replace(/[^\p{L}\p{N}'-]/gu, "");
    if (term.length < 3 || !/^[A-Z]/.test(term)) continue;
    const lower = term.toLowerCase();
    if (orig.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    out.push(term);
  }
  return out;
}

function notConfigured() {
  return NextResponse.json(
    { error: "Server not configured (DATABASE_URL required)." },
    { status: 503 },
  );
}

const KINDS = [
  "text",
  "timing",
  "split",
  "merge",
  "delete",
  "add",
  "style",
  "regenerate",
] as const;

const EventSchema = z.object({
  kind: z.enum(KINDS),
  cueId: z.string().optional(),
  aiText: z.string().optional(),
  finalText: z.string().optional(),
  payload: z.any().optional(),
});

const PostSchema = z.object({
  projectId: z.string().optional(),
  engine: z.string().optional(),
  engineProvider: z.string().optional(),
  engineModel: z.string().optional(),
  language: z.string().optional(),
  events: z.array(EventSchema).max(200),
});

function clip(s: string | undefined): string | null {
  if (s == null) return null;
  return s.slice(0, 2000);
}

export async function POST(req: Request) {
  // Never error the editor: missing config or sign-in just means we don't record.
  if (!isConfigured.db()) return NextResponse.json({ ok: true, saved: 0 });

  const session = await getCurrentSession();
  if (!session?.user?.id) return NextResponse.json({ ok: true, saved: 0 });

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { projectId, engine, engineProvider, engineModel, language, events } = parsed.data;

  if (events.length === 0) return NextResponse.json({ ok: true, saved: 0 });

  const userId = session.user.id;

  // ── 1) LIVE learning loop — works regardless of the caption_correction
  // migration (ai_metric + user_vocabulary exist since 0001). Edits attributed to
  // the engine that ACTUALLY ran feed the "Auto" accuracy ranking; new proper
  // nouns become this user's learned vocabulary for future transcriptions.
  try {
    let edited = 0;
    const terms = new Set<string>();
    for (const e of events) {
      if (e.kind === "text" && e.aiText != null && e.finalText != null) {
        edited += editedCount(e.aiText, e.finalText);
        for (const t of learnedTerms(e.aiText, e.finalText)) terms.add(t);
      } else if (e.kind === "delete" && e.aiText) {
        edited += toWords(e.aiText).length; // a deleted AI line is fully "edited"
      }
    }
    if (edited > 0 && engineProvider && engineModel) await recordEdits(engineProvider, engineModel, edited);
    if (terms.size) await bumpVocabulary(userId, [...terms].slice(0, 40));
  } catch {
    /* learning is best-effort — never block the editor */
  }

  // ── 2) Raw training dataset — needs the 0005 migration; tolerate its absence
  // so the live loop above still runs until the table is created.
  let saved = 0;
  try {
    const rows = events.map((e) => ({
      id: crypto.randomUUID(),
      userId,
      projectId: projectId ?? null,
      engine: engineModel ?? engine ?? null,
      language: language ?? null,
      kind: e.kind,
      aiText: clip(e.aiText),
      finalText: clip(e.finalText),
      payload: e.payload ?? null,
    }));
    const db = getDb();
    await db.insert(captionCorrection).values(rows);
    saved = rows.length;
  } catch {
    /* caption_correction not migrated yet — skip the dataset write */
  }

  return NextResponse.json({ ok: true, saved });
}

export async function GET() {
  if (!isConfigured.db()) return notConfigured();
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if ((session.user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(captionCorrection)
    .orderBy(desc(captionCorrection.createdAt))
    .limit(50000);

  const ndjson = rows.map((r) => JSON.stringify(r)).join("\n");
  return new NextResponse(ndjson, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
