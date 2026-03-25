import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { quotes, scenarios } from "./data.js";
import { evaluateWithDeepSeek } from "./deepseek.js";
import { evaluateWithOpenAI } from "./openai.js";
import { evaluateHeuristically } from "./scoring.js";
import { createSession, createTrainingRecord, findUserByToken, listTrainingRecords, upsertUser } from "./store.js";
import { transcribeAudio } from "./transcription.js";
import { exchangeWechatCode } from "./wechat.js";
import type { EvaluationRequest, TrainingRecord, UserProfile } from "./types.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

app.use(cors());
app.use(express.json());

async function resolveUser(req: express.Request): Promise<UserProfile | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    return null;
  }

  return findUserByToken(token);
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "speakwise-server",
    mode: process.env.AI_MODE || "heuristic",
    transcriptionMode: process.env.TRANSCRIBE_MODE || "disabled",
    wechatLoginMode: process.env.WECHAT_LOGIN_MODE || "mock"
  });
});

app.get("/api/scenarios", (req, res) => {
  const category = req.query.category as string | undefined;
  const data = category ? scenarios.filter((item) => item.category === category) : scenarios;
  res.json({ items: data });
});

app.get("/api/quotes", (_req, res) => {
  res.json({ items: quotes });
});

app.post("/api/auth/login", async (req, res) => {
  const body = req.body as {
    code?: string;
    nickname?: string;
    avatarUrl?: string;
    platform?: UserProfile["platform"];
  };

  try {
    const platform = body.platform || "guest";
    let externalId = `${platform}:${body.code || body.nickname || "guest"}`;
    let loginMode: "mock" | "live" = "mock";
    const codePreview = body.code ? `${body.code.slice(0, 6)}***` : "none";

    console.info("[auth/login] attempt", {
      platform,
      hasCode: Boolean(body.code),
      codePreview,
      wechatLoginMode: process.env.WECHAT_LOGIN_MODE || "mock"
    });

    if (platform === "weapp" && body.code) {
      const session = await exchangeWechatCode(body.code);
      if (session?.openId) {
        externalId = `weapp:${session.openId}`;
        loginMode = "live";
      } else {
        externalId = `weapp:mock:${body.code}`;
      }
    }

    const user = await upsertUser({
      externalId,
      nickname: body.nickname || (platform === "weapp" ? "微信练习用户" : "体验用户"),
      avatarUrl: body.avatarUrl,
      platform
    });

    const session = await createSession(user.id);
    console.info("[auth/login] success", {
      platform,
      loginMode,
      userId: user.id
    });
    res.json({
      token: session.token,
      user,
      loginMode
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "login failed";
    console.error("[auth/login] failed", {
      platform: body.platform || "guest",
      hasCode: Boolean(body.code),
      message
    });
    res.status(500).json({ message });
  }
});

app.get("/api/me", async (req, res) => {
  const user = await resolveUser(req);

  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  res.json({ user });
});

app.get("/api/records", async (req, res) => {
  const user = await resolveUser(req);

  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const items = await listTrainingRecords(user.id);
  res.json({ items });
});

app.post("/api/records", async (req, res) => {
  const user = await resolveUser(req);

  if (!user) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  const body = req.body as Partial<TrainingRecord>;
  if (!body.scenarioId || !body.scenarioTitle || !body.category || typeof body.overallScore !== "number") {
    res.status(400).json({ message: "missing record fields" });
    return;
  }

  const record = await createTrainingRecord({
    userId: user.id,
    scenarioId: body.scenarioId,
    scenarioTitle: body.scenarioTitle,
    category: body.category,
    overallScore: body.overallScore,
    summary: body.summary || "",
    answer: body.answer || "",
    thinkingTimeMs: typeof body.thinkingTimeMs === "number" ? body.thinkingTimeMs : 0
  });

  res.json(record);
});

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "audio file is required" });
    return;
  }

  try {
    const result = await transcribeAudio({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      size: req.file.size
    });

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(503).json({
      message,
      provider: process.env.TRANSCRIBE_MODE || "disabled"
    });
  }
});

app.post("/api/evaluate", async (req, res) => {
  const body = req.body as Partial<EvaluationRequest>;

  if (!body.scenarioId || !body.answer || typeof body.thinkingTimeMs !== "number") {
    res.status(400).json({ message: "scenarioId, answer and thinkingTimeMs are required" });
    return;
  }

  const payload: EvaluationRequest = {
    scenarioId: body.scenarioId,
    answer: body.answer,
    thinkingTimeMs: body.thinkingTimeMs
  };

  console.info("[evaluate] attempt", {
    scenarioId: payload.scenarioId,
    answerLength: payload.answer.length,
    thinkingTimeMs: payload.thinkingTimeMs,
    mode: process.env.AI_MODE || "heuristic"
  });

  try {
    let result;

    if (process.env.AI_MODE === "openai") {
      result = await evaluateWithOpenAI(payload);
    } else if (process.env.AI_MODE === "deepseek") {
      result = await evaluateWithDeepSeek(payload);
    } else {
      result = evaluateHeuristically(payload);
    }

    console.info("[evaluate] success", {
      scenarioId: payload.scenarioId,
      overallScore: result.overallScore
    });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    const fallback = evaluateHeuristically(payload);

    console.error("[evaluate] fallback", {
      scenarioId: payload.scenarioId,
      message
    });
    res.json({
      ...fallback,
      summary: `${fallback.summary} 当前已自动切回本地评分模式。`,
      debug: {
        mode: process.env.AI_MODE || "heuristic",
        message
      }
    });
  }
});

app.listen(port, () => {
  console.log(`SpeakWise server listening on http://localhost:${port}`);
});
