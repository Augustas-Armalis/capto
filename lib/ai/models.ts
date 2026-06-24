// The AI engine catalogue. One source of truth for which speech-to-text models
// Capto can run, who can use them, and how good they are. Selection logic
// (lib/ai/select.ts) combines this static ranking with live learning metrics so
// the "auto" engine actually improves over time.

export type AiProvider = "groq" | "openai" | "deepgram" | "gemini";

export type SttModel = {
  /** our stable internal id (stored in metrics + user prefs) */
  id: string;
  label: string;
  provider: AiProvider;
  /** the model name the provider's API expects */
  apiModel: string;
  /** static accuracy rank 1–10, used as the tie-breaker / cold-start prior */
  quality: number;
  /** minimum plan that may use this as a HOUSE model (BYOK ignores this) */
  minPlan: "free" | "pro" | "ultra";
  blurb: string;
};

// Ordered best-first. Whisper-large-v3 on Groq is the free workhorse; Deepgram
// Nova-3 and OpenAI Whisper are the premium engines unlocked on paid plans.
export const STT_MODELS: SttModel[] = [
  {
    id: "groq-whisper-large-v3",
    label: "Whisper Large v3 · Groq",
    provider: "groq",
    apiModel: "whisper-large-v3",
    quality: 8,
    minPlan: "free",
    blurb: "Fast, accurate, 50+ languages. The default.",
  },
  {
    id: "groq-whisper-large-v3-turbo",
    label: "Whisper v3 Turbo · Groq",
    provider: "groq",
    apiModel: "whisper-large-v3-turbo",
    quality: 7,
    minPlan: "free",
    blurb: "Faster, slightly lighter accuracy.",
  },
  {
    id: "deepgram-nova-3",
    label: "Deepgram Nova-3",
    provider: "deepgram",
    apiModel: "nova-3",
    quality: 9,
    minPlan: "pro",
    blurb: "Best-in-class word timing, premium engine.",
  },
  {
    id: "openai-whisper-1",
    label: "OpenAI Whisper",
    provider: "openai",
    apiModel: "whisper-1",
    quality: 8,
    minPlan: "pro",
    blurb: "OpenAI-hosted Whisper with word timestamps.",
  },
];

export const getModel = (id: string): SttModel | undefined =>
  STT_MODELS.find((m) => m.id === id);

export const PLAN_RANK: Record<"free" | "pro" | "ultra" | "friend", number> = {
  free: 0,
  pro: 1,
  ultra: 2,
  friend: 2, // comped — same access as Ultra
};

/** Providers a user can plug their own key into. */
export const BYOK_PROVIDERS: AiProvider[] = ["groq", "openai", "deepgram", "gemini"];

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  groq: "Groq",
  openai: "OpenAI",
  deepgram: "Deepgram",
  gemini: "Gemini",
};

/** Key-format hints used for light client + server validation. */
export const PROVIDER_KEY_PREFIX: Partial<Record<AiProvider, string>> = {
  groq: "gsk_",
  openai: "sk-",
  // Deepgram and Gemini keys have no stable public prefix.
};

export const ENHANCE_MODEL = "gemini-2.5-flash";

// Caption-enhancement brain for everyone. Default is Groq Llama 3.3 70B —
// fast, free-tier, plenty good for cleanup / translation / emoji. Claude is a
// supported backup when ANTHROPIC_API_KEY is set; Gemini stays as the final fallback.
export const GROQ_ENHANCE_MODEL = "llama-3.3-70b-versatile";
export const ANTHROPIC_ENHANCE_MODEL = "claude-haiku-4-5-20251001";
