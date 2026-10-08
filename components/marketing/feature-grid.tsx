import { Zap, Layers, Sparkles, MousePointerClick, VolumeX } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Band, Muted, SectionHead } from "@/components/ui/section";
import { Spotlight } from "@/components/ui/spotlight";
import { DitherShader } from "@/components/visual/dither-shader";
import { Marquee } from "./marquee";

const BEAT = [
  { w: "words", t: "0.42" },
  { w: "land", t: "0.71" },
  { w: "on", t: "0.93" },
  { w: "the", t: "1.04" },
  { w: "beat", t: "1.18" },
];

const LANGS = [
  "English",
  "Español",
  "Português",
  "Français",
  "Deutsch",
  "Lietuvių",
  "Polski",
  "Čeština",
  "Türkçe",
  "Română",
  "Tiếng Việt",
  "Italiano",
  "Nederlands",
  "Svenska",
];

const SMALL = [
  { icon: Sparkles, title: "Looks made, not generated.", body: "Designed styles. Your videos stop looking like everyone else's." },
  { icon: Layers, title: "Minutes, not credits.", body: "Re-edit forever. Fix a typo without paying for it." },
  { icon: Zap, title: "90 second render.", body: "Drop, style, export. Done before your coffee cools." },
  { icon: MousePointerClick, title: "Real timeline.", body: "Drag words, not lines. Premiere-level control, browser speed." },
];

function Cell({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Spotlight className={`relative flex flex-col overflow-hidden bg-[var(--color-bg)] p-7 ${className ?? ""}`}>{children}</Spotlight>;
}

function CellText({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative mt-auto">
      <h3 className="heading text-[17px] text-white">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--color-fg-muted)]">{body}</p>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <Band id="features" className="py-24 sm:py-32">
      <Container>
        <SectionHead
          index="02"
          label="What you get"
          title={
            <>
              Built for the one thing the algorithm watches. <Muted>Nothing else.</Muted>
            </>
          }
          lede="Capto isn't an all-in-one editor with captions bolted on. Every feature below exists to make the words on your video land harder."
        />

        <div data-reveal className="hair-grid d-2 mt-14">
          <div className="grid gap-px !bg-[var(--color-border)] lg:grid-cols-3">
          {/* Timing — the hero cell */}
          <Cell className="min-h-[340px] lg:col-span-2">
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[230px] fade-x">
              <DitherShader variant="wave" pixel={4} intensity={0.9} interactive={false} />
            </div>
            <div className="relative mt-[150px] flex flex-wrap gap-1.5 sm:mt-[170px]">
              {BEAT.map((b, i) => (
                <span
                  key={b.w}
                  className={`inline-flex items-baseline gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[13px] ${
                    i === 4
                      ? "border-[var(--color-violet)]/60 bg-[var(--color-violet)] text-white"
                      : "border-white/10 bg-[var(--color-bg)]/80 text-white/80 backdrop-blur"
                  }`}
                >
                  {b.w}
                  <span className={`mono text-[10px] tnum ${i === 4 ? "text-white/70" : "text-[var(--color-fg-subtle)]"}`}>{b.t}s</span>
                </span>
              ))}
            </div>
            <div className="mt-6">
              <CellText title="Words on the beat." body="Word-level timing, synced to the waveform, not the sentence. The kind of captions people screenshot." />
            </div>
          </Cell>

          {/* Mute */}
          <Cell className="min-h-[340px]">
            <div className="flex items-center gap-2 text-[var(--color-fg-subtle)]">
              <VolumeX className="size-4" />
              <span className="mono text-[11px] uppercase tracking-wider">Sound off</span>
            </div>
            <div className="mt-8">
              <div className="display text-7xl text-white tnum">85%</div>
              <div className="mono mt-2 text-[11px] text-[var(--color-fg-subtle)]">of feeds scroll on silent</div>
            </div>
            <div className="mt-10">
              <CellText title="Reads on mute." body="Sized and placed for silent scroll. Reach the viewers who never tap the speaker." />
            </div>
          </Cell>

          {/* Lossless */}
          <Cell className="min-h-[300px]">
            <dl className="mono space-y-px overflow-hidden rounded-[var(--radius-md)] border border-white/[0.07] text-[11.5px]">
              {[
                ["Resolution", "4K", "4K"],
                ["Frame rate", "60", "60"],
                ["Audio", "source", "untouched"],
              ].map(([k, a, b]) => (
                <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-3 bg-white/[0.02] px-3 py-2">
                  <dt className="text-[var(--color-fg-subtle)]">{k}</dt>
                  <dd className="text-white tnum">
                    {a} <span className="text-[var(--color-fg-subtle)]">→</span> <span className="text-[var(--color-brand)]">{b}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-10">
              <CellText title="Lossless export." body="4K in, 4K out. Your audio never gets re-encoded." />
            </div>
          </Cell>

          {/* Watermark */}
          <Cell className="min-h-[300px]">
            <div className="relative mx-auto flex aspect-[9/16] h-[150px] items-end justify-center overflow-hidden rounded-[8px] border border-white/10 bg-[linear-gradient(180deg,#1a1830,#0c0b14)] pb-4">
              <span className="text-[13px] font-extrabold uppercase tracking-tight text-white">yours.</span>
              <span className="mono absolute right-1.5 top-1.5 rounded-[3px] border border-dashed border-white/20 px-1 text-[8px] text-white/30 line-through">
                watermark
              </span>
            </div>
            <div className="mt-8">
              <CellText title="No watermark." body="Not on Pro. Not on Free. Ever." />
            </div>
          </Cell>

          {/* Languages */}
          <Cell className="min-h-[300px] !px-0">
            <div className="space-y-2">
              <Marquee
                durationSec={36}
                gapPx={8}
                repeat={2}
                items={LANGS.map((l) => (
                  <span className="whitespace-nowrap rounded-[var(--radius-sm)] border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[13px] text-white/85">
                    {l}
                  </span>
                ))}
              />
              <Marquee
                durationSec={44}
                gapPx={8}
                repeat={2}
                className="[&_.marquee-track]:[animation-direction:reverse]"
                items={["ą ę ė", "ñ á é", "ç ã õ", "ž š č", "ő ű", "ğ ş ı", "ø å æ", "ț ș ă", "ữ ộ ằ"].map((l) => (
                  <span className="mono whitespace-nowrap rounded-[var(--radius-sm)] border border-white/[0.08] px-2.5 py-1 text-[12px] text-[var(--color-brand)]">
                    {l}
                  </span>
                ))}
              />
            </div>
            <div className="mt-10 px-7">
              <CellText title="50+ languages." body="Diacritics done right. Most tools quietly drop them." />
            </div>
          </Cell>
          </div>
          <div className="grid gap-px !bg-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-4">
          {SMALL.map((f) => (
            <div key={f.title} className="bg-[var(--color-bg)] p-6">
              <f.icon className="size-4 text-[var(--color-fg-muted)]" strokeWidth={1.75} />
              <h3 className="heading mt-5 text-[15px] text-white">{f.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-fg-muted)]">{f.body}</p>
            </div>
          ))}
          </div>
        </div>
      </Container>
    </Band>
  );
}
