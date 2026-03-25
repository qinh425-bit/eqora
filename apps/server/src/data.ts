import type { Quote, Scenario } from "./types.js";

export const scenarios: Scenario[] = [
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
  },
  {
    id: "relationship-express-needs",
    title: "表达自己的需求",
    category: "relationship",
    difficulty: "medium",
    prompt: "伴侣最近总是临时取消约定，你有些失望，但不想吵架。",
    counterpartLine: "最近真的忙，你别总抓着这些小事不放行吗？",
    coachingGoal: "练习表达感受而不是指责。",
    pitfalls: ["翻旧账", "情绪控诉", "没有说清自己想要什么"],
    hint: "用‘我感受到’和‘我希望’开头更容易被接住。"
  }
];

export const quotes: Quote[] = [
  {
    id: "quote-1",
    text: "说话周到比雄辩好，措辞适当比恭维好。",
    source: "培根",
    takeaway: "表达的关键不是说得多，而是说得准。"
  },
  {
    id: "quote-2",
    text: "智者说话，是因为有话要说；愚者说话，则是因为想说。",
    source: "柏拉图",
    takeaway: "回应前先想目的，会比抢着开口更有力量。"
  },
  {
    id: "quote-3",
    text: "一句温和的话，可以化解盛怒。",
    source: "箴言",
    takeaway: "柔和不是软弱，而是高级的控制力。"
  }
];
