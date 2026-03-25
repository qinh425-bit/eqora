import type { TranscriptionResult } from "./types.js";

interface AudioUpload {
  buffer: Buffer;
  mimetype?: string;
  originalname: string;
  size: number;
}

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio(input: AudioUpload): Promise<TranscriptionResult> {
  const mode = process.env.TRANSCRIBE_MODE || "disabled";

  if (mode === "mock") {
    return {
      transcript: "",
      provider: "mock",
      warning: "当前环境未配置真实语音转写服务，请配置 TRANSCRIBE_MODE=openai 和 OPENAI_API_KEY。"
    };
  }

  if (mode !== "openai") {
    throw new Error("Transcription provider is not configured. Set TRANSCRIBE_MODE=openai.");
  }

  return transcribeWithOpenAI(input);
}

async function transcribeWithOpenAI(input: AudioUpload): Promise<TranscriptionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TRANSCRIBE_MODEL || "whisper-1";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for transcription");
  }

  const bytes = new Uint8Array(input.buffer.buffer, input.buffer.byteOffset, input.buffer.byteLength);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const form = new FormData();
  const file = new File([arrayBuffer], input.originalname || "voice-input.mp3", {
    type: input.mimetype || "audio/mpeg"
  });

  form.append("file", file);
  form.append("model", model);
  form.append("language", "zh");

  const response = await fetch(OPENAI_TRANSCRIBE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI transcription failed: ${response.status} ${message}`);
  }

  const json = (await response.json()) as { text?: string };
  if (!json.text) {
    throw new Error("OpenAI transcription response missing text");
  }

  return {
    transcript: json.text.trim(),
    provider: "openai"
  };
}