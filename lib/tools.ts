export type Tool = {
  slug: string;
  name: string;
  title: string;
  description: string;
  tagline: string;
  intro: string[];
  steps: string[];
  features: { title: string; body: string }[];
  faqs: { q: string; text: string }[];
  related: string[];
};

export const TOOLS: Tool[] = [
  {
    slug: "ai-caption-generator",
    name: "AI Caption Generator",
    title: "Free AI Caption Generator, Add Captions to Video Online",
    description:
      "Generate word-perfect captions for any video in seconds. Drag, style, and time them on a real timeline, then export. Free to start, no watermark on paid.",
    tagline: "Word-perfect captions in 90 seconds.",
    intro: [
      "Upload a clip and Capto transcribes it at the word level using Whisper large-v3, then lays every word on a real timeline you can drag, trim, and restyle.",
      "It's the same engine the paid product runs on, start free with your own Groq key, upgrade to drop the watermark whenever you're ready.",
    ],
    steps: [
      "Upload your video (MP4, MOV, WebM, MKV, up to 4K).",
      "Pick a language or let Capto auto-detect it.",
      "Review the word-level captions and tweak any text or timing.",
      "Choose a caption style, then export your captioned MP4.",
    ],
    features: [
      { title: "Word-level timing", body: "Every word lands on the right millisecond, no manual nudging." },
      { title: "50+ languages", body: "English, Lithuanian and 50+ more, with diacritics intact in the export." },
      { title: "Real timeline", body: "Drag, trim and stack captions instead of fighting a flat list." },
      { title: "Clean export", body: "Audio untouched, captions burned in, no watermark on paid plans." },
    ],
    faqs: [
      { q: "Is the caption generator free?", text: "Yes, start free with your own Groq key. The free plan adds a watermark and caps exports; paid plans (from €6.99/mo) are unlimited and clean." },
      { q: "What video formats are supported?", text: "Anything ffmpeg can read, MP4, MOV, WebM, MKV, up to 4K resolution." },
      { q: "Can I edit the captions after generating?", text: "Yes. Every word sits on a real timeline you can retime, trim, restyle and re-export as many times as you want." },
    ],
    related: ["subtitle-translator", "srt-creator", "audio-to-text"],
  },
  {
    slug: "subtitle-translator",
    name: "Subtitle Translator",
    title: "Free Subtitle Translator, Translate Captions to 50+ Languages",
    description:
      "Translate your captions into 50+ languages while keeping the timing intact. Export burned-in or as SRT/VTT. Free to start.",
    tagline: "Caption once. Reach every language.",
    intro: [
      "Capto translates your caption track across 50+ languages while preserving the original word timing, so the rhythm stays right in every language.",
      "Every diacritic and accent renders correctly in the burned-in export, including notoriously tricky languages like Lithuanian.",
    ],
    steps: [
      "Caption your video (or upload an existing SRT/VTT).",
      "Pick the target language.",
      "Review the translation and adjust any line.",
      "Export burned-in, or download an SRT/VTT.",
    ],
    features: [
      { title: "Timing preserved", body: "Translations keep the original cue timing, no re-syncing." },
      { title: "Diacritics intact", body: "Every accent renders correctly in the final MP4." },
      { title: "Burned-in or file", body: "Export a captioned video or a subtitle file." },
      { title: "50+ languages", body: "From Spanish and German to Lithuanian and Japanese." },
    ],
    faqs: [
      { q: "Does it keep the original timing?", text: "Yes, the translated captions reuse the source cue timing, so they stay in sync." },
      { q: "Can I export an SRT file?", text: "Yes, you can export SRT or VTT, or burn the captions into the video." },
    ],
    related: ["ai-caption-generator", "srt-to-vtt-converter", "srt-creator"],
  },
  {
    slug: "srt-to-vtt-converter",
    name: "SRT to VTT Converter",
    title: "Free SRT to VTT Converter, Convert Subtitles Online",
    description:
      "Convert SRT subtitle files to WebVTT (and back) in your browser. Fast, free, and no upload of your video required.",
    tagline: "SRT in, VTT out. Instantly.",
    intro: [
      "SRT is the universal subtitle format; VTT (WebVTT) is what the web's <track> element wants. Capto converts between them cleanly, preserving timing and styling cues.",
      "Use it standalone, or generate captions in Capto and export directly to whichever format your platform needs.",
    ],
    steps: [
      "Upload or paste your SRT file.",
      "Choose VTT as the output format.",
      "Download the converted file, timing preserved.",
    ],
    features: [
      { title: "Lossless timing", body: "Cue timestamps convert exactly, down to the millisecond." },
      { title: "Both directions", body: "SRT → VTT and VTT → SRT." },
      { title: "Web-ready", body: "VTT output drops straight into an HTML <track> element." },
      { title: "No video needed", body: "Convert the subtitle file alone, fast and private." },
    ],
    faqs: [
      { q: "What's the difference between SRT and VTT?", text: "SRT is the most widely supported subtitle format; VTT (WebVTT) is the web standard used by HTML5 video and supports richer styling and positioning." },
      { q: "Which should I use?", text: "Use VTT for web players and HTML5 video; use SRT for most social platforms and video editors." },
    ],
    related: ["srt-creator", "ai-caption-generator", "subtitle-translator"],
  },
  {
    slug: "srt-creator",
    name: "SRT Creator",
    title: "Free SRT Creator, Make SRT Subtitle Files From Video",
    description:
      "Turn any video into a clean, correctly-timed SRT subtitle file in seconds, then download it or burn it in.",
    tagline: "From video to .srt in one step.",
    intro: [
      "Need an SRT file for YouTube, an editor, or a client? Capto transcribes your video at the word level and exports a properly formatted, correctly-timed SRT.",
      "Edit any line before you export, and grab VTT too if you need it.",
    ],
    steps: [
      "Upload your video.",
      "Let Capto transcribe it with word-level timing.",
      "Edit any lines, then export as SRT.",
    ],
    features: [
      { title: "Correct formatting", body: "Standards-compliant SRT every platform accepts." },
      { title: "Word-level accuracy", body: "Whisper large-v3 timing, smoothed across pauses." },
      { title: "Editable", body: "Fix any line before exporting." },
      { title: "VTT too", body: "Export VTT alongside SRT in one click." },
    ],
    faqs: [
      { q: "Will the SRT work on YouTube?", text: "Yes, Capto exports standards-compliant SRT that uploads cleanly to YouTube and other platforms." },
      { q: "Can I edit before exporting?", text: "Absolutely, every line is editable on the timeline before you download." },
    ],
    related: ["srt-to-vtt-converter", "ai-caption-generator", "audio-to-text"],
  },
  {
    slug: "audio-to-text",
    name: "Audio to Text",
    title: "Free Audio to Text, Transcribe Audio & Video Online",
    description:
      "Transcribe audio or video to accurate text in seconds with Whisper large-v3. Copy the transcript or export captions.",
    tagline: "Accurate transcripts, in seconds.",
    intro: [
      "Drop an audio or video file and Capto returns an accurate, punctuated transcript powered by Whisper large-v3, fast enough that a 60-second clip finishes before you blink.",
      "Copy the text, or keep going and turn it into captions and clips.",
    ],
    steps: [
      "Upload audio or video.",
      "Pick a language or auto-detect.",
      "Copy the transcript, or export captions.",
    ],
    features: [
      { title: "High accuracy", body: "Whisper large-v3 with decoding tuned to cut hallucinations." },
      { title: "Punctuated", body: "Readable output with sentence punctuation, not a wall of words." },
      { title: "Fast", body: "Sub-second transcription on Groq's inference." },
      { title: "Then caption it", body: "Flow straight from transcript to styled captions." },
    ],
    faqs: [
      { q: "How accurate is it?", text: "It uses Whisper large-v3, the top open transcription model, with decoding tuned to reduce repetition and hallucination." },
      { q: "What languages work?", text: "50+, with auto-detect, including strong results on under-served languages like Lithuanian." },
    ],
    related: ["ai-caption-generator", "srt-creator", "subtitle-translator"],
  },
];

export const getTool = (slug: string) => TOOLS.find((t) => t.slug === slug);
export const allToolSlugs = () => TOOLS.map((t) => t.slug);
