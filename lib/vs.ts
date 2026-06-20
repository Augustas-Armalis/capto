// Rich head-to-head comparison data for /vs/[competitor]. One system, four pages.
// No fake testimonials — switcher quotes are intentionally omitted until real
// ones exist (a fake quote destroys trust the moment someone clicks the name).

export type VsCell = boolean | string;

export type VsData = {
  slug: string;
  competitor: string;
  tag: string;
  title: string;
  intro: string;
  heroNote: string;
  metaTitle: string;
  metaDescription: string;
  whoCapto: string;
  whoCompetitor: string;
  whoNote?: string;
  table: { label: string; capto: VsCell; competitor: VsCell }[];
  captoWins: { title: string; body: string }[];
  competitorWins: { intro: string; points: { title: string; body: string }[]; outro: string };
  pricing: { rows: { label: string; capto: string; competitor: string }[]; note: string };
  faq: { q: string; a: string }[];
  ctaTitle: string;
  ctaBody: string;
};

export const VS: VsData[] = [
  {
    slug: "submagic",
    competitor: "Submagic",
    tag: "Capto vs Submagic",
    title: "The captioning tool you actually own.",
    intro:
      "Submagic invented the modern caption look. We made it lossless, watermark-free, and a third of the price.",
    heroNote: "Free to switch. €6.99 when you outgrow Free. No credit roulette.",
    metaTitle: "Capto vs Submagic — The honest comparison (2026)",
    metaDescription:
      "Lossless export. No watermark. Word-level timing. €6.99/mo vs $19. The captioning tool Submagic users switch to when the bill stops making sense.",
    whoCapto:
      "You came for the captions, not the bundle. You want lossless export, no watermark, word-level control, and a price that doesn't sting when you're posting daily.",
    whoCompetitor:
      "You want every creator feature in one app — captions, B-roll, sound effects, AI clipping, emoji triggers — and you're fine paying $19+/month for the bundle.",
    whoNote: "Both make great captions. The difference is what else is bolted onto the bill.",
    table: [
      { label: "Entry paid price", capto: "€6.99/mo", competitor: "$19/mo" },
      { label: "Free plan", capto: "3 captioned exports", competitor: "3 videos, watermark" },
      { label: "Lossless export", capto: true, competitor: false },
      { label: "Watermark on paid", capto: "None", competitor: "None" },
      { label: "Word-level timeline", capto: true, competitor: "Line-level" },
      { label: "Languages", capto: "50+", competitor: "100+" },
      { label: "Diacritics on export", capto: true, competitor: "Inconsistent" },
      { label: "AI clipping (long → short)", capto: "Ultra plan", competitor: "Add-on (+$19/mo)" },
      { label: "Re-edits", capto: "Unlimited", competitor: "Count against credits" },
      { label: "Flat team pricing", capto: true, competitor: false },
      { label: "Bring your own API key", capto: true, competitor: false },
    ],
    captoWins: [
      { title: "Price that scales with you, not against you.", body: "€6.99/mo gets you everything in Pro. Submagic's Pro starts at $19/mo and the per-seat math gets ugly fast for agencies." },
      { title: "Lossless export.", body: "Your master comes out the way it went in. Audio untouched, no re-compression. Submagic re-encodes on export and audio engineers notice." },
      { title: "Word-level timeline.", body: "Drag a single word. Retime a single emphasis. Submagic locks you to line-level edits, so fixing one word means redoing the whole line." },
      { title: "No credit roulette.", body: "You pay for minutes of source video. Re-edits are unlimited. On Submagic, every export and re-edit eats your monthly cap." },
      { title: "Bring your own Groq key.", body: "Want unlimited transcription on day one? Plug your own key in. Capto charges you nothing extra for it." },
    ],
    competitorWins: {
      intro: "We're not going to pretend otherwise.",
      points: [
        { title: "More animated styles out of the box.", body: "Submagic has the largest preset library in the category. Emoji triggers, sound effects on keywords, zero customization work." },
        { title: "Full all-in-one editor.", body: "B-roll, music, sound FX, AI clipping all in one workflow at the Pro tier. Capto does these too, but at the Ultra tier." },
        { title: "Bigger language library.", body: "100+ vs our 50+. We cover every major European and Asian language; Submagic covers more long-tail." },
      ],
      outro: "If you need the all-in-one workflow and the budget isn't the bottleneck, Submagic is a solid tool. We respect what they built.",
    },
    pricing: {
      rows: [
        { label: "Monthly", capto: "€6.99", competitor: "~$19 (€17.50)" },
        { label: "Annual", capto: "€59.99", competitor: "~$192" },
        { label: "Difference", capto: "—", competitor: "+€132/yr" },
      ],
      note: "For a 5-seat agency, the gap widens to €800+/year because Capto's team plan is flat and Submagic's isn't.",
    },
    faq: [
      { q: "Will my Submagic styles transfer?", a: "Not automatically — different engines. But our Hormozi and Karaoke presets cover 90% of what creators recreate on Submagic. The first export usually takes 5 minutes to match." },
      { q: "Can I cancel Submagic and switch mid-cycle?", a: "Yes. Capto Free is free forever, so test it before you cancel Submagic. If Capto works for you, switch when their renewal hits. No urgency on our side." },
      { q: "Does Capto have emoji and sound triggers?", a: "Custom emoji triggers are on the roadmap. Sound triggers, not yet. If those are critical to your workflow, Submagic is the better tool today." },
      { q: "What about AI clipping (long video → shorts)?", a: "Capto Ultra includes Magic Clips with Hook Score. Submagic charges +$19/mo on top for the equivalent feature." },
    ],
    ctaTitle: "Try Capto free. Keep Submagic if you miss it.",
    ctaBody: "No card to start. Export your first captioned clip in 90 seconds.",
  },
  {
    slug: "captions",
    competitor: "Captions",
    tag: "Capto vs Captions",
    title: "Same captions. Without the audio sync issues.",
    intro:
      "Captions.ai is built for shooting and scripting. Capto is built for captioning the videos you already shot, without rendering out of sync.",
    heroNote: "€6.99 vs $24.99. And your audio stays where you put it.",
    metaTitle: "Capto vs Captions.ai — Lossless captions without the sync issues",
    metaDescription:
      "€6.99 vs $24.99. Lossless export, audio that stays in sync, real word-level timeline. The captioning piece of Captions.ai, done deeper.",
    whoCapto:
      "You already have footage and just need it captioned properly, without re-syncing audio after every export, without a watermark, and without a $24.99 monthly bill.",
    whoCompetitor:
      "You film with their teleprompter, use their AI Actors, or shoot directly inside the app. The all-in-one creator studio is their thing.",
    table: [
      { label: "Entry paid price", capto: "€6.99/mo", competitor: "$24.99/mo" },
      { label: "Free plan", capto: true, competitor: "Limited trial" },
      { label: "Lossless export", capto: true, competitor: false },
      { label: "Audio sync on export", capto: "Untouched", competitor: "Reported issues" },
      { label: "Watermark on paid", capto: "None", competitor: "None" },
      { label: "Word-level timeline", capto: true, competitor: "Partial" },
      { label: "Languages", capto: "50+", competitor: "30+" },
      { label: "AI clipping", capto: "Ultra plan", competitor: false },
      { label: "Teleprompter / AI Actors", capto: false, competitor: true },
      { label: "Flat team pricing", capto: true, competitor: false },
    ],
    captoWins: [
      { title: "Audio that stays in sync.", body: "Captions.ai users report sync drift on export across multiple plan tiers — the single most-cited complaint in their reviews. Capto re-attaches your original audio track on export. No drift." },
      { title: "Lossless original-quality export.", body: "Captions re-encodes. We don't. If you mastered a clip at 4K 60fps with a polished mix, that's what comes out." },
      { title: "Less than a third of the price.", body: "$24.99 vs €6.99. For the same job: captioning short-form video." },
      { title: "Real word-level timeline.", body: "Drag, retime, and restyle individual words. Captions has partial word-level control but locks the deeper edits behind a paywall." },
    ],
    competitorWins: {
      intro: "Where Captions genuinely wins:",
      points: [
        { title: "You can shoot in the app.", body: "Captions has a teleprompter and AI Actors, neither of which we have. If you film inside the tool, Captions is irreplaceable." },
        { title: "Mobile-first workflow.", body: "Captions' iOS app is best-in-class for record-and-publish. Capto is a desktop and web tool first." },
        { title: "Polished branded presets.", body: "A heavily designed style library that works well for creators who want zero customization." },
      ],
      outro: "If your workflow is shoot and publish from the same app, Captions is the right tool. Capto is for everything that happens after the shoot.",
    },
    pricing: {
      rows: [
        { label: "Monthly", capto: "€6.99", competitor: "$24.99 (~€23)" },
        { label: "Annual", capto: "€59.99", competitor: "~$240" },
        { label: "Difference", capto: "—", competitor: "+€180/yr" },
      ],
      note: "Same job, captioning short-form video, for less than a third of the price.",
    },
    faq: [
      { q: "Does Capto have a teleprompter?", a: "No. If you film inside the app, Captions is the better tool. Capto starts after the camera turns off." },
      { q: "Does Capto have AI Actors / avatars?", a: "No. That's a different product category. Capto is for captioning real footage from real people." },
      { q: "Will my Captions presets transfer?", a: "No, different engines. But our preset library covers the most-used Captions looks, and full custom style controls are on every plan." },
      { q: "Why is Captions so much more expensive?", a: "They're funding a bigger product surface: teleprompter, AI Actors, mobile-first studio. You pay for that whether you use it or not. Capto charges only for what we do." },
    ],
    ctaTitle: "The captioning half of Captions. Done better. Done cheaper.",
    ctaBody: "Free to start. Lossless on export. No sync issues.",
  },
  {
    slug: "veed",
    competitor: "VEED",
    tag: "Capto vs VEED",
    title: "A captioning tool, not a Swiss army knife you'll never master.",
    intro:
      "VEED is a full online video editor. Capto is the captioning piece, done deeper, for a quarter of the price.",
    heroNote: "€6.99/mo. Lossless export. No watermark on any plan.",
    metaTitle: "Capto vs VEED — When you just need captions, not the editor",
    metaDescription:
      "€6.99 vs $24. No watermark on any plan. Designed caption styles. The captioning piece of VEED for a quarter of the price.",
    whoCapto:
      "You just need short-form videos captioned, fast, with timing and styling that actually look designed.",
    whoCompetitor:
      "You need a full browser-based video editor: trimming, compositing, screen recording, subtitling, transcription, all in one place, and you don't mind the learning curve or the price.",
    whoNote: "VEED is wide. Capto is deep. If captions are the job, Capto wins on the job.",
    table: [
      { label: "Entry paid price", capto: "€6.99/mo", competitor: "$24/mo" },
      { label: "Free plan", capto: "No watermark", competitor: "Watermark" },
      { label: "Watermark on paid", capto: "None", competitor: "Removed on Pro+" },
      { label: "Lossless export", capto: true, competitor: false },
      { label: "Word-level timeline", capto: true, competitor: false },
      { label: "Animated word-level captions", capto: true, competitor: "Basic" },
      { label: "Languages", capto: "50+", competitor: "100+" },
      { label: "Full video editor", capto: "Captions only", competitor: true },
      { label: "Screen recorder", capto: false, competitor: true },
      { label: "Team plans", capto: "Flat", competitor: "Per-seat" },
    ],
    captoWins: [
      { title: "Designed captions, not template captions.", body: "VEED's caption library is functional. Capto's looks like it came from an editor, not a template gallery. Word-level animation is built in, not bolted on." },
      { title: "Lossless export.", body: "VEED re-encodes everything. Your 4K master comes out re-compressed. Capto keeps your original quality end to end." },
      { title: "A quarter of the entry price.", body: "€6.99 vs $24. For captions, the math doesn't justify VEED." },
      { title: "Word-level timeline.", body: "VEED edits captions at the line level. Capto edits at the word level, the only way to get the look people screenshot from TikTok." },
      { title: "No watermark, on every plan.", body: "VEED watermarks Free. Capto doesn't." },
    ],
    competitorWins: {
      intro: "Where VEED genuinely wins:",
      points: [
        { title: "It's a full video editor.", body: "Trim, compose, layer, screen-record, transcribe. If you need all of that in a browser, VEED is the only tool here that does the job." },
        { title: "Bigger transcription language library.", body: "100+ vs our 50+. We cover the major markets; VEED covers more long-tail." },
        { title: "Stock library and templates.", body: "Built-in stock footage and templates speed up creators who don't have B-roll on hand." },
      ],
      outro: "If you need a full editor and captioning is one feature among many, VEED is a fair pick. If captions are the job, you're paying for 90% of features you won't use.",
    },
    pricing: {
      rows: [
        { label: "Monthly", capto: "€6.99", competitor: "$24 (~€22)" },
        { label: "Annual", capto: "€59.99", competitor: "~$216" },
        { label: "Difference", capto: "—", competitor: "+€170/yr" },
      ],
      note: "If you only need captions, you're overpaying by ~€170/year for an editor you won't use.",
    },
    faq: [
      { q: "Can Capto trim and edit full videos?", a: "No. Capto's timeline is for caption editing, not full video editing. To cut, compose, and layer footage, use VEED or a real editor like Premiere or Resolve." },
      { q: "Does Capto record my screen?", a: "No. Capto starts when you have a clip ready to caption." },
      { q: "Will my VEED captions transfer?", a: "Export from VEED as SRT and import into Capto. We'll auto-time and re-style." },
      { q: "Why is VEED so much more expensive?", a: "You're paying for the whole editor: stock library, screen recorder, transcription, full timeline. If you need those, fair trade. If you only need captions, you're overpaying." },
    ],
    ctaTitle: "Stop paying for an editor when you just need captions.",
    ctaBody: "Free to start. Lossless, watermark-free, in under two minutes.",
  },
  {
    slug: "opusclip",
    competitor: "OpusClip",
    tag: "Capto vs OpusClip",
    title: "OpusClip clips. Capto captions. Use both, or use the one that fits.",
    intro:
      "OpusClip turns long videos into short clips automatically. Capto makes those clips actually look posted, not auto-generated.",
    heroNote: "€6.99 vs $27. And our captions don't look templated.",
    metaTitle: "Capto vs OpusClip — Use both, or pick the one that fits",
    metaDescription:
      "OpusClip clips. Capto captions. €6.99 vs $27, and the two stack beautifully for long-to-short workflows.",
    whoCapto:
      "You have clips already and need them captioned beautifully. Or pick both: let OpusClip do the clipping and Capto do the captions. They stack.",
    whoCompetitor:
      "You have a podcast, webinar, or long-form video and want AI to pick the best moments and turn them into 20+ shorts automatically. That's their core job and they do it well.",
    table: [
      { label: "Entry paid price", capto: "€6.99/mo", competitor: "$27/mo" },
      { label: "Free plan", capto: "No watermark", competitor: "Watermark" },
      { label: "Lossless export", capto: true, competitor: false },
      { label: "Word-level timeline", capto: true, competitor: "Limited" },
      { label: "Caption styles", capto: "Designed + full custom", competitor: "~5 styles" },
      { label: "AI long-to-short clipping", capto: "Ultra (Magic Clips)", competitor: true },
      { label: "Hook Score / viral prediction", capto: "Ultra plan", competitor: true },
      { label: "Auto-posting to platforms", capto: false, competitor: true },
      { label: "Languages", capto: "50+", competitor: "20+" },
      { label: "Re-edits", capto: "Unlimited", competitor: "Eats credits" },
    ],
    captoWins: [
      { title: "Captions that look made, not generated.", body: "OpusClip's caption styles are functional, about five presets in 20 languages. Capto's are designed, fully customizable at the word level, and look like what actually goes viral." },
      { title: "Less than a third of the price.", body: "€6.99 vs $27. For captioning, it isn't close." },
      { title: "Lossless export.", body: "OpusClip re-encodes. Capto preserves the original." },
      { title: "More languages.", body: "50+ vs 20+. Especially strong on European languages with diacritics." },
      { title: "Unlimited re-edits.", body: "OpusClip uses credits, every re-clip eats your monthly cap. Capto charges by source minutes, so fixes are free." },
    ],
    competitorWins: {
      intro: "Where OpusClip genuinely wins:",
      points: [
        { title: "Long-to-short clipping at the core.", body: "OpusClip's whole product is turning a 2-hour podcast into 20 shorts. Their AI is purpose-built for that. Capto's Magic Clips (Ultra) does the same job but OpusClip has the head start." },
        { title: "Auto-publishing.", body: "OpusClip can post directly to TikTok, Reels, and Shorts on a schedule. Capto exports to file; you still hit publish yourself." },
        { title: "Virality scoring at scale.", body: "Hook Score on every clip in the batch. Capto includes it on Ultra; OpusClip includes it on every paid tier." },
      ],
      outro: "If your workflow is podcast → AI picks moments → AI posts them, OpusClip is the tool. If captioning is the bottleneck, run OpusClip's clips through Capto.",
    },
    pricing: {
      rows: [
        { label: "Monthly", capto: "€6.99", competitor: "$27 (~€25)" },
        { label: "Annual", capto: "€59.99", competitor: "~$203" },
        { label: "Difference", capto: "—", competitor: "+€140/yr" },
      ],
      note: "Run both: Capto Ultra (€17.99) + OpusClip Starter still gets you the deepest captioning and clipping for less than OpusClip Pro alone.",
    },
    faq: [
      { q: "Can I use both OpusClip and Capto?", a: "Yes, many creators do. Export from OpusClip as raw clips, drop them into Capto for the captioning pass. Our lossless export preserves OpusClip's render quality." },
      { q: "Does Capto have a Hook Score?", a: "On Ultra, yes. Magic Clips includes Hook Score scoring on every clip." },
      { q: "Can Capto auto-post to social platforms?", a: "Not yet. Capto exports the file; you publish from your phone or scheduler." },
      { q: "What's Magic Clips on Ultra?", a: "Long video in, short clips out, the same workflow as OpusClip, built into Capto Ultra. Ultra users get the option without paying for a second tool." },
    ],
    ctaTitle: "Clip with OpusClip. Caption with Capto.",
    ctaBody: "Or just caption beautifully and skip OpusClip entirely.",
  },
];

export const getVs = (slug: string) => VS.find((v) => v.slug === slug);
export const vsSlugs = () => VS.map((v) => v.slug);

// Old /compare/[slug] URLs that now 301 to the richer /vs/[slug] page.
export const COMPARE_TO_VS: Record<string, string> = {
  "capto-vs-submagic": "submagic",
  "capto-vs-captions-ai": "captions",
  "capto-vs-veed": "veed",
  "capto-vs-opusclip": "opusclip",
};
