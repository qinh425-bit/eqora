import crypto from "node:crypto";

const TENCENT_ASR_HOST = "asr.tencentcloudapi.com";
const TENCENT_ASR_VERSION = "2019-06-14";
const TENCENT_ASR_SERVICE = "asr";

interface TencentAsrCreateResponse {
  Response?: {
    Data?: {
      TaskId?: number;
    };
    RequestId?: string;
    Error?: {
      Code?: string;
      Message?: string;
    };
  };
}

interface TencentAsrDescribeResponse {
  Response?: {
    Data?: TencentAsrTaskData;
    RequestId?: string;
    Error?: {
      Code?: string;
      Message?: string;
    };
  };
}

interface TencentAsrTaskData {
  TaskId?: number;
  Status?: number;
  StatusStr?: string;
  AudioDuration?: number;
  Result?: string;
  ResultDetail?: Array<{
    FinalSentence?: string;
    SliceSentence?: string;
  }>;
  ErrorMsg?: string;
}

function hmacSha256(key: string | Buffer, message: string) {
  return crypto.createHmac("sha256", key).update(message).digest();
}

function sha256Hex(message: string) {
  return crypto.createHash("sha256").update(message).digest("hex");
}

function getUtcDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function createAuthorization(action: string, payload: string, secretId: string, secretKey: string, timestamp: number) {
  const date = getUtcDate(timestamp);
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${TENCENT_ASR_HOST}\n`;
  const signedHeaders = "content-type;host";
  const hashedRequestPayload = sha256Hex(payload);
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedRequestPayload
  ].join("\n");

  const algorithm = "TC3-HMAC-SHA256";
  const credentialScope = `${date}/${TENCENT_ASR_SERVICE}/tc3_request`;
  const hashedCanonicalRequest = sha256Hex(canonicalRequest);
  const stringToSign = [algorithm, String(timestamp), credentialScope, hashedCanonicalRequest].join("\n");

  const secretDate = hmacSha256(`TC3${secretKey}`, date);
  const secretService = hmacSha256(secretDate, TENCENT_ASR_SERVICE);
  const secretSigning = hmacSha256(secretService, "tc3_request");
  const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");

  return `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function callTencentAsrApi<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const secretId = process.env.TENCENT_SECRET_ID;
  const secretKey = process.env.TENCENT_SECRET_KEY;
  const region = process.env.TENCENT_ASR_REGION || "ap-guangzhou";

  if (!secretId || !secretKey) {
    throw new Error("Missing TENCENT_SECRET_ID or TENCENT_SECRET_KEY for Tencent ASR");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(body);
  const authorization = createAuthorization(action, payload, secretId, secretKey, timestamp);

  const response = await fetch(`https://${TENCENT_ASR_HOST}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json; charset=utf-8",
      Host: TENCENT_ASR_HOST,
      "X-TC-Action": action,
      "X-TC-Version": TENCENT_ASR_VERSION,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Region": region
    },
    body: payload
  });

  const json = (await response.json()) as {
    Response?: {
      Error?: {
        Code?: string;
        Message?: string;
      };
    };
  };

  if (!response.ok) {
    throw new Error(`Tencent ASR request failed: ${response.status}`);
  }

  if (json.Response?.Error) {
    throw new Error(`${json.Response.Error.Code || "TencentAsrError"}: ${json.Response.Error.Message || "unknown error"}`);
  }

  return json as T;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractTranscript(data?: TencentAsrTaskData) {
  const detail = data?.ResultDetail
    ?.map((item) => item.FinalSentence?.trim())
    .filter((item): item is string => Boolean(item));

  if (detail?.length) {
    return detail.join("");
  }

  const raw = data?.Result?.trim() || "";
  return raw.replace(/\[[^\]]+\]\s*/g, "").trim();
}

export async function transcribeWithTencentAsr(input: {
  buffer: Buffer;
  mimetype?: string;
  originalname: string;
  size: number;
}) {
  if (input.size > 5 * 1024 * 1024) {
    throw new Error("Tencent ASR local file mode only supports audio files up to 5MB");
  }

  const engineModelType = process.env.TENCENT_ASR_ENGINE_MODEL_TYPE || "16k_zh";
  const maxPollCount = Number(process.env.TENCENT_ASR_MAX_POLLS || 30);
  const pollIntervalMs = Number(process.env.TENCENT_ASR_POLL_INTERVAL_MS || 1500);

  const createResponse = await callTencentAsrApi<TencentAsrCreateResponse>("CreateRecTask", {
    EngineModelType: engineModelType,
    ChannelNum: 1,
    ResTextFormat: 0,
    SourceType: 1,
    Data: input.buffer.toString("base64"),
    DataLen: input.buffer.length,
    ConvertNumMode: 1
  });

  const taskId = createResponse.Response?.Data?.TaskId;
  if (!taskId) {
    throw new Error("Tencent ASR did not return TaskId");
  }

  for (let attempt = 0; attempt < maxPollCount; attempt += 1) {
    await sleep(pollIntervalMs);

    const describeResponse = await callTencentAsrApi<TencentAsrDescribeResponse>("DescribeTaskStatus", {
      TaskId: taskId
    });

    const data = describeResponse.Response?.Data;
    const status = data?.Status;

    if (status === 2) {
      const transcript = extractTranscript(data);

      if (!transcript) {
        throw new Error("Tencent ASR returned success but no transcript text");
      }

      return {
        transcript,
        provider: "tencent" as const,
        durationMs: data?.AudioDuration ? Math.round(data.AudioDuration * 1000) : undefined
      };
    }

    if (status === 3) {
      throw new Error(data?.ErrorMsg || "Tencent ASR task failed");
    }
  }

  throw new Error("Tencent ASR timed out while waiting for transcription result");
}
