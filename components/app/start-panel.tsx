"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, ArrowRight } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";

const LANGS: [string, string][] = [
  ["auto", "Auto-detect language"],
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["it", "Italian"],
  ["nl", "Dutch"],
  ["hi", "Hindi"],
  ["ja", "Japanese"],
];

// The platform's front door: a big, landing-styled drop area with one setting
// (spoken language) to pick before jumping into the editor with it pre-selected.
export function StartPanel() {
  const router = useRouter();
  const [lang, setLang] = React.useState("auto");
  const go = () => router.push(lang === "auto" ? "/editor" : `/editor?lang=${lang}`);

  return (
    <div className="glow-border-always relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-white/[0.05] to-transparent p-8 sm:p-10">
      <button
        onClick={go}
        className="group flex w-full flex-col items-center justify-center text-center"
      >
        <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-[var(--color-brand)]/15 text-[var(--color-brand)] transition-transform group-hover:scale-105">
          <Upload className="size-8" />
        </span>
        <span className="heading mt-5 text-2xl text-white">Start a new project</span>
        <span className="mt-2 max-w-md text-sm text-[var(--color-fg-muted)]">
          Drop an MP4, MOV or WebM. It stays on your device — we just add the captions.
        </span>
      </button>

      <div className="mx-auto mt-6 flex max-w-md flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Combobox
            value={lang}
            onChange={setLang}
            options={LANGS.map(([v, l]) => ({ value: v, label: l }))}
            ariaLabel="Spoken language"
          />
        </div>
        <button
          onClick={go}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-white px-5 py-2.5 text-sm font-medium text-black transition-[transform,background-color] hover:bg-white/90 active:scale-[0.98]"
        >
          Open the editor
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
