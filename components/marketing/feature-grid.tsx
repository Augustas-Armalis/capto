import {
  Type,
  Zap,
  Layers,
  ShieldCheck,
  Languages,
  EyeOff,
  Sparkles,
  MousePointerClick,
  Gem,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionEyebrow, SectionTitle } from "@/components/ui/section";
import { Spotlight } from "@/components/ui/spotlight";

const FEATURES = [
  { icon: Type, title: "Words on the beat.", body: "Word-level timing, auto-synced. The kind people screenshot." },
  { icon: EyeOff, title: "Reads on mute.", body: "Sized for silent scroll. Reach the 85% who never tap the speaker." },
  { icon: Sparkles, title: "Looks made, not generated.", body: "Designed styles. Your videos stop looking like everyone else's." },
  { icon: Gem, title: "Lossless export.", body: "4K in, 4K out. Audio untouched." },
  { icon: ShieldCheck, title: "No watermark.", body: "Not on Pro. Not on Free. Ever." },
  { icon: Layers, title: "Minutes, not credits.", body: "Re-edit forever. Fix a typo without paying for it." },
  { icon: Languages, title: "50+ languages.", body: "Diacritics done right. Most tools quietly drop them." },
  { icon: Zap, title: "90 second render.", body: "Drop, style, export. Done before your coffee cools." },
  { icon: MousePointerClick, title: "Real timeline.", body: "Drag words, not lines. Premiere-level control, browser-level speed." },
];

export function FeatureGrid() {
  return (
    <Section id="features">
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>What you get</SectionEyebrow>
          <SectionTitle>Built for the one thing the algorithm watches.</SectionTitle>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Spotlight
              key={f.title}
              className="glow-border group rounded-[var(--radius-xl)] border border-white/[0.07] bg-white/[0.02] p-7 transition-colors duration-[var(--dur-base)] hover:bg-white/[0.035]"
            >
              <div className="relative inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-white/10 bg-white/[0.03] text-white transition-colors group-hover:text-[var(--color-cyan)]">
                <f.icon className="size-5" strokeWidth={1.5} />
              </div>
              <h3 className="heading relative mt-6 text-base text-white">{f.title}</h3>
              <p className="relative mt-1.5 text-sm leading-relaxed text-[var(--color-fg-muted)]">{f.body}</p>
            </Spotlight>
          ))}
        </div>
      </Container>
    </Section>
  );
}
