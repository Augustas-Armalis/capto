"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Save,
  CheckCircle2,
  Trash2,
  Check,
  Crown,
  ArrowRight,
  Camera,
  X,
  Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { STT_MODELS, PROVIDER_LABEL, PLAN_RANK, type AiProvider } from "@/lib/ai/models";
import { TeamSection } from "@/components/app/team-section";

type Provider = AiProvider;
type ApiKeyMeta = { provider: Provider; label: string | null; lastUsedAt: string | null };
type Plan = "free" | "pro" | "ultra";

const PROVIDERS: { id: Provider; name: string; placeholder: string; hint: string }[] = [
  { id: "groq", name: "Groq", placeholder: "gsk_…", hint: "Recommended · fast & free tier" },
  { id: "openai", name: "OpenAI", placeholder: "sk-…", hint: "Whisper, pay-per-use" },
  { id: "deepgram", name: "Deepgram", placeholder: "Token…", hint: "Nova-3 · premium accuracy" },
  { id: "gemini", name: "Gemini", placeholder: "AIza…", hint: "Powers translate & emoji" },
];

export function SettingsClient({
  name,
  email,
  image = null,
  plan = "free",
  subscriptionStatus,
  aiProvider = "auto",
  aiUseOwnKey = false,
}: {
  name: string;
  email: string;
  image?: string | null;
  plan?: Plan;
  subscriptionStatus?: string | null;
  aiProvider?: string;
  aiUseOwnKey?: boolean;
}) {
  const router = useRouter();
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(image);
  const [avatarSaving, setAvatarSaving] = React.useState(false);
  const [avatarErr, setAvatarErr] = React.useState<string | null>(null);

  const [keyInputs, setKeyInputs] = React.useState<Record<Provider, string>>({
    groq: "",
    openai: "",
    deepgram: "",
    gemini: "",
  });
  const [meta, setMeta] = React.useState<ApiKeyMeta[]>([]);
  const [saving, setSaving] = React.useState<Provider | null>(null);
  const [savedAt, setSavedAt] = React.useState<Partial<Record<Provider, number>>>({});

  // AI engine preference
  const [engine, setEngine] = React.useState(aiProvider);
  const [useOwn, setUseOwn] = React.useState(aiUseOwnKey);
  const [engineSaving, setEngineSaving] = React.useState(false);
  const [engineSaved, setEngineSaved] = React.useState(false);
  const [usage, setUsage] = React.useState<{
    usedMinutes: number;
    limitMinutes: number | null;
    unlimited: boolean;
  } | null>(null);

  // Profile name
  const [displayName, setDisplayName] = React.useState(name);
  const [nameSaving, setNameSaving] = React.useState(false);
  const [nameSaved, setNameSaved] = React.useState(false);

  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/user/api-keys").then((r) => r.json()).then((j) => setMeta(j.keys || [])).catch(() => {});
    fetch("/api/usage/ai").then((r) => r.json()).then(setUsage).catch(() => {});
  }, []);

  async function saveName() {
    if (!displayName.trim() || displayName.trim() === name) return;
    setNameSaving(true);
    setNameSaved(false);
    try {
      const r = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() }),
      });
      if (!r.ok) throw new Error();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
      router.refresh();
    } finally {
      setNameSaving(false);
    }
  }

  async function saveEngine() {
    setEngineSaving(true);
    setEngineSaved(false);
    try {
      const r = await fetch("/api/account/ai-prefs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ aiProvider: engine, aiUseOwnKey: useOwn }),
      });
      if (!r.ok) throw new Error();
      setEngineSaved(true);
      setTimeout(() => setEngineSaved(false), 2500);
      router.refresh();
    } finally {
      setEngineSaving(false);
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarErr(null);
    if (!file.type.startsWith("image/")) {
      setAvatarErr("Choose an image file.");
      return;
    }
    setAvatarSaving(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const size = 256;
          const c = document.createElement("canvas");
          c.width = size;
          c.height = size;
          const ctx = c.getContext("2d");
          if (!ctx) return reject(new Error("no canvas"));
          const s = Math.min(img.width, img.height);
          const sx = (img.width - s) / 2;
          const sy = (img.height - s) / 2;
          ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Could not read that image."));
        };
        img.src = url;
      });
      const r = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Could not save the picture.");
      }
      setAvatar(dataUrl);
      router.refresh();
    } catch (err) {
      setAvatarErr(err instanceof Error ? err.message : "Could not save the picture.");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function removeAvatar() {
    setAvatarSaving(true);
    setAvatarErr(null);
    try {
      const r = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: null }),
      });
      if (!r.ok) throw new Error();
      setAvatar(null);
      router.refresh();
    } catch {
      setAvatarErr("Could not remove the picture.");
    } finally {
      setAvatarSaving(false);
    }
  }

  async function deleteAccount() {
    if (!confirm("Delete your account permanently? This removes your projects and cancels any subscription. This cannot be undone.")) return;
    if (!confirm("Are you absolutely sure? There is no going back.")) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/account/delete", { method: "POST" });
      if (!r.ok) throw new Error();
      window.location.href = "/";
    } catch {
      setDeleting(false);
      alert("Could not delete the account. Please try again.");
    }
  }

  async function saveKey(provider: Provider) {
    const key = keyInputs[provider];
    if (!key.trim()) return;
    setSaving(provider);
    try {
      const r = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error || "Could not save that key.");
        return;
      }
      setSavedAt((s) => ({ ...s, [provider]: Date.now() }));
      setKeyInputs((s) => ({ ...s, [provider]: "" }));
      const list = await fetch("/api/user/api-keys").then((r) => r.json());
      setMeta(list.keys || []);
    } finally {
      setSaving(null);
    }
  }

  async function deleteKey(provider: Provider) {
    if (!confirm(`Delete your ${PROVIDER_LABEL[provider]} key? This can't be undone.`)) return;
    await fetch(`/api/user/api-keys?provider=${provider}`, { method: "DELETE" });
    const list = await fetch("/api/user/api-keys").then((r) => r.json());
    setMeta(list.keys || []);
  }

  const has = (p: Provider) => meta.some((m) => m.provider === p);
  const planLabel = plan === "free" ? "Free" : plan === "pro" ? "Pro" : "Ultra";

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10 lg:px-10">
      <h1 className="heading text-4xl">Settings</h1>
      <p className="mt-2 text-[var(--color-fg-muted)]">Profile, plan, and AI connections.</p>

      {/* Plan & billing */}
      <section className="mt-10 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
              <Crown className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{planLabel} plan</h2>
                {subscriptionStatus && plan !== "free" && (
                  <Badge variant={subscriptionStatus === "active" ? "brand" : "outline"}>{subscriptionStatus}</Badge>
                )}
              </div>
              <p className="text-sm text-[var(--color-fg-muted)]">
                {plan === "free"
                  ? "You're on the free plan. Upgrade for unlimited, watermark-free, lossless exports."
                  : "Manage billing, change plan, or cancel from the billing portal."}
              </p>
            </div>
          </div>
          <Button href="/billing" variant={plan === "free" ? "primary" : "secondary"} size="md">
            {plan === "free" ? "Upgrade" : "Manage billing"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </section>

      {/* Profile */}
      <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <h2 className="text-lg font-semibold">Profile</h2>

        <div className="mt-5 flex items-center gap-5">
          <div className="relative">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="size-full object-cover" />
              ) : (
                <span className="heading text-2xl text-[var(--color-fg-muted)]">
                  {(displayName || email || "?").trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarSaving}
              aria-label="Change profile picture"
              className="absolute -bottom-1 -right-1 inline-flex size-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elev)] text-[var(--color-fg)] shadow-sm hover:bg-[var(--color-bg-soft)] disabled:opacity-60"
            >
              <Camera className="size-3.5" />
            </button>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => avatarInputRef.current?.click()} loading={avatarSaving} variant="secondary" size="sm">
                {avatar ? "Change picture" : "Upload picture"}
              </Button>
              {avatar && (
                <Button onClick={removeAvatar} disabled={avatarSaving} variant="ghost" size="sm">
                  <X className="size-4" />
                  Remove
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--color-fg-subtle)]">PNG or JPG. We crop it to a square.</p>
            {avatarErr && <p className="mt-1 text-xs text-[var(--color-danger)]">{avatarErr}</p>}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">Name</label>
            <div className="flex gap-2">
              <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} />
              <Button onClick={saveName} loading={nameSaving} disabled={!displayName.trim() || displayName.trim() === name}>
                {nameSaved ? <Check className="size-4 text-[var(--color-success)]" /> : <Save className="size-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="profile-email" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">Email</label>
            <Input id="profile-email" defaultValue={email} disabled />
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-fg-subtle)]">
          To change your email, contact hello@capto.video. Reset your password from the sign-in page.
        </p>
      </section>

      {/* AI engine */}
      <section className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
              <Cpu className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">AI engine</h2>
              <p className="text-sm text-[var(--color-fg-muted)]">
                {plan === "free"
                  ? "Free uses our managed AI within your monthly allowance — or plug in your own key for more."
                  : "Runs on our managed AI by default. Switch to your own key any time."}
              </p>
            </div>
          </div>
        </div>

        {usage && (
          <div className="mt-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-fg-muted)]">AI source minutes this month</span>
              <span className="mono tnum text-white">
                {usage.unlimited || usage.limitMinutes === null
                  ? `${usage.usedMinutes} min · Unlimited`
                  : `${usage.usedMinutes} / ${usage.limitMinutes} min`}
              </span>
            </div>
            {!usage.unlimited && usage.limitMinutes !== null && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--color-brand)] transition-[width]"
                  style={{ width: `${Math.min(100, (usage.usedMinutes / Math.max(1, usage.limitMinutes)) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="engine" className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-muted)]">Model</label>
            <select
              id="engine"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="w-full rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-white/25"
            >
              <option value="auto" className="bg-[var(--color-bg-elev)]">Auto — best engine (improves over time)</option>
              {STT_MODELS.map((m) => {
                // Gated models are selectable only on a high-enough plan, or when
                // running on your own key (BYOK ignores plan tiers).
                const locked = !useOwn && PLAN_RANK[m.minPlan] > PLAN_RANK[plan];
                return (
                  <option key={m.id} value={m.id} disabled={locked} className="bg-[var(--color-bg-elev)]">
                    {m.label}
                    {m.minPlan !== "free" ? ` · ${m.minPlan === "pro" ? "Pro" : "Ultra"}` : ""}
                    {locked ? " (upgrade)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={useOwn}
                onChange={(e) => setUseOwn(e.target.checked)}
                className="size-4 accent-[var(--color-brand)]"
              />
              <span className="text-white">Use my own key when available</span>
            </label>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={saveEngine} loading={engineSaving} size="md" variant="secondary">
            {engineSaved ? <Check className="size-4 text-[var(--color-success)]" /> : <Save className="size-4" />}
            Save engine
          </Button>
        </div>
      </section>

      {/* Team workspace (Ultra) */}
      <TeamSection />

      {/* API keys */}
      <section id="api-keys" className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Your API keys</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Encrypted with AES-256-GCM before storage. Optional — paid plans get managed AI. Bring your own to run on your account.
            </p>
          </div>
          <Badge variant="outline">
            <KeyRound className="size-3" />
            Encrypted
          </Badge>
        </div>

        <div className="mt-6 space-y-4">
          {PROVIDERS.map((p) => (
            <div key={p.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-xs text-[var(--color-fg-subtle)]">{p.hint}</div>
                </div>
                {has(p.id) && (
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">
                      <CheckCircle2 className="size-3" />
                      Connected
                    </Badge>
                    <button
                      onClick={() => deleteKey(p.id)}
                      aria-label={`Delete ${p.name} key`}
                      className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder={has(p.id) ? "Replace existing key…" : p.placeholder}
                  value={keyInputs[p.id]}
                  onChange={(e) => setKeyInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                  className="font-mono text-sm"
                  autoComplete="off"
                />
                <Button onClick={() => saveKey(p.id)} loading={saving === p.id} disabled={!keyInputs[p.id].trim()}>
                  <Save className="size-4" />
                  Save
                </Button>
              </div>
              {savedAt[p.id] && Date.now() - (savedAt[p.id] as number) < 4000 && (
                <p className="mt-2 text-xs text-[var(--color-brand)]">Saved.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="mt-6 rounded-3xl border border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.04] p-7">
        <h2 className="text-lg font-semibold text-[var(--color-danger)]">Delete account</h2>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Permanently delete your account, projects, and saved keys. Any active subscription is cancelled. This cannot be undone.
        </p>
        <Button onClick={deleteAccount} loading={deleting} variant="destructive" size="md" className="mt-5">
          <Trash2 className="size-4" />
          Delete my account
        </Button>
      </section>
    </div>
  );
}
