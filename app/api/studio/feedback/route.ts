import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/session";
import { getDb, captionCorrection } from "@/lib/db";
import { isConfigured } from "@/lib/env";

export const runtime = "nodejs";

const ADMIN_EMAIL = "augustas.armalis@aiacquisition.com";

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
  const { projectId, engine, language, events } = parsed.data;

  if (events.length === 0) return NextResponse.json({ ok: true, saved: 0 });

  const userId = session.user.id;
  const rows = events.map((e) => ({
    id: crypto.randomUUID(),
    userId,
    projectId: projectId ?? null,
    engine: engine ?? null,
    language: language ?? null,
    kind: e.kind,
    aiText: clip(e.aiText),
    finalText: clip(e.finalText),
    payload: e.payload ?? null,
  }));

  const db = getDb();
  await db.insert(captionCorrection).values(rows);

  return NextResponse.json({ ok: true, saved: rows.length });
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
