import type { EvaluationRequest, EvaluationResult } from "./types.js";
import { scenarios } from "./data.js";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";

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

export async function evaluateWithOpenAI(input: EvaluationRequest): Promise<EvaluationResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "o4-mini";

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const scenario = scenarios.find((item) => item.id === input.scenarioId) ?? scenarios[0];

  const prompt = `
你是一个“说话艺术陪练教练”。请你严格根据以下 JSON 结构输出，不要输出多余文字。
所有字符串字段都必须是自然中文，不能包含 Markdown、代码块、反引号、JSON 片段或程序代码。

评分范围 0-100，维度为：
- tact: 分寸感
- emotion: 情绪稳定
- clarity: 表达清晰
- boundary: 边界感
- appropriateness: 得体度

你要同时考虑：
- 回答内容是否成熟
- 是否给了对方继续追问的空间
- 是否有礼貌
- 是否符合场景身份关系
- thinkingTimeMs 是否显得过快冲动或过慢犹豫

场景标题：${scenario.title}
场景说明：${scenario.prompt}
对方的话：${scenario.counterpartLine}
训练目标：${scenario.coachingGoal}
用户回答：${input.answer}
思考时长（毫秒）：${input.thinkingTimeMs}

请返回以下 JSON：
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

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: prompt
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${message}`);
  }

  const json = (await response.json()) as { output_text?: string };
  if (!json.output_text) {
    throw new Error("OpenAI response missing output_text");
  }

  return sanitizeEvaluationResult(extractJson(json.output_text));
}
