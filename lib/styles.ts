export type CaptionStyle = {
  slug: string;
  name: string;
  title: string;
  description: string;
  blurb: string;
  words: string[];
  highlight: number;
  wordClass: string;
  highlightClass: string;
  bg: string;
  recipe: string[];
  bestFor: string;
  popular?: boolean;
  /** show one word at a time in place (no per-word box) */
  single?: boolean;
};

export const STYLES: CaptionStyle[] = [
  {
    slug: "inter-bold",
    name: "Inter Bold",
    title: "Inter Bold Captions, the Clean Default Everyone Trusts",
    description:
      "The simplest, most reliable caption style for short-form video. Bold Inter, tight tracking, one clean highlight. One click in Capto.",
    blurb:
      "The default for a reason. Bold Inter, tight tracking, one word in a clean accent. It reads instantly, fits any niche, and never looks dated.",
    words: ["KEEP", "IT", "SIMPLE"],
    highlight: 2,
    wordClass: "font-bold tracking-tight text-white",
    highlightClass: "text-white",
    bg: "from-[#16181f] to-[#0b0c11]",
    single: true,
    recipe: [
      "Bold sans (Inter or DM Sans), tight tracking",
      "Title case or all caps, your call",
      "One word in a clean white or accent box",
      "Centered lower third, two to three words per line",
    ],
    bestFor: "Anything. The safe, high converting default for every niche.",
    popular: true,
  },
  {
    slug: "hormozi",
    name: "Hormozi",
    title: "Hormozi Captions, Bold Word by Word Style",
    description:
      "The big, all caps, one word highlighted style Alex Hormozi made famous. Recreate it in Capto in one click. Free to start.",
    blurb:
      "Heavy weight, all caps, tight tracking, one word boxed in a bright accent at a time. It forces the eye to follow the spoken word, the highest retention caption style on muted feeds.",
    words: ["THIS", "ONE", "CHANGED", "EVERYTHING"],
    highlight: 2,
    wordClass: "font-bold uppercase tracking-tight text-white",
    highlightClass: "bg-[#ffd233] text-black px-1.5 rounded -rotate-1",
    bg: "from-[#1a1606] to-[#0c0a04]",
    recipe: [
      "Heavy grotesque font (Anton or bold DM Sans)",
      "All caps, tight letter spacing",
      "One active word boxed in a bright accent",
      "Centered lower third, two to three words per line",
    ],
    bestFor: "High energy talking head clips, hooks, sales content.",
  },
  {
    slug: "karaoke",
    name: "Karaoke",
    title: "Karaoke Captions, Word by Word Highlight Style",
    description:
      "Classic karaoke style captions where the active word lights up in your accent color. One click in Capto.",
    blurb:
      "Every word is visible, and the currently spoken one fills with your accent color. A smooth, readable rhythm that keeps viewers reading along.",
    words: ["FOLLOW", "EVERY", "SINGLE", "WORD"],
    highlight: 1,
    wordClass: "font-bold tracking-tight text-white",
    highlightClass: "bg-[var(--color-violet)] text-white px-1.5 rounded",
    bg: "from-[#191323] to-[#0d0a12]",
    recipe: [
      "Bold sans, all caps or title case",
      "Full line visible, active word filled with accent",
      "Smooth fill timed to the audio",
      "Centered, three to four words per line",
    ],
    bestFor: "Music, lyrics, energetic narration, tutorials.",
  },
  {
    slug: "editorial",
    name: "Editorial",
    title: "Editorial Captions, Clean and Premium",
    description:
      "Restrained, designed captions for brands that want to look premium, not viral template. One click in Capto.",
    blurb:
      "Semi bold DM Sans, tight tracking, a single accent word. The look of a brand that respects its own typography. Reads designed, not generated.",
    words: ["WORDS", "THAT", "EARN", "ATTENTION"],
    highlight: 2,
    wordClass: "font-semibold tracking-tight text-white",
    highlightClass: "text-[var(--color-cyan)]",
    bg: "from-[#15171d] to-[#0c0e13]",
    recipe: [
      "DM Sans semi bold",
      "Tight tracking, title or sentence case",
      "One accent colored word, no box",
      "Lower third, generous line spacing",
    ],
    bestFor: "Founder content, B2B, premium brands, thought leadership.",
  },
  {
    slug: "clean-sans",
    name: "Clean Sans",
    title: "Clean Sans Captions, Minimal and Quiet",
    description:
      "Quiet, lowercase, minimal captions with a subtle underline highlight. The anti shout style. Free to start in Capto.",
    blurb:
      "Lowercase medium weight sans with a thin accent underline on the key word. For creators whose whole aesthetic is restraint.",
    words: ["simple", "is", "always", "stronger"],
    highlight: 3,
    wordClass: "font-medium lowercase tracking-tight text-white/90",
    highlightClass: "underline decoration-[var(--color-cyan)] decoration-2 underline-offset-4",
    bg: "from-[#121319] to-[#0c0d12]",
    recipe: [
      "DM Sans medium, lowercase",
      "Subtle accent underline on the key word",
      "Plenty of negative space",
      "Lower third or upper third for variety",
    ],
    bestFor: "Lifestyle, design, minimalist and aesthetic brands.",
  },
  {
    slug: "word-by-word",
    name: "Word by Word",
    title: "Word by Word Captions, One Word at a Time",
    description:
      "Punchy, one word on screen captions that snap with the audio. Maximum pace, maximum attention. One click in Capto.",
    blurb:
      "Only the current word shows, snapping in time with speech. The highest pace style, ideal for fast hooks and high energy edits.",
    words: ["EVERY.", "WORD.", "HITS.", "HARD."],
    highlight: 0,
    wordClass: "font-bold uppercase tracking-tight text-white",
    highlightClass: "text-white",
    bg: "from-[#101319] to-[#0a0c11]",
    single: true,
    recipe: [
      "Bold sans, all caps, large",
      "One word visible at a time",
      "Snaps in on each word's start",
      "Dead center of frame",
    ],
    bestFor: "Fast hooks, countdowns, punchy listicles.",
  },
  {
    slug: "beasty",
    name: "Beasty",
    title: "Beasty Captions, Big Bold and Loud",
    description:
      "Oversized, thick, high contrast captions with a punchy yellow highlight. The MrBeast school of retention. One click in Capto.",
    blurb:
      "Maximum weight, maximum size, a hard shadow, and a yellow highlight that grabs the eye. Built for the loudest, fastest cut content on the feed.",
    words: ["YOU", "WON'T", "BELIEVE", "THIS"],
    highlight: 2,
    wordClass: "font-black uppercase tracking-tight text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.5)]",
    highlightClass: "bg-[#ffd233] text-black px-1.5 rounded",
    bg: "from-[#201a05] to-[#0c0a03]",
    recipe: [
      "Heaviest weight available, all caps",
      "Hard black shadow for contrast",
      "Bright yellow highlight on the payoff word",
      "Big, centered, two words per line max",
    ],
    bestFor: "Challenge content, gaming, high energy entertainment.",
  },
  {
    slug: "neon",
    name: "Neon",
    title: "Neon Captions, Glowing Accent Style",
    description:
      "Captions with a soft neon glow on the active word. Modern, electric, made for night and music content. One click in Capto.",
    blurb:
      "Clean white text with a glowing accent word that lights up like a sign. Modern and electric without tipping into gaudy.",
    words: ["TURN", "IT", "UP", "LOUD"],
    highlight: 3,
    wordClass: "font-bold uppercase tracking-tight text-white",
    highlightClass: "text-[var(--color-cyan)] drop-shadow-[0_0_12px_oklch(0.83_0.12_224)]",
    bg: "from-[#0a1520] to-[#05090f]",
    recipe: [
      "Bold sans, all caps",
      "Accent word with a soft outer glow",
      "Dark, slightly cool background",
      "Centered, three to four words per line",
    ],
    bestFor: "Music, nightlife, gaming, tech product clips.",
  },
  {
    slug: "pop",
    name: "Pop",
    title: "Pop Captions, Playful Highlight Boxes",
    description:
      "Rounded, colorful highlight boxes that pop one word at a time. Friendly and fun without looking cheap. One click in Capto.",
    blurb:
      "Rounded accent boxes that pop behind the active word in your brand color. Friendly, bright, and great for lifestyle and creator content.",
    words: ["MADE", "THIS", "FOR", "YOU"],
    highlight: 1,
    wordClass: "font-bold tracking-tight text-white",
    highlightClass: "bg-[var(--color-fuchsia)] text-white px-2 rounded-full",
    bg: "from-[#1d0f1c] to-[#0c0610]",
    recipe: [
      "Bold rounded sans, title case",
      "Full pill behind the active word",
      "Rotate brand colors per video",
      "Centered, playful spacing",
    ],
    bestFor: "Lifestyle, beauty, food, friendly creator brands.",
  },
];

export const getStyle = (slug: string) => STYLES.find((s) => s.slug === slug);
export const allStyleSlugs = () => STYLES.map((s) => s.slug);
