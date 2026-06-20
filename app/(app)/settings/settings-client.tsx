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
  User,
  Users,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { TeamSection } from "@/components/app/team-section";
import { STT_MODELS, PROVIDER_LABEL, PLAN_RANK, type AiProvider } from "@/lib/ai/models";
import { changeEmail, changePassword } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Provider = AiProvider;
type ApiKeyMeta = { provider: Provider; label: string | null; lastUsedAt: string | null };
type Plan = "free" | "pro" | "ultra";
type Tab = "profile" | "ai" | "keys" | "team" | "account";

const PROVIDERS: { id: Provider; name: string; placeholder: string; hint: string }[] = [
  { id: "groq", name: "Groq", placeholder: "gsk_…", hint: "Recommended · fast & free tier" },
  { id: "openai", name: "OpenAI", placeholder: "sk-…", hint: "Whisper, pay-per-use" },
  { id: "deepgram", name: "Deepgram", placeholder: "Token…", hint: "Nova-3 · premium accuracy" },
  { id: "gemini", name: "Gemini", placeholder: "AIza…", hint: "Powers translate & emoji" },
];

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "ai", label: "AI & Models", icon: Cpu },
  { id: "keys", label: "API keys", icon: KeyRound },
  { id: "team", label: "Team", icon: Users },
  { id: "account", label: "Account", icon: ShieldAlert },
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
  const [tab, setTab] = React.useState<Tab>("profile");

  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(image);
  const [avatarSaving, setAvatarSaving] = React.useState(false);
  const [avatarErr, setAvatarErr] = React.useState<string | null>(null);

  const [keyInputs, setKeyInputs] = React.useState<Record<Provider, string>>({
    groq: "", openai: "", deepgram: "", gemini: "",
  });
  const [meta, setMeta] = React.useState<ApiKeyMeta[]>([]);
  const [saving, setSaving] = React.useState<Provider | null>(null);
  const [savedAt, setSavedAt] = React.useState<Partial<Record<Provider, number>>>({});

  const [engine, setEngine] = React.useState(aiProvider);
  const [useOwn, setUseOwn] = React.useState(aiUseOwnKey);
  const [engineSaving, setEngineSaving] = React.useState(false);
  const [engineSaved, setEngineSaved] = React.useState(false);
  const [engineErr, setEngineErr] = React.useState<string | null>(null);
  const [usage, setUsage] = React.useState<{ usedMinutes: number; limitMinutes: number | null; unlimited: boolean } | null>(null);

  const [displayName, setDisplayName] = React.useState(name);
  const [nameSaving, setNameSaving] = React.useState(false);
  const [nameSaved, setNameSaved] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // change email
  const [newEmail, setNewEmail] = React.useState(email);
  const [emailBusy, setEmailBusy] = React.useState(false);
  const [emailMsg, setEmailMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  async function saveEmail() {
    const e = newEmail.trim();
    if (!e || e === email) return;
    setEmailBusy(true);
    setEmailMsg(null);
    try {
      const res = await changeEmail({ newEmail: e });
      if (res?.error) throw new Error(res.error.message || "Could not change email.");
      setEmailMsg({ ok: true, text: "Email updated." });
    } catch (err) {
      setEmailMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change email." });
    } finally {
      setEmailBusy(false);
    }
  }

  // change password
  const [curPwd, setCurPwd] = React.useState("");
  const [newPwd, setNewPwd] = React.useState("");
  const [pwdBusy, setPwdBusy] = React.useState(false);
  const [pwdMsg, setPwdMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  async function savePassword() {
    if (newPwd.length < 8) {
      setPwdMsg({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }
    setPwdBusy(true);
    setPwdMsg(null);
    try {
      const res = await changePassword({ currentPassword: curPwd, newPassword: newPwd, revokeOtherSessions: true });
      if (res?.error) throw new Error(res.error.message || "Could not change password.");
      setPwdMsg({ ok: true, text: "Password changed." });
      setCurPwd("");
      setNewPwd("");
    } catch (err) {
      setPwdMsg({ ok: false, text: err instanceof Error ? err.message : "Could not change password." });
    } finally {
      setPwdBusy(false);
    }
  }

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
        method: "PUT", headers: { "content-type": "application/json" },
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
    setEngineErr(null);
    try {
      const r = await fetch("/api/account/ai-prefs", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ aiProvider: engine, aiUseOwnKey: useOwn }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not save.");
      setEngineSaved(true);
      setTimeout(() => setEngineSaved(false), 2500);
      router.refresh();
    } catch (e) {
      setEngineErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setEngineSaving(false);
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarErr(null);
    if (!file.type.startsWith("image/")) return setAvatarErr("Choose an image file.");
    setAvatarSaving(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const size = 256;
          const c = document.createElement("canvas");
          c.width = size; c.height = size;
          const ctx = c.getContext("2d");
          if (!ctx) return reject(new Error("no canvas"));
          const s = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
        img.src = url;
      });
      const r = await fetch("/api/account/profile", {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || "Could not save the picture."); }
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
        method: "PUT", headers: { "content-type": "application/json" },
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
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || "Could not save that key."); return; }
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

  // Only offer engines the user can actually run: Groq is always available (our
  // house key); every other provider's models appear only once its key is saved
  // under API keys. Models above the user's plan are hidden too.
  const engineOptions = [
    { value: "auto", label: "Auto — best Groq engine (improves over time)" },
    ...STT_MODELS.filter((m) => {
      if (m.provider !== "groq" && !has(m.provider as Provider)) return false;
      if (PLAN_RANK[m.minPlan] > PLAN_RANK[plan]) return false;
      return true;
    }).map((m) => ({
      value: m.id,
      label: m.label,
      hint: m.provider === "groq" ? undefined : "your key",
    })),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 lg:py-12">
      <h1 className="display text-3xl text-white sm:text-4xl">Settings</h1>
      <p className="mt-2 text-[var(--color-fg-muted)]">Profile, AI, team, and connections.</p>

      <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
        {/* Sidebar nav — horizontal scroll on mobile, vertical on desktop */}
        <nav className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:mx-0 md:flex-col md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors md:w-full",
                tab === item.id
                  ? "border border-[var(--color-brand)]/30 bg-[var(--color-brand-soft)] text-white"
                  : "border border-transparent text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev)]/60 hover:text-[var(--color-fg)]",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 space-y-6">
          {tab === "profile" && (
            <>
              <Section title="Plan">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
                      <Crown className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{planLabel} plan</h3>
                        {subscriptionStatus && plan !== "free" && (
                          <Badge variant={subscriptionStatus === "active" ? "brand" : "outline"}>{subscriptionStatus}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-fg-muted)]">
                        {plan === "free" ? "Upgrade for unlimited, watermark-free, lossless exports." : "Manage billing or change plan."}
                      </p>
                    </div>
                  </div>
                  <Button href="/billing" variant={plan === "free" ? "primary" : "secondary"} size="md">
                    {plan === "free" ? "Upgrade" : "Manage billing"}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </Section>

              <Section title="Profile">
                <div className="flex items-center gap-5">
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
                          <X className="size-4" /> Remove
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
                    <label htmlFor="profile-name" className="eyebrow block">Name</label>
                    <div className="flex gap-2">
                      <Input id="profile-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} />
                      <Button onClick={saveName} loading={nameSaving} disabled={!displayName.trim() || displayName.trim() === name}>
                        {nameSaved ? <Check className="size-4 text-[var(--color-success)]" /> : <Save className="size-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="profile-email" className="eyebrow block">Email</label>
                    <div className="flex gap-2">
                      <Input id="profile-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" />
                      <Button onClick={saveEmail} loading={emailBusy} disabled={!newEmail.trim() || newEmail.trim() === email}>
                        <Save className="size-4" />
                      </Button>
                    </div>
                    {emailMsg && (
                      <p className={cn("text-xs", emailMsg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>{emailMsg.text}</p>
                    )}
                  </div>
                </div>

                {/* Change password */}
                <div className="mt-7 border-t border-[var(--color-border)] pt-6">
                  <h3 className="text-sm font-semibold">Change password</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Input type="password" placeholder="Current password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} autoComplete="current-password" />
                    <Input type="password" placeholder="New password (min 8)" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} autoComplete="new-password" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button onClick={savePassword} loading={pwdBusy} disabled={!curPwd || !newPwd}>
                      <Save className="size-4" /> Update password
                    </Button>
                    {pwdMsg && (
                      <span className={cn("text-xs", pwdMsg.ok ? "text-[var(--color-success)]" : "text-[var(--color-danger)]")}>{pwdMsg.text}</span>
                    )}
                  </div>
                </div>
              </Section>
            </>
          )}

          {tab === "ai" && (
            <Section title="AI engine">
              <p className="-mt-1 text-sm text-[var(--color-fg-muted)]">
                {plan === "free"
                  ? "Free uses our managed AI within your monthly minutes — or plug in your own key for unlimited."
                  : "Runs on our managed AI by default. Switch to your own key any time."}
              </p>

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
                      <div className="h-full rounded-full bg-[var(--color-brand)] transition-[width]"
                        style={{ width: `${Math.min(100, (usage.usedMinutes / Math.max(1, usage.limitMinutes)) * 100)}%` }} />
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="eyebrow block">Model</label>
                  <Combobox value={engine} onChange={setEngine} options={engineOptions} searchable={false} ariaLabel="AI model" />
                </div>
                <label className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm">
                  <input type="checkbox" checked={useOwn} onChange={(e) => setUseOwn(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                  <span className="text-white">Use my own key when available</span>
                </label>
                <div className="flex items-center gap-3">
                  <Button onClick={saveEngine} loading={engineSaving} size="md" variant="secondary">
                    {engineSaved ? <Check className="size-4 text-[var(--color-success)]" /> : <Save className="size-4" />}
                    Save engine
                  </Button>
                  {engineErr && <span className="text-xs text-[var(--color-danger)]">{engineErr}</span>}
                </div>
                <p className="text-xs text-[var(--color-fg-subtle)]">
                  Groq Whisper is the default. Add your own key under <strong>API keys</strong> to run any engine on your account.
                </p>
              </div>
            </Section>
          )}

          {tab === "keys" && (
            <Section title="Your API keys" badge={<Badge variant="outline"><KeyRound className="size-3" /> Encrypted</Badge>}>
              <p className="-mt-1 text-sm text-[var(--color-fg-muted)]">
                {plan === "free"
                  ? "On Free you can add your own Groq key to run uncapped. Other providers (OpenAI, Deepgram, Gemini) need Pro."
                  : "Keys are encrypted with AES-256-GCM. Add a Groq key to run uncapped, or any other provider to use its models."}
              </p>
              <div className="mt-5 space-y-4">
                {PROVIDERS.filter((p) => plan !== "free" || p.id === "groq").map((p) => (
                  <div key={p.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">{p.name}</div>
                        <div className="text-xs text-[var(--color-fg-subtle)]">{p.hint}</div>
                      </div>
                      {has(p.id) && (
                        <div className="flex items-center gap-2">
                          <Badge variant="brand"><CheckCircle2 className="size-3" /> Connected</Badge>
                          <button onClick={() => deleteKey(p.id)} aria-label={`Delete ${p.name} key`}
                            className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)]">
                            <Trash2 className="size-3.5" aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Input placeholder={has(p.id) ? "Replace existing key…" : p.placeholder}
                        value={keyInputs[p.id]} onChange={(e) => setKeyInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                        className="font-mono text-sm" autoComplete="off" />
                      <Button onClick={() => saveKey(p.id)} loading={saving === p.id} disabled={!keyInputs[p.id].trim()}>
                        <Save className="size-4" /> Save
                      </Button>
                    </div>
                    {savedAt[p.id] && Date.now() - (savedAt[p.id] as number) < 4000 && (
                      <p className="mt-2 text-xs text-[var(--color-brand)]">Saved.</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {tab === "team" && <TeamSection />}

          {tab === "account" && (
            <Section title="Delete account" danger>
              <p className="-mt-1 text-sm text-[var(--color-fg-muted)]">
                Permanently delete your account, projects, and saved keys. Any active subscription is cancelled. This cannot be undone.
              </p>
              <Button onClick={deleteAccount} loading={deleting} variant="destructive" size="md" className="mt-5">
                <Trash2 className="size-4" /> Delete my account
              </Button>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  badge,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border p-6 sm:p-7",
        danger
          ? "border-[var(--color-danger)]/25 bg-[var(--color-danger)]/[0.04]"
          : "border-[var(--color-border)] bg-[var(--color-bg-elev)]",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className={cn("text-lg font-semibold", danger && "text-[var(--color-danger)]")}>{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}
