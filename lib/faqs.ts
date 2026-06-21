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
    text: "Capto only does captions. The all in one editors treat captions as one feature out of forty and it shows. One job, done properly.",
    a: "Capto only does captions. The all in one editors treat captions as one feature out of forty and it shows. One job, done properly.",
  },
  {
    q: "Is the export really lossless?",
    text: "Yes. Original quality in, original quality out. Audio untouched.",
    a: "Yes. Original quality in, original quality out. Audio untouched.",
  },
  {
    q: "Is there really no watermark?",
    text: "None. Not on Pro. Not on Free. Pressure tactic. We don't play it.",
    a: "None. Not on Pro. Not on Free. Pressure tactic. We don't play it.",
  },
  {
    q: "Why is Capto cheaper?",
    text: "No ad budget, no investor pressure. We charge what the tool is worth.",
    a: "No ad budget, no investor pressure. We charge what the tool is worth.",
  },
  {
    q: "How does it compare to CapCut?",
    text: "CapCut works. Takes 90 minutes per video. Captions look templated. Capto is 90 seconds and the styles are yours.",
    a: "CapCut works. Takes 90 minutes per video. Captions look templated. Capto is 90 seconds and the styles are yours.",
  },
  {
    q: "Do I need a Groq API key?",
    text: "No. Use ours, included. Bring your own if you want unlimited.",
    a: "No. Use ours, included. Bring your own if you want unlimited.",
  },
  {
    q: "What about my language?",
    text: "50+ languages. Lithuanian, Polish, Spanish, German, French, Portuguese, Italian, Dutch, more. Diacritics correct on export.",
    a: "50+ languages. Lithuanian, Polish, Spanish, German, French, Portuguese, Italian, Dutch, more. Diacritics correct on export.",
  },
  {
    q: "Can I cancel anytime?",
    text: "One click. No retention call. 14 day refund if it's not for you.",
    a: "One click. No retention call. 14 day refund if it's not for you.",
  },
  {
    q: "Mac or PC?",
    text: "Browser today. Desktop apps coming. Mobile after.",
    a: "Browser today. Desktop apps coming. Mobile after.",
  },
  {
    q: "Who's behind Capto?",
    text: "Built by Contles. We're creators. The tools we paid for kept disappointing us, so we made one.",
    a: React.createElement(
      React.Fragment,
      null,
      "Built by ",
      link("https://contles.com?ref=capto-faq", "Contles"),
      ". We're creators. The tools we paid for kept disappointing us, so we made one.",
    ),
  },
];
