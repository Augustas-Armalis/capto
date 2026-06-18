# Legacy reference code

The desktop-app stuff (Mac/Windows launchers, native wrappers, installers, local
Whisper Python runner, duplicate fonts/editor assets) has been removed — the
project is web-only now.

What's left here is the **porting reference** for the editor backend:

- `server.js` — the original Express server: upload, transcription dispatch,
  export jobs, file download.
- `lib/ffmpeg.js` — probe / extract audio / burn captions in (ffmpeg-static).
- `lib/transcribe.js` — engine dispatch (Groq / OpenAI Whisper).
- `lib/ass.js` — cue chunking + ASS subtitle generation with positioning,
  case modes, shadow and word highlight.

These will be ported into Next.js route handlers (`app/api/projects/*`,
`app/api/transcribe`, `app/api/export`, `app/api/jobs`) once the storage +
job-queue layer is in place. Until then, the editor UI is live on the web but
upload/transcribe/export run only against the user's local stack.
