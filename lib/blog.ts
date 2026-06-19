export type Section = { heading?: string; paras?: string[]; bullets?: string[] };

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: "Pricing" | "How-to" | "Comparison" | "Strategy";
  readingMin: number;
  sections: Section[];
};

export const POSTS: Post[] = [
  {
    "slug": "focused-caption-tool-vs-all-in-one",
    "title": "Why a Focused Caption Tool Beats the All-in-One Editors",
    "description": "All-in-one editors do captions as a checkbox feature. A focused caption tool does them properly: word-level timing, lossless export, no watermark, and €6.99 pricing.",
    "date": "2026-06-16",
    "category": "Strategy",
    "readingMin": 5,
    "sections": [
      {
        "heading": "The feature-list trap",
        "paras": [
          "Every all-in-one editor sells you the same dream: trim, color grade, add music, mask faces, generate B-roll, and oh yes, captions too. The pitch is breadth. The reality is that captions are item number nine on a roadmap of forty things, maintained by whoever lost the sprint planning argument that week.",
          "Short-form video lives and dies on captions. Roughly 80 percent of mobile feeds play on mute by default, so the words on screen are the hook, not the audio. When the single most important element of your video is a side quest for the tool you use, you feel it in the output. Timing drifts. Words clump three to a frame. The styling looks like a 2019 meme.",
          "Focus is not a marketing word here. It is a resource allocation decision. A tool that does one thing puts every engineering hour into that one thing. That is the entire argument, and the rest of this post is just receipts."
        ]
      },
      {
        "heading": "What 'captions as a checkbox' actually costs you",
        "paras": [
          "Open most all-in-one editors and the caption feature does the bare minimum: it transcribes, drops a block of text on a clip, and lets you pick a font. Good enough for a demo, not good enough for a feed that scrolls past you in 0.8 seconds."
        ],
        "bullets": [
          "Caption-level timing instead of word-level. The whole sentence appears at once, so you lose the karaoke pop that keeps eyes locked to the screen.",
          "Re-encoded export. The editor flattens your video through its own pipeline and you ship a slightly muddier, smaller file than what you started with.",
          "A watermark on the free tier, or a paywall the moment you want to remove it.",
          "Generic presets. Three caption styles, all of them you have seen a thousand times, none of them yours.",
          "Cloud transcription you cannot tune, priced into a subscription you cannot escape."
        ]
      },
      {
        "heading": "Word-level timing is the whole game",
        "paras": [
          "Here is the difference you can feel without measuring anything. Caption-level timing shows a full line, then swaps it for the next line. Word-level timing highlights each word the instant it is spoken, so the caption moves at the speed of speech.",
          "That movement is not decoration. It is what keeps a muted viewer reading instead of scrolling. The eye tracks the active word, the brain stays one beat ahead, and the three-second retention number that decides whether your video gets pushed goes up. Editors that bolt captions on as an afterthought rarely get this right, because doing it well means aligning text to audio at the millisecond level, not the sentence level.",
          "Capto is built around word-level timing as the default, not a Pro upsell. You get the per-word highlight out of the box, and you can nudge any individual word if the model put a boundary half a frame off."
        ]
      },
      {
        "heading": "Lossless export, no watermark, your own transcription key",
        "paras": [
          "Three quiet things separate a focused tool from a bundle, and none of them show up in a feature comparison table until you actually ship a video.",
          "First, lossless export. Capto preserves your original quality instead of running the file through a re-encode you never asked for. The captions are burned in, the underlying video is the file you brought. No generation loss stacking up every time you tweak and re-export.",
          "Second, no watermark, ever. Not on the free tier, not as a 'remove for €X' hostage situation. A watermark on someone else's content is free advertising for the tool and a credibility tax on you.",
          "Third, bring-your-own-Groq-key. Instead of marking up cloud transcription and folding it into a subscription, Capto lets you plug in your own Groq API key. You pay Groq's near-zero per-minute rate directly, the transcription is fast, and you are not subsidizing someone's margin on a service you could buy at cost."
        ]
      },
      {
        "heading": "The honest tradeoff",
        "paras": [
          "A focused tool is not a free lunch, and pretending otherwise would be exactly the kind of corny pitch this is supposed to avoid. If you need to cut a multi-clip edit, grade color, mix audio, and add transitions, a caption tool does not do that and should not pretend to.",
          "So the workflow is two tools, not one. You edit where you edit. Then you run the export through a tool that treats captions as the product instead of the garnish. For most short-form creators that is a Premiere, CapCut, or DaVinci timeline for the cut, and a dedicated pass for the captions.",
          "The objection is 'that is an extra step.' True. It is also the step that the all-in-one editors do worst, which is why pulling it out and doing it properly is worth the thirty seconds. You are not adding work. You are moving the most important work to the tool that is actually good at it."
        ]
      },
      {
        "heading": "What focused pricing looks like",
        "paras": [
          "Bundles charge bundle prices. You pay for the color grading and the stock library and the AI B-roll generator whether you touch them or not, and the caption feature you actually came for is rolled into a €20-plus monthly bill.",
          "Capto Pro is €6.99 a month, or €59.99 a year, which works out to about €5 a month. That is the price of doing one thing and doing it well, instead of charging you for forty things to subsidize the nine that are half-finished. The math is simple: if captions are most of why you open an editor, pay for captions, not for the rest of someone's roadmap."
        ]
      },
      {
        "heading": "Try the focused version",
        "paras": [
          "If your last few videos had captions that lagged the audio, clumped words together, or shipped with a watermark you had to crop around, the tool is the problem, not your editing.",
          "Run one clip through Capto. Bring your own Groq key, get word-level timing by default, export at original quality with no watermark, and see whether the captions feel different in the feed. One video is enough to know. That is the upside of a tool that only has to be good at one thing."
        ]
      }
    ]
  },
  {
    "slug": "lossless-caption-export-quality",
    "title": "Stop Letting Your Caption Tool Recompress Your Video",
    "description": "Most caption tools quietly re-encode your video on export, costing you sharpness and bitrate. Here is why it happens, how to spot it, and how to avoid it.",
    "date": "2026-06-09",
    "category": "Strategy",
    "readingMin": 5,
    "sections": [
      {
        "heading": "The export step nobody watches",
        "paras": [
          "You shot at 4K, color graded it, exported a clean master out of your editor. Then you dragged it into a captioning tool, typed nothing, changed nothing about the actual footage, and clicked export. The file that came back is softer, smaller, and somehow looks worse on a phone than the one you put in.",
          "That is not your imagination and it is not the platform compressing it later. Most caption tools re-encode the entire video on the way out, even though all they did was add a text layer. The pixels under the captions get thrown away and rebuilt at whatever quality the tool feels like.",
          "Captions are a tiny overlay. There is no technical reason adding them should touch the rest of your frame. But the default behavior of nearly every all-in-one editor is to treat your upload as raw material and your export as a fresh render, full re-compression included."
        ]
      },
      {
        "heading": "What recompression actually does to your footage",
        "paras": [
          "Video is already lossy. When you export from your NLE, the H.264 or H.265 encoder makes thousands of decisions about what detail to keep and what to throw away to hit a target bitrate. That is generation one. Every time another tool decodes that file and re-encodes it, you stack generation two on top, then three, then four.",
          "Each pass compounds the artifacts. Fine texture in skin and hair turns mushy. Gradients in skies and out-of-focus backgrounds get banding. Fast motion blocks up. The damage is worst exactly where short-form lives: high-detail, high-motion, viewed close-up on an OLED phone screen."
        ],
        "bullets": [
          "Bitrate drops: a tool re-encoding to 8 Mbps from your 40 Mbps master is discarding roughly 80 percent of the data, captions or not.",
          "Chroma subsampling can shift from 4:2:2 down to 4:2:0, dulling saturated colors.",
          "Audio frequently gets re-encoded too, dropping from your source AAC bitrate to a lower default.",
          "Then TikTok, Reels, and Shorts run their own aggressive pass on upload. You want to hand them the cleanest possible source, not a second-generation copy."
        ]
      },
      {
        "heading": "Why caption tools do it anyway",
        "paras": [
          "It is not malice, it is convenience for the tool builder. Re-encoding every export means the engineering team writes one render pipeline and never has to think about the dozens of codecs, containers, and color profiles people upload. Burn captions into a fresh render, ship one MP4, done.",
          "It is also a footprint decision. A tool that re-compresses to a low bitrate moves smaller files through its servers and pays less for bandwidth and storage. Your quality is the line item they are quietly cutting.",
          "Watermarks make it worse. Free tiers that stamp a logo over your video are, by definition, re-rendering the whole frame to bake that logo in. There is no lossless path that also adds a watermark. The two are mutually exclusive."
        ]
      },
      {
        "heading": "How to catch it in 90 seconds",
        "paras": [
          "You do not need to trust anyone's marketing. Measure it. Run your source through the caption tool, export, and compare the two files directly.",
          "If the numbers move significantly and you did not change the footage, the tool is recompressing. A genuinely lossless caption export touches the caption region and leaves the rest of the stream alone."
        ],
        "bullets": [
          "Compare file size: a 120 MB input that comes back as 22 MB got crushed.",
          "Check bitrate with a free tool like MediaInfo or the command ffprobe -i yourfile.mp4. Watch the overall bitrate before and after.",
          "Eyeball a still frame from a busy, high-motion section side by side at 100 percent zoom. Look at edges and shadow detail.",
          "Listen to the audio. Re-encoded tracks often lose high-end sparkle and pick up a faint smear on transients."
        ]
      },
      {
        "heading": "What a focused tool does differently",
        "paras": [
          "This is the case for using a tool that does one thing. A captioning tool that only captions has no reason to rebuild your video. It generates the word-level timing, renders the caption layer, and composites that layer without re-compressing the footage underneath. Your master quality survives intact.",
          "Single-purpose also means the timing is better. Word-level captions, where each word pops on the exact frame it is spoken, require accurate transcription and a tight render path. Bloated editors that bolt captions onto a video timeline tend to give you clunky line-level subtitles that lag the audio by a beat.",
          "The contrarian take: an all-in-one editor is worse at captions specifically because captions are not its priority. It is juggling transitions, effects, music, and color, and the caption module is the afterthought that ships with a lossy default export nobody on the team flagged."
        ]
      },
      {
        "heading": "A clean workflow that protects quality",
        "paras": [
          "Keep your pipeline short and keep the lossy steps to one. The fewer tools that touch the actual pixels, the more of your original master reaches the viewer.",
          "The order matters. Caption last, on a finished master, with a tool that does not re-render. That way the only generation loss in the whole chain is the platform's own upload pass, which you cannot avoid anyway."
        ],
        "bullets": [
          "Edit and color in your NLE. Export one high-bitrate master.",
          "Caption that master in a dedicated tool that exports losslessly, so the footage is untouched.",
          "Bring your own Groq key for fast, accurate transcription instead of waiting in a shared queue.",
          "Upload that file directly to the platform. One unavoidable compression pass, not four."
        ]
      },
      {
        "heading": "Try it on your own footage",
        "paras": [
          "Capto exists because of this exact problem. It does one thing, captions, and it exports at original quality with no second render and no watermark, so the file you upload is the master you made. Word-level timing, bring-your-own-Groq-key, and a Pro tier at 6.99 euro monthly or 4.99 euro on annual.",
          "Do not take the claim on faith. Run your worst-case clip, something high-motion and detailed, through your current tool and through Capto, then compare bitrate and a frozen frame at 100 percent. If your current tool is quietly costing you a generation of quality, you will see it in about a minute. Then decide which file you would rather hand to the algorithm."
        ]
      }
    ]
  },
  {
    "slug": "best-caption-font-short-form-2026",
    "title": "The Best Caption Fonts for Short-Form Video in 2026",
    "description": "The caption fonts that actually hold up on a phone screen in 2026, why most defaults fail, and exact settings for TikTok, Reels, and Shorts.",
    "date": "2026-06-02",
    "category": "How-to",
    "readingMin": 5,
    "sections": [
      {
        "heading": "Most caption fonts fail for one boring reason",
        "paras": [
          "Captions get watched at arm's length, on a 6-inch screen, while someone scrolls in bad lighting on a bus. That is the entire design brief. It is not a poster. It is not a website header. The font has to be legible at a tiny physical size, against moving footage, for about 0.4 seconds per word.",
          "Almost every font people reach for fails that brief. Thin weights vanish over bright footage. Tight letter spacing turns into mush at small sizes. Decorative serifs and script fonts look great frozen in a screenshot and turn illegible the moment the clip is playing at speed.",
          "So before we get to names, here is the rule that does most of the work: pick a heavy sans-serif with wide apertures and generous spacing, and the specific typeface barely matters after that. Everything below is a way of being right about that rule."
        ]
      },
      {
        "heading": "The five fonts worth using in 2026",
        "paras": [
          "These are the ones that survive real playback, not just a still frame. Each has a reason it earns the slot."
        ],
        "bullets": [
          "Montserrat (Bold/ExtraBold): the safe default that does not look like a default. Wide, even, slightly geometric, reads clean in white-on-dark. If you do not want to think, use this.",
          "Inter (Bold/Black): designed for screens at small sizes, which is exactly the problem you have. Tall x-height means lowercase stays readable when the caption is small. Great for talking-head and educational content.",
          "TheBoldFont / Bebas-style condensed caps: the look TikTok trained everyone to read. Condensed, all-caps, heavy. Fits long lines on a narrow screen without shrinking. Reads as native, which is the point.",
          "Poppins (SemiBold/Bold): rounder and friendlier than Montserrat, geometric circles that hold up over busy backgrounds. Good for lifestyle, beauty, and softer brand tone.",
          "Anton: a single weight, extremely heavy, condensed. One trick, but it is a great trick for punchy one or two word emphasis frames. Use it for the keyword, not the whole sentence."
        ]
      },
      {
        "heading": "What to never put on a moving video",
        "paras": [
          "The fastest way to make a clip look amateur is the font, and it is almost always one of these."
        ],
        "bullets": [
          "Thin and Light weights. They disappear the instant the background gets bright. Minimum weight for captions is Semibold, and Bold is safer.",
          "Pure script and handwriting fonts. Beautiful still, unreadable in motion. The connected strokes need time the viewer does not have.",
          "True serifs at body size. The thin serif details break up and shimmer when scaled down and compressed. A heavy slab can work as accent, a delicate serif cannot.",
          "Anything system-default and untreated. Helvetica with no stroke, no shadow, no background sitting flat on footage reads as a placeholder, not a choice.",
          "Mixing three or more fonts in one video. Pick one workhorse, maybe one accent. That is the whole budget."
        ]
      },
      {
        "heading": "The settings that matter more than the font",
        "paras": [
          "Honest take: contrast and sizing beat font choice every time. A mediocre font set up correctly outperforms a perfect font sitting naked on the frame. Here are the numbers I actually use.",
          "Size: caption text should sit around 7 to 9 percent of the frame height. On a 1080x1920 vertical video that is roughly 130 to 170 px for the main line. Emphasis words can go bigger. Smaller than that and you are gambling on the viewer's eyesight.",
          "Contrast: never trust the footage. White fill with a 2 to 4 px black stroke works on almost everything. If the background is genuinely chaotic, add a semi-transparent rounded background box behind the text instead of fighting it with shadow.",
          "Safe zone: keep captions out of the bottom 12 to 15 percent of the frame. That band is where TikTok usernames, Reels UI, and Shorts buttons live, and they will cover your words on the platform even if your export looks fine."
        ],
        "bullets": [
          "Line length: 4 to 7 words per line, two lines max. Long lines force the font smaller and kill reading speed.",
          "Letter spacing: add 1 to 3 percent tracking for all-caps condensed fonts. They clump together by default.",
          "Position: center or slightly-below-center is the modern look. Hard-bottom captions are a 2019 tell."
        ]
      },
      {
        "heading": "Matching the font to the content",
        "paras": [
          "There is no single best font, there is a best font for the job. The choice signals tone before anyone reads a word, so it should match what you are actually making.",
          "For talking-head, education, and anything word-dense, prioritise pure legibility: Inter or Montserrat Bold, white-on-dark, modest size, let the words do the work. For high-energy entertainment, hooks, and reaction clips, condensed all-caps with per-word color emphasis is the native language of the feed and reads as fluent. For brand, beauty, and calmer lifestyle content, Poppins gives you warmth without going soft enough to lose legibility.",
          "The trap is using an entertainment style on educational content. Aggressive bouncing all-caps karaoke captions on a thoughtful explainer feel like shouting over yourself. Tone mismatch reads as a lack of taste even when the typeface is fine."
        ]
      },
      {
        "heading": "The detail nobody mentions: rendering quality",
        "paras": [
          "Here is the part that gets skipped in every font listicle. The font does not matter if the export wrecks it. Heavily compressed exports smear thin strokes and add color fringing around white text, and a lot of caption tools re-encode your whole video to bake in the text, dropping it to the tool's own bitrate regardless of what you fed it.",
          "You can pick the perfect Bold weight and still end up with soft, haloed captions because the file went through a quality-killing render. Crisp edges on text are the single biggest tell between footage that looks shot on a phone and footage that looks produced.",
          "So the checklist for sharp captions is: heavy enough weight, real contrast against the footage, correct size, safe-zone aware, and an export that does not throw away quality. The first four are font and layout decisions. The last one is your tool's decision, and most tools make it badly."
        ]
      },
      {
        "heading": "Where Capto fits",
        "paras": [
          "Capto does one thing: captions for short-form video. Not a timeline editor with captions bolted on, just the caption job done properly. That focus is why the type rendering is the priority instead of an afterthought.",
          "You get the heavy, legible fonts above ready to go, word-level timing so emphasis lands on the exact frame, and no watermark eating your safe zone. Export is lossless and keeps your original quality, so the crisp edges you set up in the editor are the crisp edges that reach the feed, not a re-compressed approximation. Transcription runs on your own Groq key, so it is fast and cheap.",
          "Pick a Bold sans, set real contrast, respect the safe zone, then export without throwing the quality away. Capto is built to make that last step the easy one. Pro is 6.99 euro per month, or 4.99 euro on annual, and the caption quality is the entire pitch."
        ]
      }
    ]
  },
  {
    "slug": "add-captions-to-tiktok",
    "title": "How to Add Captions to a TikTok (the Fast Way)",
    "description": "Three real ways to caption a TikTok, ranked by speed and quality. Why the in-app auto captions cost you reach, and the workflow that takes about two minutes.",
    "date": "2026-05-26",
    "category": "How-to",
    "readingMin": 5,
    "sections": [
      {
        "heading": "First, decide what kind of captions you actually want",
        "paras": [
          "People say \"add captions\" to mean two different things, and the method changes depending on which one you need. The first is burned-in captions: text baked into the video pixels, the kind that pop on word by word and stay on screen whether or not the viewer has sound on. The second is closed captions: a separate text track TikTok generates so the platform and accessibility tools can read it. You usually want both, but the burned-in ones are what carry the video.",
          "Here is the part nobody tells you. Roughly 80 percent of people watch short-form video with sound off at least some of the time, which is why burned-in captions are not a nice-to-have. They are the difference between someone watching three seconds and someone watching to the end. TikTok's algorithm leans hard on watch time and completion rate, so captions are a retention tool first and an accessibility feature second.",
          "So the goal is simple: get accurate, readable, well-timed text burned into the video, fast, without wrecking the export quality. There are three ways to do it. They are not equal."
        ]
      },
      {
        "heading": "Method 1: TikTok's built-in auto captions (free, fast, mediocre)",
        "paras": [
          "TikTok has a native captions tool. It is the path of least resistance and the one most people default to."
        ],
        "bullets": [
          "Record or upload your clip, then on the editing screen tap the Captions icon in the right-hand toolbar.",
          "TikTok transcribes the audio automatically in a few seconds.",
          "Tap the pencil to fix the inevitable wrong words, then position the caption block on screen.",
          "Post.",
          "Total time: about a minute for a short clip."
        ]
      },
      {
        "heading": "Why the built-in tool quietly costs you",
        "paras": [
          "The convenience is real. The tradeoffs are also real, and they compound on every video you post.",
          "First, the styling is locked down. You get TikTok's default look, a single caption block, basic positioning. No control over how words appear, no per-word emphasis, none of the punchy timing that makes good creators' captions feel alive. Everything you make looks like everything everyone else makes.",
          "Second, the timing is sentence-level, not word-level. The caption sits there as a static block while you talk. The version that holds attention is word-level: each word lands as you say it, so the viewer's eye tracks your voice. The built-in tool does not do that.",
          "Third, and this is the one that hurts later, you are locked into editing inside TikTok. The captions live on that one platform. Want to cross-post the same clip to Reels and Shorts? You start over. The whole point of short-form is repurposing one shoot across three platforms, and burning captions inside TikTok throws that away."
        ]
      },
      {
        "heading": "Method 2: caption it externally, then upload (the fast way)",
        "paras": [
          "This is the workflow that actually scales. You caption the video once in a dedicated tool, export a clean MP4 with the text burned in, then upload that file to TikTok, Reels, and Shorts. One pass, three platforms, full styling control.",
          "Here is the flow with Capto, which does exactly this and nothing else:"
        ],
        "bullets": [
          "Drop your video in. Transcription runs through your own Groq key, so it is fast and you are not paying a per-minute tax to a middleman.",
          "Review the transcript. It comes back word-level, so fixing a name or a stray word takes a couple of clicks, not a re-render.",
          "Pick a style. Set the font, color, the active-word highlight, and position once. It becomes your look across every video.",
          "Export. You get a clean MP4 with captions burned in, at the original resolution and bitrate, no watermark.",
          "Upload to TikTok with captions already baked in. Total time on a 30-second clip: about two minutes, most of it spent reading the transcript."
        ]
      },
      {
        "heading": "The detail that matters most: export quality",
        "paras": [
          "Most caption tools, including the in-app one, recompress your video on the way out. They take your already-compressed source, draw text on it, and squeeze it through their encoder again. That second pass is where the mush comes from: smeared gradients, blocky motion, that slightly soft look you can never quite place. Then TikTok compresses it a third time on upload. You are stacking lossy passes.",
          "Capto exports at original quality. The frames you did not touch stay byte-for-byte close to your source, and the only real change is the caption layer drawn on top. You still get TikTok's upload compression, because everyone does, but you walk in with a clean file instead of a pre-degraded one. On a platform where a slightly sharper video reads as a slightly more professional creator, that gap shows.",
          "Same story with the watermark. The built-in tool is free but ties you to the platform. Plenty of third-party apps are free until you hit export, then they stamp a logo across the corner or make you pay to remove it. Capto does not put a watermark on your work, full stop."
        ]
      },
      {
        "heading": "Add closed captions too (do not skip this)",
        "paras": [
          "Burned-in captions carry the watch experience. But you should still add TikTok's closed captions for the accessibility and SEO layer, and it takes ten seconds.",
          "When you upload your finished video, look for the Captions toggle on the post screen and switch it on. TikTok auto-generates a CC track from the audio. It does not need to be perfect, because your burned-in captions are already doing the heavy lifting on screen. The CC track helps screen readers, helps non-native speakers, and gives TikTok's systems clean text to understand what your video is about. That last part feeds discovery."
        ],
        "bullets": [
          "Burned-in captions: retention and watch time. Non-negotiable.",
          "Closed captions: accessibility plus searchability. Free, so do both."
        ]
      },
      {
        "heading": "The fast way, in one line",
        "paras": [
          "If you post once in a while, TikTok's built-in tool is fine. Use it and move on. But if you post regularly, repurpose across platforms, or care how your videos read, captioning inside the app is the slow way pretending to be the fast one. You re-edit per platform, you inherit locked styling, and you eat extra compression on every export.",
          "The genuinely fast way is to caption once in a tool built for it, with word-level timing and a clean export, then upload that file everywhere. That is the entire reason Capto exists. It does captions and nothing else, which is exactly why the captions are good. Bring your own Groq key, set your style once, export at original quality with no watermark. Pro is 6.99 euros a month, or 4.99 if you pay annually. Try it on your next clip and compare the export side by side with what comes out of the in-app tool. The difference is not subtle."
        ]
      }
    ]
  },
  {
    "slug": "submagic-vs-capto-real-cost",
    "title": "Submagic vs Capto: The Real Monthly Cost, Lined Up",
    "description": "Submagic vs Capto on actual monthly cost, not headline pricing. Credits, export limits, watermarks, and what you really pay to caption short-form video.",
    "date": "2026-05-19",
    "category": "Comparison",
    "readingMin": 5,
    "sections": [
      {
        "heading": "The pricing page is not the price",
        "paras": [
          "Every caption tool puts a friendly number on the pricing page and hopes you stop reading there. Submagic vs Capto looks like a small gap until you account for the things that actually move your bill: credits, export caps, video-length limits, and whether the cheap tier even removes the watermark.",
          "So this is not a feature checklist with green ticks. It is the cost of captioning the videos you actually post in a month, lined up side by side. If you ship three Reels a week, your math is different from someone batching thirty. Both cases are covered below.",
          "One thing up front, because it shapes everything: Capto is a flat tool. Capto Pro is 6.99 euro per month, or 4.99 euro per month if you pay annually, and there is no credit meter ticking down while you work. Submagic is a credit-and-tier model, which is where the real cost hides."
        ]
      },
      {
        "heading": "How Submagic actually charges you",
        "paras": [
          "Submagic sells monthly plans that bundle a number of video credits. One credit roughly equals one video processed, and the plans step up in both credit count and feature access. The entry plan is cheap on paper but limited on credits and video length, and the mid and upper tiers are where most creators land once they hit the ceiling.",
          "The trap is not the headline price, it is the ceiling. Run out of credits mid-month and you either wait for the reset or upgrade. Longer videos and higher-resolution exports tend to live on the pricier tiers, so a podcast clip or a horizontal export can quietly push you up a plan. Pricing shifts over time, so check their live page for the exact numbers, but the structure is the thing to understand: you are renting a quota, not a tool."
        ],
        "bullets": [
          "You pay monthly for a fixed pool of video credits, not unlimited use.",
          "Credit pools and length caps differ per tier, so heavy or long videos cost more.",
          "Hit the cap and you upgrade or wait. There is no overflow valve at the cheap tier.",
          "Higher resolution and some export options are gated behind higher plans."
        ]
      },
      {
        "heading": "How Capto actually charges you",
        "paras": [
          "Capto charges 6.99 euro per month for Pro, or 4.99 euro per month billed annually. That is the whole sentence. No credits, no per-video meter, no resolution gate sitting between you and a clean export.",
          "There is one piece that throws people on first read: transcription runs on your own Groq API key. Bring-your-own-key sounds like a hidden fee, but Groq's free tier covers a serious volume of short-form transcription, and even paid usage is fractions of a cent per minute of audio. For a typical creator posting daily, the transcription cost rounds to zero. You are not handing a markup to a middleman, you are paying the raw provider rate, which is most of why the subscription stays at 6.99 euro.",
          "Capto does one thing, captions, and the price reflects a tool that does not need to fund a video editor, a B-roll library, and an AI script generator you will open twice."
        ]
      },
      {
        "heading": "The monthly math, two real creators",
        "paras": [
          "Numbers in the abstract are useless, so here are two people. Maya posts 12 short videos a month, all vertical, all under 90 seconds. Jonas posts 30, mixes in some 5-minute talking-head cuts, and exports in 1080p for repurposing.",
          "Maya on Submagic fits inside a lower tier most months, but a busy week can brush the credit cap. On Capto she pays 6.99 euro, or 4.99 euro annual, and her Groq transcription for 12 short clips is comfortably inside the free tier. Cost difference is real but modest at her volume.",
          "Jonas is where it splits open. Thirty videos plus longer cuts plus higher-res export pushes him into a mid or upper Submagic tier, often into the 20-to-40 euro per month range depending on current pricing. On Capto he pays the same 6.99 euro Maya does, because there is no per-video meter and no resolution gate. His Groq usage might cost a few cents. The flat model does not punish you for posting more, which is the entire point of posting more."
        ],
        "bullets": [
          "Light user (around 12 short videos): both affordable, Capto flat at 6.99 euro or 4.99 euro annual.",
          "Heavy user (30 plus, longer and higher-res): Submagic climbs with tier, Capto stays flat.",
          "The more you ship, the wider the gap, and shipping more is the job."
        ]
      },
      {
        "heading": "The costs that never show up on a pricing page",
        "paras": [
          "Watermarks are a cost. If the cheap tier stamps a logo on your export, the real price of a clean video is the upgrade, not the headline number. Capto never watermarks, on any plan.",
          "Re-encoding is a cost too, just paid in quality instead of euros. Plenty of caption tools re-compress your video on export, so a crisp source comes out softer. Capto exports at original quality, lossless, so the file you upload is the file you shot, captions on top.",
          "And then there is the cost of a tool that does too much. All-in-one editors spread their attention across editing, scheduling, AI scripts, and captions, so the captions are fine, not sharp. Capto puts word-level timing and caption quality first because it is the only thing on the menu. Time spent fighting clunky caption editing is a cost, even if it never hits the invoice."
        ]
      },
      {
        "heading": "Which one is actually right for you",
        "paras": [
          "If you genuinely want one app to edit, schedule, generate scripts, and caption, and you are fine paying for that breadth, Submagic is a coherent choice. Bundles make sense when you use the whole bundle.",
          "But if your problem is captions, fast, accurate, word-level, clean export, no watermark, at a price that does not climb when you post more, that is the exact shape of Capto. Flat 6.99 euro per month, or 4.99 euro annual, lossless export, bring-your-own-Groq-key so you pay raw transcription rates instead of a markup.",
          "The honest test: open your last month of posts, count the videos, and run both models against that number. If you post like you mean it, the flat tool wins on cost and on the captions themselves. Try Capto on your next batch and compare the export side by side. The bill, and the captions, make the argument for you."
        ]
      }
    ]
  },
  {
    "slug": "captions-watch-time-retention",
    "title": "How Captions Actually Change Watch Time and Retention",
    "description": "Captions don't magically fix retention. Here's what they actually do to watch time, where they help, where they don't, and how to caption for the curve.",
    "date": "2026-05-12",
    "category": "Strategy",
    "readingMin": 5,
    "sections": [
      {
        "heading": "The claim everyone repeats, and what's actually true",
        "paras": [
          "You've seen the stat. \"85% of Facebook video is watched on mute.\" It gets pasted under every caption tutorial as proof that captions are mandatory. The number is old (it dates to around 2016 and Facebook's autoplay-muted feed), but the underlying behavior is real and it's gotten stronger. People watch in line at the pharmacy, in bed next to a sleeping partner, in a meeting they should be paying attention to. Sound is the exception, not the default.",
          "Here's the part the stat doesn't tell you: captions don't raise retention on their own. They remove a failure mode. A muted viewer with no captions hits your video, understands nothing, and swipes. Captions keep that viewer in the running. They convert a guaranteed drop into a maybe. That's the real mechanism, and it's worth being precise about because it changes how you caption."
        ]
      },
      {
        "heading": "What captions do to the retention curve, specifically",
        "paras": [
          "Open any analytics view and you get a retention curve: percentage of viewers still watching at each second. Captions move two parts of that curve, and it's worth knowing which.",
          "The first three seconds. This is where most of your audience leaves. A muted viewer needs to know what your video is about before they decide to stay, and they decide fast. Captions give them the hook in text immediately. If your opening line is \"I deleted 40 plugins from my edit and nothing broke,\" that line on screen does the work your audio can't. The drop from second one to second three is usually the steepest part of any short-form curve, and captions flatten it more than anything else you can change in post.",
          "The middle. Long stretches without sound cues are where attention wanders. On-screen words give the eye a reason to stay locked even when nothing visually dramatic is happening. This matters most for talking-head content, tutorials, and anything where the value is in what's being said rather than shown."
        ]
      },
      {
        "heading": "Word-level beats sentence-level, and the difference is measurable",
        "paras": [
          "Not all captions are equal. The big divide is timing granularity.",
          "Sentence-level captions dump a full line on screen and leave it there for four seconds. Your eye reads it in one, then there's nothing new to track for the next three. Attention drifts. This is the SRT-file look, and it reads as an afterthought.",
          "Word-level captions highlight each word as it's spoken. The screen is always changing in sync with the voice, so the eye stays engaged and the brain stays synced to the audio even when there is no audio. This is the karaoke style you see on every high-retention creator's videos, and it's not a coincidence. It's a continuous micro-cue that keeps the viewer's attention pinned to the screen.",
          "The practical takeaway: if your captions update once per sentence, you're leaving retention on the table in the exact middle stretch where you most need it. Word-level timing is the fix, and it's the thing cheap auto-caption tools usually get wrong or won't give you control over."
        ]
      },
      {
        "heading": "Where captions don't help (and can actively hurt)",
        "paras": [
          "Captions are not a universal upgrade. A few honest cases where they do nothing or backfire:",
          "Music-driven or visual-only content. A transition montage set to a trending sound doesn't need words on screen. Captions there are clutter that covers the thing people came to watch.",
          "Captions that cover the action. If your text block sits over a face, a product, or the part of the frame doing the storytelling, you're trading a small retention gain for a visual loss. Keep captions in the lower-middle third, above the UI buttons but below the subject.",
          "Auto-captions with errors. A wrong word on screen is worse than no word. Viewers notice \"their\" when you said \"there,\" and it quietly tells them the whole video is low-effort. Wrong timing is just as bad: text that lags the audio by half a second feels broken even if every word is correct. This is why the editing pass matters more than the auto-transcription step."
        ]
      },
      {
        "heading": "How to caption for the curve, in practice",
        "bullets": [
          "Front-load the hook in text. Whatever makes someone stay past second three should be readable in the first frame, not buried in the third sentence.",
          "Use word-level timing so the screen is always moving in sync with speech. This is the single biggest retention lever in the caption itself.",
          "Keep lines short. One to three words visible at a time reads faster than a full sentence and survives the small phone screen people actually watch on.",
          "Position above the platform UI. TikTok and Reels stack buttons and text on the lower right and bottom. Captions that get covered are captions that do nothing.",
          "Proofread the transcription. Two minutes fixing names, numbers, and homophones protects the credibility of the entire video.",
          "Match the energy. Tight, punchy captions for fast talking-head content. Calmer pacing for slower, narrative pieces. The captions should feel like part of the edit, not pasted on top of it."
        ]
      },
      {
        "heading": "The tooling decision behind all of this",
        "paras": [
          "Everything above assumes you can actually control your captions: word-level timing, position, when text appears, fixing the transcription. A lot of all-in-one editors treat captions as one feature among forty, which means you get a single style, sentence-level timing, and a watermark on the way out. That's the bloat tax. The thing that moves your retention curve gets the least attention because the tool is busy being everything.",
          "Capto does one thing: captions for short-form video. Word-level timing you can edit frame by frame, full control over position and style, no watermark, and lossless export so the file you post is the original quality you shot, not a recompressed copy. You bring your own Groq key for transcription, which keeps it fast and keeps the cost honest. Pro is 6.99 euro per month, or 4.99 euro on annual.",
          "If captions are the part of your edit doing the heavy lifting on retention, it's worth using a tool that treats them that way. Run one of your recent videos through Capto, watch the first three seconds with word-level captions, and compare the curve on your next post."
        ]
      }
    ]
  },
  {
    "slug": "word-by-word-vs-line-captions",
    "title": "Word-by-Word vs Line Captions: Which Should You Use",
    "description": "Word-by-word captions chase retention. Line captions read clean. Here is when each one actually wins, with real timing numbers and a clear default to start from.",
    "date": "2026-05-05",
    "category": "How-to",
    "readingMin": 5,
    "sections": [
      {
        "heading": "The actual difference (it is not just style)",
        "paras": [
          "Word-by-word captions show one or two words at a time, popping in sync with the speaker. Line captions show a full phrase, usually 3 to 6 words, that sits on screen long enough to read before the next line swaps in. People treat this like a font choice. It is not. It changes how the viewer's eyes move and how much they have to work to follow you.",
          "Word-by-word is a pacing tool. Each word arriving on beat creates a tiny hit of motion that pulls the eye back to the screen every few hundred milliseconds. Line captions are a reading tool. They let someone absorb a whole thought at once, which matters when the words carry information instead of energy.",
          "Once you see them as two different jobs instead of two looks, picking the right one stops being a vibe call and becomes a content call."
        ]
      },
      {
        "heading": "When word-by-word wins",
        "paras": [
          "Word-by-word is built for fast, punchy, high-energy talking. Think hooks, hot takes, listicles, anything where the rhythm of speech is part of the point. The constant motion is the whole reason it boosts retention in the first second, where most of your drop-off happens."
        ],
        "bullets": [
          "Hooks and cold opens, where you need to grab a scrolling thumb in under a second",
          "Fast-paced talking-head content with a clear, energetic delivery",
          "Comedy and reaction edits where timing a single word to a beat is the joke",
          "Vertical video viewed on mute, where motion is the only thing signaling 'something is happening here'"
        ]
      },
      {
        "heading": "When line captions win",
        "paras": [
          "Line captions win the moment the words start doing real work. If a viewer needs to actually read and hold a sentence, flashing it one word at a time forces them to mentally reassemble the phrase, which is slower and more tiring than just reading it. That is the opposite of what you want when you are explaining something."
        ],
        "bullets": [
          "Tutorials and how-to content where steps and terms need to be read, not just felt",
          "Quotes, statistics, names, prices, and URLs that have to land exactly right",
          "Slower, calmer delivery (interviews, voiceover, storytelling) where rapid pops feel jittery against the pace",
          "Accessibility-first content, where a stable line is genuinely easier to follow for many viewers",
          "Anything reused on YouTube or LinkedIn, where a flashing single-word style reads as 'TikTok' in a context that does not want it"
        ]
      },
      {
        "heading": "The hybrid most pros actually use",
        "paras": [
          "The honest answer is that the best creators rarely pick one for the whole video. They use line captions as the base and reserve word-by-word emphasis for specific moments. A common pattern: a readable two or three word line sits on screen, and the key word inside it gets highlighted (color flip, scale bump, glow) right as it is spoken.",
          "That gives you the best of both. The viewer can read the phrase, and the active word still creates the per-word motion that holds attention. You are not choosing between retention and readability, you are getting both because the timing is accurate enough to drive emphasis without hiding the rest of the sentence.",
          "This is also why word-level timing matters more than the visual style you land on. A line caption with a highlighted active word is impossible to do well if your tool only knows where the line starts and ends. It needs to know exactly when each word is spoken."
        ]
      },
      {
        "heading": "Timing numbers that actually matter",
        "paras": [
          "Style aside, captions fail when the timing is off. A few rough targets worth keeping in your head:",
          "These are not laws, they are starting points. The real test is muting your phone, holding it at arm's length, and reading along. If you are racing the words or waiting on them, the timing is wrong, not the style."
        ],
        "bullets": [
          "Reading speed: aim for under roughly 20 characters per second of screen time. Faster than that and most people cannot finish the line",
          "Minimum on-screen time: keep any line up for at least about 0.8 to 1 second, even a short one, or it reads as a flicker",
          "Word-by-word sync: the word should appear within about 100ms of being spoken. Drift past that and the brain notices the lag even if it cannot name it",
          "Line length: 1 to 2 lines, max around 6 words per line for vertical video. Three lines forces the viewer to choose what to read and they choose to scroll"
        ]
      },
      {
        "heading": "A simple default to start from",
        "paras": [
          "If you do not want to think about it every time, use this. Line captions as your base, with the active word highlighted on emphasis. Switch to pure word-by-word only for fast hook-driven content where energy beats clarity. Switch to plain, unhighlighted line captions for tutorials, quotes, and anything cross-posted to a calmer platform. That covers about 90 percent of short-form video without overthinking it.",
          "Whatever you pick, the part that makes or breaks it is accurate word-level timing, and that is exactly what Capto is built around. It does one thing, captions, and does it on word-level timing so the highlighted-word style and the per-word pop both land on the right frame. You export at original quality with no watermark, bring your own Groq key, and the active-word emphasis works because the timing under it is actually correct.",
          "Pro is 6.99 euro a month, or 4.99 euro on the annual plan. Try a clip both ways, line base with highlights versus pure word-by-word, and watch your first-three-seconds retention. The right answer is usually obvious once you see it on the same footage."
        ]
      }
    ]
  },
  {
    "slug": "caption-mistakes-killing-reach",
    "title": "7 Caption Mistakes Quietly Killing Your Reach",
    "description": "Seven caption mistakes that drag down watch time and reach on TikTok, Reels, and Shorts, plus the specific fixes that actually move retention.",
    "date": "2026-04-28",
    "category": "Strategy",
    "readingMin": 5,
    "sections": [
      {
        "heading": "Captions are a retention lever, not decoration",
        "paras": [
          "Most people treat captions as an accessibility checkbox. Slap text on, export, post. But on a feed where 80 percent of viewers watch muted, your captions are the script. They are the thing keeping a thumb from flicking up in the first 1.5 seconds, and the thing pulling the eye back when attention drifts at second 6.",
          "That means a bad caption is not neutral. It actively costs you. Every frame where the text is unreadable, late, or distracting is a frame where retention leaks, and retention is the single number the algorithm watches hardest. Here are the seven mistakes I see most, and exactly what to do instead."
        ]
      },
      {
        "heading": "1. Dumping a full sentence on screen at once",
        "paras": [
          "If you flash a whole line of text and leave it parked while you talk, the viewer reads it in half a second and then has nothing to do for the next four. Their eyes go idle, and idle eyes scroll.",
          "The fix is word-level timing: each word or short phrase lands exactly when you say it, so reading and listening stay locked together. It turns the caption into a moving target the eye has to track, and tracking is attention. This is the difference between a caption that decorates a video and one that paces it."
        ],
        "bullets": [
          "Cap each on-screen group at 2 to 4 words for fast-talking content.",
          "Let the word appear on the syllable, not a beat late."
        ]
      },
      {
        "heading": "2. Burying text in the bottom 20 percent",
        "paras": [
          "Defaulting captions to the very bottom of the frame feels safe, but it is the worst spot on every major platform. TikTok stacks the username, caption, and music ticker over the lower-left. Reels and Shorts pile on like buttons, comment counts, and the progress bar. Your hard-won text ends up sharing pixels with UI clutter or sitting under a thumb.",
          "Put captions in the middle third of the frame, roughly 40 to 55 percent down. It is closer to where the face and action already are, so the eye does not have to travel, and it clears the platform chrome on all three apps. Check it against the real UI, not a clean export preview."
        ]
      },
      {
        "heading": "3. Style that fights the footage",
        "paras": [
          "Thin fonts, low-contrast colors, and no outline read fine on your monitor and vanish on a phone in daylight over a bright background. If a viewer has to squint, they are gone. Legibility is not a taste question, it is a reach question.",
          "Use a heavy weight, a real stroke or shadow, and a font size that holds up at phone scale. Then stop. The trendy karaoke styles with a different neon color on every third word, a bounce, a glow, and a shake do not raise retention. They split attention between reading and decoding the animation, which is the opposite of what you want."
        ],
        "bullets": [
          "Bold weight, 4 to 8px stroke or a tight drop shadow.",
          "One accent color for emphasis, not a rainbow per word.",
          "Test on an actual phone, outdoors, before you commit a style."
        ]
      },
      {
        "heading": "4. Trusting raw auto-captions on names and jargon",
        "paras": [
          "Auto-transcription is good now, easily 90 percent plus on clean audio. The problem is the other 10 percent, and it clusters exactly where it hurts: proper nouns, brand names, technical terms, numbers, and your own product name. The viewer who knows the topic spots the error instantly, and a visible mistake reads as low effort. That is a trust tax on every future second of the video.",
          "So read the transcript before you export. Not the whole thing word by word, but scan for the names and terms that matter to your niche. A 30 second pass on a 45 second clip is the highest-leverage edit you will make all day."
        ]
      },
      {
        "heading": "5. Re-encoding the whole video to add text",
        "paras": [
          "This one is invisible, which is why it is dangerous. Plenty of caption tools and all-in-one editors re-compress your entire video on export, even though you only changed the text layer. You shot clean footage, and the platform receives a softer, blockier version with crushed shadows and mushy motion.",
          "Soft video underperforms. The platform's own quality signals notice, and viewers feel it even if they cannot name it. Your caption tool should overlay text losslessly and preserve the original resolution, bitrate, and color, not bake everything down to a smaller file. If your exports keep coming out softer than your source, that is the leak."
        ]
      },
      {
        "heading": "6. The watermark you stopped noticing",
        "paras": [
          "A corner watermark from a free caption app is doing two things, both bad. It signals to viewers that you used a template tool, which quietly lowers perceived quality, and on some platforms a competitor's logo in the frame is exactly the kind of thing that gets a clip deprioritized or flagged as recycled content.",
          "You spent real time on the footage. Do not staple someone else's brand to it. Export clean, every time. If removing the watermark costs an upgrade, that math is trivial against even one suppressed video."
        ]
      },
      {
        "heading": "7. One caption style for every platform and every clip",
        "paras": [
          "Reusing the identical caption layout across a talking-head explainer, a fast meme cut, and a quiet B-roll piece treats very different videos as the same job. Fast content needs tight 2-word groups and quick swaps. A calm, slow piece can hold longer phrases without losing anyone. Forcing one rhythm onto all of them leaves retention on the table at both ends.",
          "Build two or three caption presets you trust and match the preset to the pace of the clip. It costs almost nothing once the styles exist, and it is the kind of small consistency that compounds across a hundred posts."
        ],
        "bullets": [
          "Fast/punchy: 2-word groups, snappy timing, one accent color.",
          "Conversational: 3 to 4 word phrases, steady pace.",
          "Quiet/B-roll: longer lines, lighter emphasis."
        ]
      },
      {
        "heading": "Fix the caption layer first",
        "paras": [
          "None of these mistakes need a new camera or a content strategy overhaul. They are all in the caption layer, which is the cheapest part of the whole pipeline to fix and the one most directly wired to watch time. Tight timing, a readable middle-frame style, a clean transcript, a lossless export, and no watermark. That is the whole list.",
          "That short list is exactly why Capto only does captions. Word-level timing, original-quality export with nothing re-encoded, no watermark on any plan, and your own Groq key for fast accurate transcription you control. Pro is 6.99 euro a month, 4.99 on annual. If your reach has been quietly leaking through the caption layer, that is the layer to fix, and it is the only thing Capto is built to do."
        ]
      }
    ]
  }
];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
export const allPostSlugs = () => POSTS.map((p) => p.slug);
