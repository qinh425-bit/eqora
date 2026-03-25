import type { Quote, Scenario } from "@/types";

export const mockQuotes: Quote[] = [
  {
    id: "quote-1",
    text: "说话周到比雄辩好，措辞适当比恭维好。",
    source: "培根",
    takeaway: "说对，比说多重要。"
  },
  {
    id: "quote-2",
    text: "一句温和的话，可以化解盛怒。",
    source: "箴言",
    takeaway: "柔和是控制力，不是示弱。"
  }
];

export const mockScenarios: Scenario[] = [
  {
    id: "workplace-decline-overtime",
    title: "领导临时加活",
    category: "workplace",
    difficulty: "medium",
    prompt: "你今天已经排满任务，领导在下班前 20 分钟又加了一项紧急工作。",
    counterpartLine: "这个今晚你顺手做一下，明早我要看。",
    coachingGoal: "练习既不硬碰硬，也不盲目答应的回应方式。",
    pitfalls: ["直接拒绝", "一味讨好", "没有给替代方案"],
    hint: "先接住需求，再说明当前资源，最后给出方案。"
  },
  {
    id: "family-marriage-pressure",
    title: "亲戚催婚",
    category: "family",
    difficulty: "easy",
    prompt: "过年聚餐时，亲戚又开始问你的感情进展。",
    counterpartLine: "你也不小了，怎么还不结婚？是不是要求太高了？",
    coachingGoal: "练习礼貌设边界，避免被追着问。",
    pitfalls: ["情绪化反击", "过度解释", "没有明确边界"],
    hint: "感谢关心，但不要进入辩论。"
  },
  {
    id: "social-borrow-money",
    title: "朋友借钱",
    category: "social",
    difficulty: "hard",
    prompt: "一个不太熟的朋友开口借钱，金额不大但你不想借。",
    counterpartLine: "就借我两千，下周一定还，你不会这点都不帮吧？",
    coachingGoal: "练习拒绝又不失体面。",
    pitfalls: ["态度过冷", "解释漏洞太多", "给对方继续追问空间"],
    hint: "简洁、坚定、不要展开过多细节。"
  }
];
