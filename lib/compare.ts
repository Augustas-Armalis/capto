export type CompareRow = { feature: string; subby: string | boolean; them: string | boolean };

export type Compare = {
  slug: string;
  competitor: string;
  title: string;
  description: string;
  tagline: string;
  intro: string[];
  rows: CompareRow[];
  subbyWins: string[];
  themWins: string[];
  verdict: string;
};

const baseRows = (entry: string, watermark: string | boolean, seats: string | boolean, clipping: string | boolean): CompareRow[] => [
  { feature: "Entry paid price / mo", subby: "€6.99", them: entry },
  { feature: "No watermark on paid", subby: true, them: watermark },
  { feature: "Flat team seats", subby: "5 on Ultra", them: seats },
  { feature: "AI clipping included", subby: "Ultra", them: clipping },
  { feature: "Real word-level timeline", subby: true, them: false },
  { feature: "Bring your own API key", subby: true, them: false },
  { feature: "Minutes, not credits", subby: true, them: false },
];

export const COMPARES: Compare[] = [
  {
    slug: "subby-vs-submagic",
    competitor: "Submagic",
    title: "Capto vs Submagic",
    description:
      "Submagic charges per member and sells clipping as a +$19 add-on. Capto is €6.99 flat, watermark-free, with clipping bundled into Ultra. Full side-by-side.",
    tagline: "Same captions. None of the add-on math.",
    intro: [
      "Submagic is a capable caption-and-clip tool, but its pricing is built on two multipliers, per-member seats and a +$19/mo Magic Clips add-on, that inflate a $19 headline into a much bigger team bill.",
      "Capto keeps it flat: €6.99 for unlimited watermark-free captioning, and Magic Clips bundled into the €17.99 Ultra tier with 5 seats included.",
    ],
    rows: baseRows("$19 + $19 clips", true, "Per member", "+$19/mo add-on"),
    subbyWins: [
      "A third of the entry price, with no clipping add-on.",
      "Flat 5-seat Ultra vs per-member pricing, far cheaper for teams.",
      "A real word-level timeline, not just template application.",
      "Bring-your-own-Groq-key keeps your cost near-zero.",
    ],
    themWins: [
      "Larger template and trending-sound library today.",
      "More established brand with a bigger creator following.",
    ],
    verdict:
      "If you're a solo creator or small team who wants clipping and clean exports without the add-on tax and per-seat math, Capto wins on price and control. Submagic still has the bigger template gallery.",
  },
  {
    slug: "subby-vs-captions-ai",
    competitor: "Captions.ai",
    title: "Capto vs Captions.ai",
    description:
      "Captions (Mirage) gates its real AI behind a $24.99 credit meter that runs dry. Capto meters on minutes with unlimited re-edits, at €6.99. Compared in full.",
    tagline: "Unlimited re-edits beat a credit meter.",
    intro: [
      "Captions, mid-rebrand to Mirage, puts its strongest generative features behind the $24.99 Max tier and meters them with credits. Run out and you're stuck mid-project.",
      "Capto meters on minutes of source video and lets you re-edit and re-export endlessly, for €6.99. No credits, no two-names confusion.",
    ],
    rows: baseRows("$24.99", true, false, true),
    subbyWins: [
      "About a quarter of the price for unlimited captioning.",
      "Minutes with unlimited re-edits instead of draining credits.",
      "One clear brand and promise, not a confusing rebrand.",
      "A real timeline for word-level control.",
    ],
    themWins: [
      "Deeper generative-video features (AI presenters, dubbing) for now.",
      "Polished mobile-first capture flow.",
    ],
    verdict:
      "For captioning and editing without credit anxiety, Capto is dramatically cheaper and calmer. Captions/Mirage is the pick if you specifically need its AI-presenter and dubbing toys.",
  },
  {
    slug: "subby-vs-veed",
    competitor: "VEED",
    title: "Capto vs VEED",
    description:
      "VEED is a broad online editor at $24/mo with watermarks and resolution caps on cheaper tiers. Capto is a focused caption tool at €6.99, clean on every paid plan.",
    tagline: "Focused beats bloated for captions.",
    intro: [
      "VEED is a full online video editor, powerful, but broad, and its cheaper tiers watermark exports and cap resolution.",
      "Capto does one job extremely well: captions. €6.99, no watermark on paid, a real caption timeline, and bring-your-own-key pricing.",
    ],
    rows: baseRows("$24", "Cheaper tiers stamped", false, false),
    subbyWins: [
      "A third of the price for the caption workflow specifically.",
      "No watermark on any paid tier, VEED stamps cheaper plans.",
      "Word-level caption control without editor bloat.",
      "Bring-your-own-key keeps it cheap.",
    ],
    themWins: [
      "Full editor: trimming, multi-track, screen recording, more.",
      "Huge template and asset library.",
    ],
    verdict:
      "Need an all-purpose editor? VEED. Need the best captions for the least money, without the watermark tax? Capto.",
  },
  {
    slug: "subby-vs-opusclip",
    competitor: "OpusClip",
    title: "Capto vs OpusClip",
    description:
      "OpusClip is clip-first at $29/mo. Capto is caption-first at €6.99, with clipping + Hook Score bundled into Ultra. Side-by-side comparison.",
    tagline: "Captions first, clipping included.",
    intro: [
      "OpusClip leads with long-to-short clipping and prices from $29/mo around clipping minutes.",
      "Capto leads with captions and a real editing timeline at €6.99, and bundles Magic Clips with a Hook Score into Ultra at €17.99, no separate clip-only subscription.",
    ],
    rows: baseRows("$29", true, false, "Core product"),
    subbyWins: [
      "Far cheaper entry for captioning.",
      "Clipping + captions in one tool, not two subscriptions.",
      "Word-level caption styling OpusClip doesn't focus on.",
      "Bring-your-own-key economics.",
    ],
    themWins: [
      "More mature clip-selection model with a longer track record.",
      "Built-in scheduling and posting integrations.",
    ],
    verdict:
      "If clipping is your whole workflow, OpusClip is purpose-built. If you want great captions plus clipping when you need it, Capto covers both for less.",
  },
  {
    slug: "subby-vs-zubtitle",
    competitor: "Zubtitle",
    title: "Capto vs Zubtitle",
    description:
      "Zubtitle caps you at 10 videos on its $19 plan and 30 on $49. Capto is effectively unlimited at €6.99. Here's the comparison.",
    tagline: "No punishing video quotas.",
    intro: [
      "Zubtitle is simple, but its plans gate you hard on volume, 10 videos/mo at $19, 30 at $49.",
      "Capto's Pro is effectively unlimited for normal use at €6.99, with a real timeline and no watermark.",
    ],
    rows: baseRows("$19 (10 videos)", true, false, false),
    subbyWins: [
      "Effectively unlimited exports vs hard monthly video caps.",
      "Cheaper entry with more control.",
      "Word-level timeline editing Zubtitle lacks.",
      "Bring-your-own-key pricing.",
    ],
    themWins: ["Dead-simple, opinionated flow for absolute beginners."],
    verdict:
      "If you post more than ten videos a month, Zubtitle's caps will frustrate you fast. Capto gives you room to actually work.",
  },
  {
    slug: "subby-vs-vizard",
    competitor: "Vizard",
    title: "Capto vs Vizard",
    description:
      "Vizard's clip selection often misses context. Capto pairs a context-aware Hook Score with a real caption timeline at €6.99. Compared.",
    tagline: "Context-aware clips, real caption control.",
    intro: [
      "Vizard focuses on auto-clipping, but users report it misses context and extracts incomplete clips.",
      "Capto's Magic Clips (Ultra) rate each clip with a Hook Score, and the captioning is the strongest part of the product, at €6.99 to start.",
    ],
    rows: baseRows("$29.99", true, false, "Core product"),
    subbyWins: [
      "Caption quality and word-level control are first-class.",
      "Hook Score surfaces the genuinely strong clips.",
      "Cheaper entry with bring-your-own-key economics.",
      "No watermark on paid.",
    ],
    themWins: ["Longer history specifically in auto-clipping workflows."],
    verdict:
      "For captions plus smarter clip selection in one affordable tool, Capto is the better all-rounder.",
  },
];

export const getCompare = (slug: string) => COMPARES.find((c) => c.slug === slug);
export const allCompareSlugs = () => COMPARES.map((c) => c.slug);
