import { scenarios } from "./data.js";
import type { EvaluationRequest, EvaluationResult, Scenario, ScoreDetail } from "./types.js";

const politeWords = ["谢谢", "理解", "辛苦", "麻烦", "请", "抱歉", "不好意思"];
const boundaryWords = ["暂时", "目前", "不方便", "不太方便", "先这样", "希望你理解", "我会处理", "我需要"];
const aggressiveWords = ["关你", "烦", "滚", "有病", "别管", "你懂什么"];
const vagueWords = ["随便", "都行", "看着办", "再说吧", "无所谓"];

function clampScore(score: number) {
  return Math.max(20, Math.min(98, Math.round(score)));
}

function findScenario(id: string): Scenario {
  return scenarios.find((item) => item.id === id) ?? scenarios[0];
}

function countMatches(answer: string, words: string[]) {
  return words.reduce((count, word) => count + (answer.includes(word) ? 1 : 0), 0);
}

function commentForScore(score: number, positive: string, neutral: string, negative: string) {
  if (score >= 85) {
    return positive;
  }

  if (score >= 70) {
    return neutral;
  }

  return negative;
}

function buildImprovedAnswer(scenario: Scenario, answer: string) {
  if (scenario.category === "family") {
    return "谢谢你关心，这件事我会认真考虑，也会按自己的节奏来安排，今天我们先轻松吃饭吧。";
  }

  if (scenario.category === "workplace") {
    return "收到，我先确认一下优先级。我手上还有两个今晚必须交付的任务，如果这个要明早看，我可以先把核心部分今晚给你，完整版本明天上午补齐。";
  }

  if (scenario.category === "social") {
    return "这次我就不借了，也谢谢你先想到我。你可以看看有没有更合适、更稳妥的方式周转。";
  }

  if (answer.includes("你")) {
    return "我理解你最近很忙，但临时取消会让我有些失落。我更希望如果有变动，你能提前告诉我，我们一起把时间安排好。";
  }

  return "我理解你的处境，也想把这件事说清楚。我希望我们能在互相尊重的前提下，把问题处理得更顺畅。";
}

function buildAdvancedAnswer(scenario: Scenario) {
  if (scenario.category === "family") {
    return "谢谢关心，我知道你是好意。感情和婚姻我会认真对待，但更想按照适合自己的节奏推进，这样对自己和未来都更负责。";
  }

  if (scenario.category === "workplace") {
    return "可以，我愿意配合，但我想先和你对齐一下优先级。现在我有 A 和 B 两项在排期里，如果这个任务要插队，我会先调整手头安排，今晚先给你一个可看的版本。";
  }

  if (scenario.category === "social") {
    return "这次我不能借钱，不是针对你，而是我一直都不做私人借贷。还是建议你走更稳妥的方式，免得彼此都为难。";
  }

  return "我想把感受说清楚，而不是争对错。事情本身我愿意沟通，但我也希望彼此在安排和表达上都更尊重对方。";
}

