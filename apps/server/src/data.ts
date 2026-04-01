import type { Quote, Scenario } from "./types.js";

export const scenarios: Scenario[] = [
  {
    id: "workplace-decline-overtime",
    title: "领导临时加活",
    category: "workplace",
    difficulty: "medium",
    prompt: "你今天的任务已经排满，领导在下班前 20 分钟又临时加了一项工作。",
    counterpartLine: "这个今晚你顺手做一下，明早我要看。",
    coachingGoal: "练习既不硬碰硬，也不盲目答应的回应方式。",
    pitfalls: ["直接拒绝", "一味讨好", "没有给替代方案"],
    hint: "先接住需求，再说明当前资源，最后给出方案。"
  },
  {
    id: "workplace-delay-negotiation",
    title: "进度赶不上预期",
    category: "workplace",
    difficulty: "hard",
    prompt: "项目目标压得很紧，但你评估后发现当前资源根本无法按时交付。",
    counterpartLine: "这次必须按时交，你先别跟我讲困难，想办法顶上。",
    coachingGoal: "练习在高压场景下，既说明事实，也提出可执行方案。",
    pitfalls: ["只说做不到", "情绪化对抗", "没有给选项"],
    hint: "讲事实、讲风险、讲选择，不要只讲情绪。"
  },
  {
    id: "family-marriage-pressure",
    title: "亲戚催婚",
    category: "family",
    difficulty: "easy",
    prompt: "家庭聚餐时，亲戚又开始追问你的感情进展。",
    counterpartLine: "你也不小了，怎么还不结婚？是不是要求太高了？",
    coachingGoal: "练习礼貌设边界，避免被追着问。",
    pitfalls: ["情绪化反击", "过度解释", "没有明确边界"],
    hint: "感谢关心，但不要进入辩论。"
  },
  {
    id: "family-income-comparison",
    title: "被拿去和别人比较",
    category: "family",
    difficulty: "medium",
    prompt: "长辈在饭桌上拿你的收入和别人做比较，让你很不舒服。",
    counterpartLine: "你看人家同龄人都买房了，你怎么还没动静？",
    coachingGoal: "练习不被带节奏，同时保护自己的节奏。",
    pitfalls: ["立刻翻脸", "被迫自证", "顺着比较走"],
    hint: "先承认对方出发点，再把话题拉回你自己的规划。"
  },
  {
    id: "social-borrow-money",
    title: "朋友借钱",
    category: "social",
    difficulty: "hard",
    prompt: "一个不太熟的朋友开口借钱，金额不大，但你并不想借。",
    counterpartLine: "就借我两千，下周一定还，你不会这点都不帮吧？",
    coachingGoal: "练习拒绝又不失体面。",
    pitfalls: ["态度过冷", "解释漏洞太多", "给对方继续追问空间"],
    hint: "简洁、坚定、不要展开过多细节。"
  },
  {
    id: "social-drinking-pressure",
    title: "饭局被劝酒",
    category: "social",
    difficulty: "medium",
    prompt: "饭局上大家不停劝酒，但你今天不想喝，也不想扫兴。",
    counterpartLine: "就这一杯，别这么不给面子。",
    coachingGoal: "练习既不被裹挟，也不把场面搞僵。",
    pitfalls: ["生硬拒绝", "反复解释身体原因", "态度忽冷忽热"],
    hint: "先表达参与感，再明确边界，最后给替代动作。"
  },
  {
    id: "relationship-express-needs",
    title: "表达自己的需求",
    category: "relationship",
    difficulty: "medium",
    prompt: "伴侣最近总是临时取消约定，你有些失望，但不想把话说成指责。",
    counterpartLine: "最近真的忙，你别总抓着这些小事不放行吗？",
    coachingGoal: "练习表达感受而不是控诉。",
    pitfalls: ["翻旧账", "情绪控诉", "没有说清自己想要什么"],
    hint: "用“我感受到”和“我希望”开头，更容易被接住。"
  },
  {
    id: "relationship-need-space",
    title: "需要一点空间",
    category: "relationship",
    difficulty: "hard",
    prompt: "对方最近频繁追问和确认，让你感到有压力，但你不想把关系推远。",
    counterpartLine: "你是不是不在乎我了？为什么这两天都不主动找我？",
    coachingGoal: "练习安抚情绪，同时说清边界。",
    pitfalls: ["一味安抚", "直接拉开距离", "把需求说成指责"],
    hint: "先回应情绪，再表达你的节奏，不要把边界说成拒绝关系。"
  }
];

export const quotes: Quote[] = [
  {
    id: "quote-1",
    text: "说话周到比雄辩好，措辞适当比恭维好。",
    source: "培根",
    takeaway: "真正高级的表达，不是赢，而是让对方愿意听完。"
  },
  {
    id: "quote-2",
    text: "一句温和的话，可以化解盛怒。",
    source: "箴言",
    takeaway: "温和不是软弱，而是你仍然握着节奏。"
  },
  {
    id: "quote-3",
    text: "智者说话，是因为有话要说；愚者说话，则是因为想说。",
    source: "柏拉图",
    takeaway: "先想目的，再开口，很多关系都会轻松很多。"
  },
  {
    id: "quote-4",
    text: "真正的界限，不靠提高音量，而靠表达清楚。",
    source: "Eqora",
    takeaway: "边界感最怕含糊，说清楚反而更体面。"
  },
  {
    id: "quote-5",
    text: "会说话的人，不是没有情绪，而是知道先把情绪安放好。",
    source: "Eqora",
    takeaway: "情绪稳定不是压抑，而是让表达更有力量。"
  }
];
