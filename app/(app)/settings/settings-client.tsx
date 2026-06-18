"use client";

import * as React from "react";
import { KeyRound, Save, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ApiKeyMeta = { provider: "groq" | "openai"; label: string | null; lastUsedAt: string | null };

export function SettingsClient({ name, email }: { name: string; email: string }) {
  const [groqKey, setGroqKey] = React.useState("");
  const [openaiKey, setOpenaiKey] = React.useState("");
  const [meta, setMeta] = React.useState<ApiKeyMeta[]>([]);
  const [saving, setSaving] = React.useState<null | "groq" | "openai">(null);
  const [savedAt, setSavedAt] = React.useState<{ groq?: number; openai?: number }>({});

  React.useEffect(() => {
    fetch("/api/user/api-keys")
      .then((r) => r.json())
      .then((j) => setMeta(j.keys || []))
      .catch(() => {});
  }, []);

  async function saveKey(provider: "groq" | "openai") {
    const key = provider === "groq" ? groqKey : openaiKey;
    if (!key.trim()) return;
    setSaving(provider);
    try {
      const r = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      if (!r.ok) throw new Error();
      setSavedAt((s) => ({ ...s, [provider]: Date.now() }));
      if (provider === "groq") setGroqKey("");
      else setOpenaiKey("");
      const list = await fetch("/api/user/api-keys").then((r) => r.json());
      setMeta(list.keys || []);
    } finally {
      setSaving(null);
    }
  }

  async function deleteKey(provider: "groq" | "openai") {
    if (!confirm(`Delete your ${provider.toUpperCase()} key? This can't be undone.`)) return;
    await fetch(`/api/user/api-keys?provider=${provider}`, { method: "DELETE" });
    const list = await fetch("/api/user/api-keys").then((r) => r.json());
    setMeta(list.keys || []);
  }

  const hasGroq = meta.some((m) => m.provider === "groq");
  const hasOpenai = meta.some((m) => m.provider === "openai");

  return (
    <div className="px-6 lg:px-10 py-10 max-w-3xl mx-auto w-full">
      <h1 className="heading text-4xl ">Settings</h1>
      <p className="mt-2 text-[var(--color-fg-muted)]">Profile and API connections.</p>

      <section className="mt-10 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">Name</label>
            <Input defaultValue={name} disabled />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--color-fg-muted)] uppercase tracking-wider">Email</label>
            <Input defaultValue={email} disabled />
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-fg-subtle)]">
          Email us at hello@capto.video to change these (we'll add inline editing soon).
        </p>
      </section>

      <section id="api-keys" className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">API keys</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Encrypted with AES-256-GCM before storage. Used only when you transcribe.
            </p>
          </div>
          <Badge variant="outline">
            <KeyRound className="size-3" />
            Encrypted
          </Badge>
        </div>

        <div className="mt-6 space-y-5">
          {/* Groq */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Groq</div>
                <div className="text-xs text-[var(--color-fg-subtle)]">Recommended, fast & free tier</div>
              </div>
              {hasGroq && (
                <div className="flex items-center gap-2">
                  <Badge variant="brand">
                    <CheckCircle2 className="size-3" />
                    Connected
                  </Badge>
                  <button
                    onClick={() => deleteKey("groq")}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-elev)]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder={hasGroq ? "Replace existing key…" : "gsk_…"}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                className="font-mono text-sm"
                autoComplete="off"
              />
              <Button onClick={() => saveKey("groq")} loading={saving === "groq"} disabled={!groqKey.trim()}>
                <Save className="size-4" />
                Save
              </Button>
            </div>
            {savedAt.groq && Date.now() - savedAt.groq < 4000 && (
              <p className="mt-2 text-xs text-[var(--color-brand)]">Saved.</p>
            )}
          </div>

          {/* OpenAI */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">OpenAI</div>
                <div className="text-xs text-[var(--color-fg-subtle)]">Optional, pay-per-use Whisper</div>
              </div>
              {hasOpenai && (
                <div className="flex items-center gap-2">
                  <Badge variant="brand">
                    <CheckCircle2 className="size-3" />
                    Connected
                  </Badge>
                  <button
                    onClick={() => deleteKey("openai")}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:text-[var(--color-danger)] hover:bg-[var(--color-bg-elev)]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                placeholder={hasOpenai ? "Replace existing key…" : "sk-…"}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="font-mono text-sm"
                autoComplete="off"
              />
              <Button onClick={() => saveKey("openai")} loading={saving === "openai"} disabled={!openaiKey.trim()}>
                <Save className="size-4" />
                Save
              </Button>
            </div>
            {savedAt.openai && Date.now() - savedAt.openai < 4000 && (
              <p className="mt-2 text-xs text-[var(--color-brand)]">Saved.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
