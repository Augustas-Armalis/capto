// Concrete caption render specs. One source of truth for BOTH the live DOM
// preview and the canvas exporter, so what you see is what you export. These
// mirror the marketing /styles presets but with literal values (hex, weights,
// sizes) that canvas 2D can render directly.

export type CaseMode = "upper" | "lower" | "title" | "none";
export type HighlightMode = "color" | "box" | "glow" | "underline";

export type CaptionPreset = {
  id: string;
  name: string;
  fontFamily: string;
  fontWeight: number;
  caseMode: CaseMode;
  /** letter-spacing in em */
  tracking: number;
  /** base word color */
  fill: string;
  /** active word text color */
  highlightFill: string;
  highlightMode: HighlightMode;
  /** box / underline / glow accent color */
  accent?: string;
  /** font size as a fraction of the video's short edge (portrait => width) */
  sizeRatio: number;
  /** drop shadow behind the text */
  shadow: boolean;
  /** show one word at a time, swapped in place */
  single?: boolean;
  /** rounded box (pill) when highlightMode === "box" */
  pill?: boolean;
  popular?: boolean;
};

// Accent palette (hex so canvas 2D renders identically across browsers).
const VIOLET = "#b8a4ff";
const CYAN = "#5fe3f5";
const FUCHSIA = "#ef79e6";
const YELLOW = "#ffd233";
const WHITE = "#ffffff";

export const PRESETS: CaptionPreset[] = [
  {
    id: "inter-bold",
    name: "Inter Bold",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 700,
    caseMode: "none",
    tracking: -0.02,
    fill: WHITE,
    highlightFill: WHITE,
    highlightMode: "color",
    sizeRatio: 0.072,
    shadow: true,
    single: true,
    popular: true,
  },
  {
    id: "hormozi",
    name: "Hormozi",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 800,
    caseMode: "upper",
    tracking: -0.01,
    fill: WHITE,
    highlightFill: "#0b0c11",
    highlightMode: "box",
    accent: YELLOW,
    sizeRatio: 0.078,
    shadow: true,
  },
  {
    id: "karaoke",
    name: "Karaoke",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 700,
    caseMode: "upper",
    tracking: -0.01,
    fill: WHITE,
    highlightFill: WHITE,
    highlightMode: "box",
    accent: "#7c5cff",
    sizeRatio: 0.066,
    shadow: true,
  },
  {
    id: "editorial",
    name: "Editorial",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 600,
    caseMode: "none",
    tracking: -0.02,
    fill: WHITE,
    highlightFill: CYAN,
    highlightMode: "color",
    sizeRatio: 0.06,
    shadow: true,
  },
  {
    id: "clean-sans",
    name: "Clean Sans",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 500,
    caseMode: "lower",
    tracking: -0.01,
    fill: "#f2f3f7",
    highlightFill: "#f2f3f7",
    highlightMode: "underline",
    accent: CYAN,
    sizeRatio: 0.058,
    shadow: true,
  },
  {
    id: "word-by-word",
    name: "Word by Word",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 700,
    caseMode: "upper",
    tracking: -0.01,
    fill: WHITE,
    highlightFill: WHITE,
    highlightMode: "color",
    sizeRatio: 0.09,
    shadow: true,
    single: true,
  },
  {
    id: "beasty",
    name: "Beasty",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 900,
    caseMode: "upper",
    tracking: -0.01,
    fill: WHITE,
    highlightFill: "#0b0c11",
    highlightMode: "box",
    accent: YELLOW,
    sizeRatio: 0.084,
    shadow: true,
  },
  {
    id: "neon",
    name: "Neon",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 700,
    caseMode: "upper",
    tracking: -0.01,
    fill: WHITE,
    highlightFill: CYAN,
    highlightMode: "glow",
    accent: CYAN,
    sizeRatio: 0.068,
    shadow: true,
  },
  {
    id: "pop",
    name: "Pop",
    fontFamily: '"DM Sans", Inter, system-ui, sans-serif',
    fontWeight: 700,
    caseMode: "none",
    tracking: -0.01,
    fill: WHITE,
    highlightFill: WHITE,
    highlightMode: "box",
    accent: FUCHSIA,
    pill: true,
    sizeRatio: 0.068,
    shadow: true,
  },
];

export const getPreset = (id: string): CaptionPreset =>
  PRESETS.find((p) => p.id === id) || PRESETS[0];

export function applyCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case "lower":
      return text.toLocaleLowerCase();
    case "upper":
      return text.toLocaleUpperCase();
    case "title":
      return text.replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase());
    default:
      return text;
  }
}
