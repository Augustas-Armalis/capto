"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Save, CheckCircle2, Trash2, Check, Crown, ArrowRight, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ApiKeyMeta = { provider: "groq" | "openai"; label: string | null; lastUsedAt: string | null };
type Plan = "free" | "pro" | "ultra";

export function SettingsClient({
  name,
  email,
  image = null,
  plan = "free",
  subscriptionStatus,
}: {
  name: string;
  email: string;
  image?: string | null;
  plan?: Plan;
  subscriptionStatus?: string | null;
}) {
  const router = useRouter();
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const [avatar, setAvatar] = React.useState<string | null>(image);
  const [avatarSaving, setAvatarSaving] = React.useState(false);
  const [avatarErr, setAvatarErr] = React.useState<string | null>(null);
  const [groqKey, setGroqKey] = React.useState("");
  const [openaiKey, setOpenaiKey] = React.useState("");
  const [meta, setMeta] = React.useState<ApiKeyMeta[]>([]);
  const [saving, setSaving] = React.useState<null | "groq" | "openai">(null);
  const [savedAt, setSavedAt] = React.useState<{ groq?: number; openai?: number }>({});

  // Profile name
  const [displayName, setDisplayName] = React.useState(name);
  const [nameSaving, setNameSaving] = React.useState(false);
  const [nameSaved, setNameSaved] = React.useState(false);

  // Delete account
  const [deleting, setDeleting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/user/api-keys")
      .then((r) => r.json())
      .then((j) => setMeta(j.keys || []))
      .catch(() => {});
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

  // Resize the chosen image to a 256px square JPEG data URL (small enough to
  // store inline in the user row), then save it.
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
          // Cover-crop to a centered square.
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

        {/* Avatar */}
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
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickAvatar}
          />
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

      {/* API keys */}
      <section id="api-keys" className="mt-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-elev)] p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">API keys</h2>
            <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
              Encrypted with AES-256-GCM before storage. Used only when you transcribe. Optional — we provide a managed key.
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
                    aria-label="Delete Groq key"
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
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
            {savedAt.groq && Date.now() - savedAt.groq < 4000 && <p className="mt-2 text-xs text-[var(--color-brand)]">Saved.</p>}
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
                    aria-label="Delete OpenAI key"
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-fg-subtle)] hover:bg-[var(--color-bg-elev)] hover:text-[var(--color-danger)]"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
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
            {savedAt.openai && Date.now() - savedAt.openai < 4000 && <p className="mt-2 text-xs text-[var(--color-brand)]">Saved.</p>}
          </div>
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
