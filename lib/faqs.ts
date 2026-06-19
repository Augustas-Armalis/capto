import * as React from "react";

export type QA = { q: string; a: React.ReactNode; text: string };

const link = (href: string, label: string) =>
  React.createElement(
    "a",
    {
      href,
      target: "_blank",
      rel: "noopener noreferrer",
      className: "text-[var(--color-brand)] underline-offset-2 hover:underline",
    },
    label,
  );

export const DEFAULT_FAQS: QA[] = [
  {
    q: "What makes Capto different from Submagic or VEED?",
    text: "Capto only does captions. The all-in-one editors treat captions as one feature out of forty, so the quality shows it. We put everything into word-level timing, lossless export, and caption styles that actually look designed. One job, done properly.",
    a: "Capto only does captions. The all-in-one editors treat captions as one feature out of forty, so the quality shows it. We put everything into word-level timing, lossless export, and caption styles that look designed. One job, done properly.",
  },
  {
    q: "Is the export really lossless?",
    text: "Yes. Most tools quietly re-encode your whole video on export, costing you sharpness. Capto burns the captions in and preserves your original quality, so what you upload is what you get back. Ultra adds 4K and 60fps.",
    a: "Yes. Most tools quietly re-encode your whole video on export, which costs you sharpness. Capto burns the captions in and preserves your original quality, so what you upload is what you get back. Ultra adds 4K and 60fps.",
  },
  {
    q: "Is there really no watermark?",
    text: "Correct. No watermark on any paid export, on any tier, forever. Only the Free plan is stamped. We treat watermark-free as a principle, not an upsell you rent back.",
    a: "Correct. No watermark on any paid export, on any tier, forever. Only the Free plan is stamped. We treat watermark-free as a principle, not an upsell you rent back.",
  },
  {
    q: "How much does it cost?",
    text: "Pro is €6.99 a month, or €59.99 a year (about €5 a month, 28 percent off). Ultra is €17.99 a month, or €179.99 a year, and adds 4K, clipping, brand kits, the API and 5 flat team seats. There is a Free plan to try it on a real clip.",
    a: "Pro is €6.99 a month, or €59.99 a year (about €5 a month, 28 percent off). Ultra is €17.99 a month, or €179.99 a year, and adds 4K, clipping, brand kits, the API and 5 flat team seats. There is a Free plan so you can try it on a real clip first.",
  },
  {
    q: "What languages does it support?",
    text: "Over 50. English by default, Lithuanian pinned, auto-detect for the rest. Every accent and diacritic renders correctly in the burned-in export.",
    a: "Over 50. English by default, Lithuanian pinned, auto-detect for the rest. Every accent and diacritic renders correctly in the burned-in export.",
  },
  {
    q: "Do I need a Groq API key?",
    text: "On Free, yes, you bring your own. Groq's free tier is generous, which is how we keep Capto cheap. Pro and Ultra can use ours instead, or paste their own. Grab a key at console.groq.com.",
    a: React.createElement(
      React.Fragment,
      null,
      "On Free, yes, you bring your own. Groq's free tier is generous, which is how we keep Capto cheap. Pro and Ultra can use ours instead, or paste their own. Grab one at ",
      link("https://console.groq.com", "console.groq.com"),
      ".",
    ),
  },
  {
    q: "Can I cancel anytime?",
    text: "Yes, in one click from billing. No exports locked behind a cancellation flow, no winback maze. If it is not for you, leave clean.",
    a: "Yes, in one click from billing. No exports locked behind a cancellation flow, no winback maze. If it is not for you, leave clean.",
  },
  {
    q: "Who is behind Capto?",
    text: "Capto is built and powered by Contles. Small team, ships weekly.",
    a: React.createElement(
      React.Fragment,
      null,
      "Capto is built and powered by ",
      link("https://contles.com?ref=capto-faq", "Contles"),
      ". Small team, ships weekly.",
    ),
  },
];
