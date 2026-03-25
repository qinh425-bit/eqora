import Taro from "@tarojs/taro";
import { mockQuotes, mockScenarios } from "@/data/mock";
import type {
  AuthSession,
  EvaluationResult,
  Quote,
  Scenario,
  TrainingRecord,
  TranscriptionResult,
  UserProfile
} from "@/types";
import { clearAuthToken, getApiBase, getAuthToken, setAuthToken } from "@/utils/session";

export interface ServerHealth {
  ok: boolean;
  service: string;
  mode: string;
  transcriptionMode: string;
  wechatLoginMode?: string;
}

function resolveErrorMessage(data: unknown, fallback: string) {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

async function request<T>(url: string, options?: {
  method?: "GET" | "POST";
  data?: unknown;
  header?: Record<string, string>;
  auth?: boolean;
}): Promise<T> {
  try {
    const header: Record<string, string> = {
      ...(options?.header || {})
    };

    if (options?.auth) {
      const token = getAuthToken();
      if (token) {
        header.Authorization = `Bearer ${token}`;
      }
    }

    const response = await Taro.request<T>({
      url: `${getApiBase()}${url}`,
      method: options?.method || "GET",
      data: options?.data,
      header
    });

    if (response.statusCode >= 400) {
      throw new Error(resolveErrorMessage(response.data, `${options?.method || "GET"} ${url} failed`));
    }

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("request failed");
  }
}

export async function fetchServerHealth(): Promise<ServerHealth> {
  return request<ServerHealth>("/health");
}

export async function fetchScenarios(): Promise<Scenario[]> {
  try {
    const data = await request<{ items: Scenario[] }>("/api/scenarios");
    return data.items;
  } catch (_error) {
    return mockScenarios;
  }
}

export async function fetchQuotes(): Promise<Quote[]> {
  try {
    const data = await request<{ items: Quote[] }>("/api/quotes");
    return data.items;
  } catch (_error) {
    return mockQuotes;
  }
}

export async function evaluateAnswer(payload: {
  scenarioId: string;
  answer: string;
  thinkingTimeMs: number;
}): Promise<EvaluationResult> {
  return request<EvaluationResult>("/api/evaluate", {
    method: "POST",
    header: {
      "Content-Type": "application/json"
    },
    data: payload
  });
}

export async function transcribeAudio(tempFilePath: string): Promise<TranscriptionResult> {
  const token = getAuthToken();
  const response = await Taro.uploadFile({
    url: `${getApiBase()}/api/transcribe`,
    filePath: tempFilePath,
    name: "file",
    header: token ? { Authorization: `Bearer ${token}` } : undefined
  });

  const data = JSON.parse(response.data) as TranscriptionResult & {
    message?: string;
    provider?: string;
  };

  if (response.statusCode >= 400) {
    throw new Error(data.message || "transcription failed");
  }

  return data;
}

export async function loginWithMiniProgram(): Promise<AuthSession> {
  const loginResult = await Taro.login();

  if (!loginResult.code) {
    throw new Error("微信登录未返回有效 code，请在开发者工具里重新触发一次登录");
  }

  let nickname = "\u5fae\u4fe1\u7ec3\u4e60\u7528\u6237";
  let avatarUrl = "";

  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    try {
      const profile = await Taro.getUserProfile({
        desc: "\u7528\u4e8e\u5c55\u793a\u4f60\u7684\u8bad\u7ec3\u6210\u957f\u4fe1\u606f"
      });
      nickname = profile.userInfo?.nickName || nickname;
      avatarUrl = profile.userInfo?.avatarUrl || "";
    } catch (_error) {
      // User may decline profile permission; continue with fallback profile.
    }
  }

  const session = await request<AuthSession>("/api/auth/login", {
    method: "POST",
    header: {
      "Content-Type": "application/json"
    },
    data: {
      code: loginResult.code,
      platform: "weapp",
      nickname,
      avatarUrl
    }
  });

  setAuthToken(session.token);
  return session;
}

export async function createGuestSession(): Promise<AuthSession> {
  const session = await request<AuthSession>("/api/auth/login", {
    method: "POST",
    header: {
      "Content-Type": "application/json"
    },
    data: {
      platform: Taro.getEnv() === Taro.ENV_TYPE.H5 ? "h5" : "guest",
      nickname: "\u4f53\u9a8c\u7528\u6237"
    }
  });

  setAuthToken(session.token);
  return session;
}

export async function fetchMe(): Promise<UserProfile> {
  const data = await request<{ user: UserProfile }>("/api/me", {
    auth: true
  });

  return data.user;
}

export async function fetchTrainingRecords(): Promise<TrainingRecord[]> {
  const data = await request<{ items: TrainingRecord[] }>("/api/records", {
    auth: true
  });

  return data.items;
}

export async function saveTrainingRecord(payload: {
  scenarioId: string;
  scenarioTitle: string;
  category: string;
  overallScore: number;
  summary: string;
  answer: string;
  thinkingTimeMs: number;
}) {
  return request<TrainingRecord>("/api/records", {
    method: "POST",
    auth: true,
    header: {
      "Content-Type": "application/json"
    },
    data: payload
  });
}

export function resetSessionForApiSwitch() {
  clearAuthToken();
}
