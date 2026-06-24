// Capto's own transcription engine — Whisper running fully in the browser via
// Transformers.js (ONNX + WebGPU). No API keys, zero server cost, fully private:
// the audio never leaves the device. This is an ES-module Web Worker; it loads
// Transformers.js from a CDN and the model weights from the Hugging Face CDN
// (cached by the browser after the first download).
// jsdelivr's /+esm endpoint flattens the package + its deps (onnxruntime-web,
// etc.) into one browser-ready ESM bundle, so the bare imports resolve.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/+esm";

// We only ever fetch hosted models — never look for local files.
env.allowLocalModels = false;

let transcriber = null;
let loadedModel = null;
let loadedDevice = null;

async function ensure(model) {
  const device = navigator.gpu ? "webgpu" : "wasm";
  if (transcriber && loadedModel === model && loadedDevice === device) return;
  transcriber = null;
  self.postMessage({ type: "status", status: "loading", model, device });
  transcriber = await pipeline("automatic-speech-recognition", model, {
    device,
    // fp16 on GPU is fast + accurate; quantized on CPU keeps it usable.
    dtype: device === "webgpu" ? "fp16" : "q8",
    progress_callback: (p) => {
      // p: { status, name, file, progress, loaded, total }
      if (p && (p.status === "progress" || p.status === "download" || p.status === "done")) {
        self.postMessage({ type: "download", data: { file: p.file, progress: p.progress || 0, status: p.status } });
      }
    },
  });
  loadedModel = model;
  loadedDevice = device;
}

self.onmessage = async (e) => {
  const { type, model, audio, language } = e.data || {};
  try {
    if (type === "warm") {
      await ensure(model);
      self.postMessage({ type: "ready", model, device: loadedDevice });
      return;
    }
    if (type === "run") {
      await ensure(model);
      self.postMessage({ type: "status", status: "transcribing" });
      const out = await transcriber(audio, {
        return_timestamps: "word",
        chunk_length_s: 30,
        stride_length_s: 5,
        language: language && language !== "auto" ? language : undefined,
        task: "transcribe",
      });
      // Normalise to our { words:[{word,start,end}], text } shape.
      const words = [];
      const chunks = (out && out.chunks) || [];
      for (const c of chunks) {
        const w = String(c.text || "").trim();
        if (!w) continue;
        const ts = c.timestamp || [];
        const start = typeof ts[0] === "number" ? ts[0] : null;
        let end = typeof ts[1] === "number" ? ts[1] : null;
        if (start == null) continue;
        if (end == null || end <= start) end = start + 0.2;
        words.push({ word: w, start, end });
      }
      self.postMessage({ type: "result", words, text: (out && out.text) || "", device: loadedDevice });
      return;
    }
  } catch (err) {
    self.postMessage({ type: "error", error: String((err && err.message) || err) });
  }
};
