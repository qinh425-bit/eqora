export type ScenarioCategory =
  | "workplace"
  | "family"
  | "social"
  | "relationship";

export interface Scenario {
  id: string;
  title: string;
  category: ScenarioCategory;
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  counterpartLine: string;
  coachingGoal: string;
  pitfalls: string[];
  hint: string;
}

export interface Quote {
  id: string;
  text: string;
  source: string;
  takeaway: string;
}

export interface EvaluationRequest {
  scenarioId: string;
  answer: string;
  thinkingTimeMs: number;
}

export interface ScoreDetail {
  key: string;
  label: string;
  score: number;
  comment: string;
}

export interface EvaluationResult {
  overallScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  missedConsiderations: string[];
  improvedAnswer: string;
  advancedAnswer: string;
  scoreBreakdown: ScoreDetail[];
  metrics: {
    thinkingTimeMs: number;
    answerLength: number;
  };
}

export interface TranscriptionResult {
  transcript: string;
  provider: "openai" | "mock";
  durationMs?: number;
  warning?: string;
}

export interface UserProfile {
  id: string;
  externalId: string;
  nickname: string;
  avatarUrl?: string;
  platform: "guest" | "weapp" | "tt" | "h5";
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  loginMode: "mock" | "live";
}

export interface TrainingRecord {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioTitle: string;
  category: string;
  overallScore: number;
  summary: string;
  answer: string;
  thinkingTimeMs: number;
  createdAt: string;
}