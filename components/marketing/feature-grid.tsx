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
  { icon: Gem, title: "Lossless export", body: "Exactly the quality you put in." },
  { icon: Type, title: "Word-level timing", body: "Each word lands on the beat." },
  { icon: Zap, title: "90-second render", body: "Upload, caption, export. Done." },
  { icon: Layers, title: "Real timeline", body: "Drag, trim, retime like an editor." },
  { icon: ShieldCheck, title: "No watermark", body: "Clean export on every plan." },
  { icon: Languages, title: "50+ languages", body: "Auto-transcribed, auto-translated." },
  { icon: EyeOff, title: "Reads on mute", body: "85% scroll silent. Reach them anyway." },
  { icon: Sparkles, title: "Animated styles", body: "Pop, karaoke, highlight, bounce." },
  { icon: MousePointerClick, title: "One-click edits", body: "Fix a word, not the timeline." },
];

export function FeatureGrid() {
  return (
    <Section id="features">
      <Container>
        <div className="max-w-xl">
          <SectionEyebrow>What you get</SectionEyebrow>
          <SectionTitle>Everything the big editors bury behind a paywall.</SectionTitle>
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
