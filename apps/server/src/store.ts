import { mkdirSync, existsSync, readFileSync, renameSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { TrainingRecord, UserProfile } from "./types.js";

interface LegacySessionRecord {
  token: string;
  userId: string;
  createdAt: string;
}

interface LegacyStoreFile {
  users: UserProfile[];
  sessions: LegacySessionRecord[];
  records: TrainingRecord[];
}

const dataDir = path.resolve(process.cwd(), ".data");
const dbPath = path.join(dataDir, "speakwise.sqlite");
const legacyJsonPath = path.join(dataDir, "store.json");

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    external_id TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL,
    avatar_url TEXT,
    platform TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    scenario_title TEXT NOT NULL,
    category TEXT NOT NULL,
    overall_score INTEGER NOT NULL,
    summary TEXT NOT NULL,
    answer TEXT NOT NULL,
    thinking_time_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_records_user_id_created_at ON records(user_id, created_at DESC);
`);

migrateLegacyJsonIfNeeded();

function migrateLegacyJsonIfNeeded() {
  if (!existsSync(legacyJsonPath)) {
    return;
  }

  const existingUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (existingUsers.count > 0) {
    return;
  }

  const raw = readFileSync(legacyJsonPath, "utf8");
  const legacy = JSON.parse(raw) as LegacyStoreFile;
  const insertUser = db.prepare(`
    INSERT INTO users (id, external_id, nickname, avatar_url, platform, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSession = db.prepare(`
    INSERT INTO sessions (token, user_id, created_at)
    VALUES (?, ?, ?)
  `);
  const insertRecord = db.prepare(`
    INSERT INTO records (id, user_id, scenario_id, scenario_title, category, overall_score, summary, answer, thinking_time_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");

  try {
    for (const user of legacy.users || []) {
      insertUser.run(
        user.id,
        user.externalId,
        user.nickname,
        user.avatarUrl || null,
        user.platform,
        user.createdAt,
        user.updatedAt
      );
    }

    for (const session of legacy.sessions || []) {
      insertSession.run(session.token, session.userId, session.createdAt);
    }

    for (const record of legacy.records || []) {
      insertRecord.run(
        record.id,
        record.userId,
        record.scenarioId,
        record.scenarioTitle,
        record.category,
        record.overallScore,
        record.summary,
        record.answer,
        record.thinkingTimeMs,
        record.createdAt
      );
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  renameSync(legacyJsonPath, path.join(dataDir, `store.json.migrated-${Date.now()}.bak`));
}

export async function upsertUser(input: {
  externalId: string;
  nickname: string;
  avatarUrl?: string;
  platform: UserProfile["platform"];
}) {
  const now = new Date().toISOString();
  const existing = db
    .prepare(`
      SELECT id, external_id, nickname, avatar_url, platform, created_at, updated_at
      FROM users
      WHERE external_id = ?
    `)
    .get(input.externalId) as
    | {
        id: string;
        external_id: string;
        nickname: string;
        avatar_url?: string | null;
        platform: UserProfile["platform"];
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (existing) {
    db.prepare(`
      UPDATE users
      SET nickname = ?, avatar_url = ?, platform = ?, updated_at = ?
      WHERE id = ?
    `).run(input.nickname, input.avatarUrl || null, input.platform, now, existing.id);

    return {
      id: existing.id,
      externalId: existing.external_id,
      nickname: input.nickname,
      avatarUrl: input.avatarUrl,
      platform: input.platform,
      createdAt: existing.created_at,
      updatedAt: now
    } satisfies UserProfile;
  }

  const user: UserProfile = {
    id: crypto.randomUUID(),
    externalId: input.externalId,
    nickname: input.nickname,
    avatarUrl: input.avatarUrl,
    platform: input.platform,
    createdAt: now,
    updatedAt: now
  };

  db.prepare(`
    INSERT INTO users (id, external_id, nickname, avatar_url, platform, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(user.id, user.externalId, user.nickname, user.avatarUrl || null, user.platform, user.createdAt, user.updatedAt);

  return user;
}

export async function createSession(userId: string) {
  const session = {
    token: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString()
  };

  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  db.prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)").run(session.token, session.userId, session.createdAt);
  return session;
}

export async function findUserByToken(token: string) {
  const row = db
    .prepare(`
      SELECT u.id, u.external_id, u.nickname, u.avatar_url, u.platform, u.created_at, u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `)
    .get(token) as
    | {
        id: string;
        external_id: string;
        nickname: string;
        avatar_url?: string | null;
        platform: UserProfile["platform"];
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    externalId: row.external_id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url || undefined,
    platform: row.platform,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies UserProfile;
}

export async function createTrainingRecord(input: Omit<TrainingRecord, "id" | "createdAt">) {
  const record: TrainingRecord = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO records (id, user_id, scenario_id, scenario_title, category, overall_score, summary, answer, thinking_time_ms, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    record.id,
    record.userId,
    record.scenarioId,
    record.scenarioTitle,
    record.category,
    record.overallScore,
    record.summary,
    record.answer,
    record.thinkingTimeMs,
    record.createdAt
  );

  return record;
}

export async function listTrainingRecords(userId: string) {
  const rows = db
    .prepare(`
      SELECT id, user_id, scenario_id, scenario_title, category, overall_score, summary, answer, thinking_time_ms, created_at
      FROM records
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
    .all(userId) as Array<{
      id: string;
      user_id: string;
      scenario_id: string;
      scenario_title: string;
      category: string;
      overall_score: number;
      summary: string;
      answer: string;
      thinking_time_ms: number;
      created_at: string;
    }>;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    scenarioId: row.scenario_id,
    scenarioTitle: row.scenario_title,
    category: row.category,
    overallScore: row.overall_score,
    summary: row.summary,
    answer: row.answer,
    thinkingTimeMs: row.thinking_time_ms,
    createdAt: row.created_at
  })) satisfies TrainingRecord[];
}