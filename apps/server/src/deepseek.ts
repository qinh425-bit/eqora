import type { EvaluationRequest, EvaluationResult } from "./types.js";
import { scenarios } from "./data.js";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

function extractJson(text: string) {
  const cleaned = text.trim().replace(/^```json/, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as EvaluationResult;
}

function cleanGeneratedText(text: string) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`+/g, "")
    .replace(/^\s*(json|javascript|typescript)\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeEvaluationResult(result: EvaluationResult): EvaluationResult {
  return {
    ...result,
    summary: cleanGeneratedText(result.summary || ""),
    strengths: (result.strengths || []).map((item) => cleanGeneratedText(item)).filter(Boolean),
    risks: (result.risks || []).map((item) => cleanGeneratedText(item)).filter(Boolean),
    missedConsiderations: (result.missedConsiderations || [])
      .map((item) => cleanGeneratedText(item))
      .filter(Boolean),
    improvedAnswer: cleanGeneratedText(result.improvedAnswer || ""),
    advancedAnswer: cleanGeneratedText(result.advancedAnswer || ""),
    scoreBreakdown: (result.scoreBreakdown || []).map((item) => ({
      ...item,
      label: cleanGeneratedText(item.label || ""),
      comment: cleanGeneratedText(item.comment || "")
    }))
  };
}

export async function evaluateWithDeepSeek(input: EvaluationRequest): Promise<EvaluationResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  const scenario = scenarios.find((item) => item.id === input.scenarioId) ?? scenarios[0];

  const systemPrompt = [
    "你是一个说话艺术陪练教练。",
    "你必须只输出合法 JSON，不要输出任何额外解释。",
    "所有字符串字段都必须是自然中文，不能包含 Markdown、代码块、反引号、JSON 片段或程序代码。",
    "请综合评价用户回答在真实社交场景里的成熟度、边界感、清晰度、情绪稳定度和得体度。",
    "你还要考虑思考时间是否显得过快冲动或过慢犹豫。",
    "评分范围是 0 到 100。",
    "用户回答默认是正常中文文本，除非回答确实为空，否则不要误判为乱码、不可读或非标准字符。"
  ].join("\n");

  const userPrompt = `
场景标题：${scenario.title}
场景说明：${scenario.prompt}
对方的话：${scenario.counterpartLine}
训练目标：${scenario.coachingGoal}
用户回答：${input.answer}
思考时长（毫秒）：${input.thinkingTimeMs}

请严格返回以下 JSON 结构：
{
  "overallScore": 0,
  "summary": "",
  "strengths": ["", ""],
  "risks": ["", ""],
  "missedConsiderations": ["", ""],
  "improvedAnswer": "",
  "advancedAnswer": "",
  "scoreBreakdown": [
    { "key": "tact", "label": "分寸感", "score": 0, "comment": "" },
    { "key": "emotion", "label": "情绪稳定", "score": 0, "comment": "" },
    { "key": "clarity", "label": "表达清晰", "score": 0, "comment": "" },
    { "key": "boundary", "label": "边界感", "score": 0, "comment": "" },
    { "key": "appropriateness", "label": "得体度", "score": 0, "comment": "" }
  ],
  "metrics": {
    "thinkingTimeMs": ${input.thinkingTimeMs},
    "answerLength": ${input.answer.length}
  }
}
`.trim();

  const response = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.3,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`DeepSeek request failed: ${response.status} ${message}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek response missing message content");
  }

  return sanitizeEvaluationResult(extractJson(content));
}