export function evaluateHeuristically(input: EvaluationRequest): EvaluationResult {
  const scenario = findScenario(input.scenarioId);
  const answer = input.answer.trim();
  const answerLength = answer.length;
  const politeCount = countMatches(answer, politeWords);
  const boundaryCount = countMatches(answer, boundaryWords);
  const aggressiveCount = countMatches(answer, aggressiveWords);
  const vagueCount = countMatches(answer, vagueWords);
  const thinkingSeconds = input.thinkingTimeMs / 1000;

  let tact = 72 + politeCount * 6 - aggressiveCount * 18;
  let emotion = 70 + politeCount * 4 - aggressiveCount * 20;
  let clarity = 74 + (answerLength >= 18 ? 5 : -8) - vagueCount * 10;
  let boundary = 68 + boundaryCount * 8 - (answer.includes("算了") ? 8 : 0);
  let appropriateness = 72 + politeCount * 4 + boundaryCount * 3 - aggressiveCount * 15;

  if (thinkingSeconds < 1.5) {
    tact -= 4;
    emotion -= 4;
  } else if (thinkingSeconds > 45) {
    clarity -= 5;
  } else if (thinkingSeconds >= 3 && thinkingSeconds <= 18) {
    tact += 3;
    clarity += 2;
  }

  if (answerLength < 8) {
    clarity -= 15;
    boundary -= 6;
  }

  if (answerLength > 90) {
    clarity -= 4;
  }

  const scoreBreakdown: ScoreDetail[] = [
    {
      key: "tact",
      label: "分寸感",
      score: clampScore(tact),
      comment: commentForScore(
        tact,
        "既照顾情绪，也保留了立场。",
        "整体不失礼，但还能更圆润一点。",
        "容易让对方感到被顶撞或被敷衍。"
      )
    },
    {
      key: "emotion",
      label: "情绪稳定",
      score: clampScore(emotion),
      comment: commentForScore(
        emotion,
        "语气稳定，没有被对方带节奏。",
        "基本稳住了，但还不够从容。",
        "情绪痕迹偏重，会削弱说服力。"
      )
    },
    {
      key: "clarity",
      label: "表达清晰",
      score: clampScore(clarity),
      comment: commentForScore(
        clarity,
        "重点明确，对方容易听懂你的意思。",
        "意思能听懂，但层次还不够清楚。",
        "表达偏散或过短，对方会继续追问。"
      )
    },
    {
      key: "boundary",
      label: "边界感",
      score: clampScore(boundary),
      comment: commentForScore(
        boundary,
        "态度温和，但边界也立住了。",
        "有边界意识，但还不够坚定。",
        "缺少明确立场，容易留下操作空间。"
      )
    },
    {
      key: "appropriateness",
      label: "得体度",
      score: clampScore(appropriateness),
      comment: commentForScore(
        appropriateness,
        "符合场景身份关系，整体得体。",
        "大方向没问题，但还可以更成熟。",
        "不太符合场景语境，容易适得其反。"
      )
    }
  ];

  const overallScore = clampScore(
    scoreBreakdown.reduce((sum, item) => sum + item.score, 0) / scoreBreakdown.length
  );

  const strengths: string[] = [];
  const risks: string[] = [];
  const missedConsiderations: string[] = [];

  if (politeCount > 0) {
    strengths.push("你有先接住对方情绪或好意，这是高质量回应的基础。");
  }

  if (boundaryCount > 0) {
    strengths.push("你已经开始表达自己的节奏或立场，边界感有出来。");
  }

  if (answerLength >= 18 && answerLength <= 80) {
    strengths.push("回答长度适中，既不显得敷衍，也不算过度解释。");
  }

  if (strengths.length === 0) {
    strengths.push("你已经在尝试组织回应，这一步本身就是训练的开始。");
  }

  if (aggressiveCount > 0) {
    risks.push("用词里带了明显的对抗感，容易把沟通直接推向冲突。");
  }

  if (vagueCount > 0) {
    risks.push("表达过于模糊，会让对方继续试探或追问。");
  }

  if (boundaryCount === 0) {
    risks.push("没有明确说出你的立场，对方会默认你还可以被说动。");
  }

  if (thinkingSeconds < 1.5) {
    risks.push("反应太快会显得像情绪反射，缺少分寸。");
  }

  if (answerLength < 10) {
    missedConsiderations.push("可以先回应对方的情绪或动机，再表达自己的态度。");
  }

  if (boundaryCount === 0) {
    missedConsiderations.push("最好给出一句明确但不生硬的边界表达。");
  }

  if (scenario.category === "workplace") {
    missedConsiderations.push("职场场景里最好补一个优先级或替代方案，显得更专业。");
  }

  if (scenario.category === "relationship") {
    missedConsiderations.push("亲密关系中建议把‘指责’改成‘感受 + 期待’，更容易被听进去。");
  }

  if (scenario.category === "family") {
    missedConsiderations.push("面对亲戚问话，重点不是说服对方，而是把话题平稳收住。");
  }

  return {
    overallScore,
    summary:
      overallScore >= 85
        ? "这次回应已经比较成熟，既能表达自己，也不会把场面弄僵。"
        : overallScore >= 70
          ? "这次回答有基础，但边界和层次还能再打磨。"
          : "这次回应还比较吃亏，容易让对方继续追问或误解你的态度。",
    strengths,
    risks,
    missedConsiderations,
    improvedAnswer: buildImprovedAnswer(scenario, answer),
    advancedAnswer: buildAdvancedAnswer(scenario),
    scoreBreakdown,
    metrics: {
      thinkingTimeMs: input.thinkingTimeMs,
      answerLength
    }
  };
}
