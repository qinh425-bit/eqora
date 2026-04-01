import { useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { fetchMe, fetchQuotes, fetchScenarios, fetchTrainingRecords } from "@/services/api";
import type { Quote, Scenario, ScenarioCategory, UserProfile } from "@/types";
import { formatCategory, formatDifficulty } from "@/utils/format";
import { getAuthToken } from "@/utils/session";
import "./index.scss";

const principleCards = [
  {
    title: "先接住，再表态",
    detail: "先让对方感到被听见，再表达你的边界和判断，回应会更稳。"
  },
  {
    title: "少解释，多定调",
    detail: "过度解释会把主动权让出去。清楚表达立场，反而更有分寸。"
  },
  {
    title: "给方案，不给把柄",
    detail: "不只说不行，还要给出可执行的下一步，这就是成熟表达。"
  }
];

const categoryOrder: ScenarioCategory[] = ["workplace", "family", "social", "relationship"];

function buildGreeting(user: UserProfile | null, recordCount: number) {
  if (!user) {
    return "从一关开始，先把“难开口的话”练顺。";
  }

  if (recordCount >= 8) {
    return `${user.nickname}，这轮已经不是练胆量，而是在练成熟度。`;
  }

  return `${user.nickname}，今天继续把回应练得更稳一点。`;
}

function pickRecommendedScenario(scenarios: Scenario[]) {
  return scenarios.find((item) => item.difficulty === "medium") ?? scenarios[0] ?? null;
}

export default function HomePage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [recordCount, setRecordCount] = useState(0);

  async function loadDashboard() {
    setLoading(true);

    try {
      const [quotesData, scenarioData] = await Promise.all([fetchQuotes(), fetchScenarios()]);
      setQuotes(quotesData);
      setScenarios(scenarioData);

      const token = getAuthToken();
      if (!token) {
        setUser(null);
        setRecordCount(0);
        return;
      }

      const [profile, records] = await Promise.all([fetchMe(), fetchTrainingRecords()]);
      setUser(profile);
      setRecordCount(records.length);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useDidShow(() => {
    loadDashboard();
  });

  const featuredQuote = quotes[0];
  const recommendedScenario = useMemo(() => pickRecommendedScenario(scenarios), [scenarios]);
  const greeting = useMemo(() => buildGreeting(user, recordCount), [recordCount, user]);
  const categoryCards = useMemo(
    () =>
      categoryOrder.map((category) => {
        const items = scenarios.filter((item) => item.category === category);
        const difficultyHeadline =
          items.find((item) => item.difficulty === "hard")?.title ??
          items.find((item) => item.difficulty === "medium")?.title ??
          items[0]?.title ??
          "正在准备中";

        return {
          category,
          count: items.length,
          headline: difficultyHeadline
        };
      }),
    [scenarios]
  );

  const quickStats = [
    { label: "已训练", value: `${recordCount} 次` },
    { label: "题库", value: `${scenarios.length} 关` },
    { label: "状态", value: user ? "已登录" : "未登录" }
  ];

  return (
    <View className='page-shell home-page'>
      <View className='hero-card home-hero fade-up'>
        <View className='hero-copy-block'>
          <Text className='eyebrow'>Eqora 表达训练</Text>
          <Text className='hero-status'>{greeting}</Text>
          <Text className='hero-title'>把那些卡在喉咙里的话，</Text>
          <Text className='hero-title hero-title-accent'>练成一句有分寸的回应。</Text>
          <Text className='hero-copy'>
            真实场景闯关，AI 逐句点评，帮你练清楚表达、情绪稳定和边界感。不是背模板，而是形成自己的回应骨架。
          </Text>
        </View>

        <View className='hero-actions'>
          <Button
            className='primary-button hero-button'
            onClick={() => {
              const nextScenario = recommendedScenario ?? scenarios[0];
              if (!nextScenario) {
                return;
              }

              Taro.navigateTo({
                url: `/pages/challenge/index?scenarioId=${nextScenario.id}`
              });
            }}
          >
            {loading ? "正在准备训练" : "开始今天这关"}
          </Button>
          <Button className='secondary-button hero-button' onClick={() => Taro.navigateTo({ url: "/pages/profile/index" })}>
            查看我的成长
          </Button>
        </View>

        <View className='hero-stats'>
          {quickStats.map((item) => (
            <View key={item.label} className='hero-stat-card'>
              <Text className='hero-stat-value'>{item.value}</Text>
              <Text className='hero-stat-label'>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {recommendedScenario ? (
        <View className='content-card recommendation-panel fade-up'>
          <View className='section-head'>
            <View>
              <Text className='section-title'>推荐你先练这关</Text>
              <Text className='section-subtitle'>从高频场景切入，先把最常卡壳的那句话练顺。</Text>
            </View>
            <Text className='pill'>{formatDifficulty(recommendedScenario.difficulty)}</Text>
          </View>
          <Text className='recommendation-title'>{recommendedScenario.title}</Text>
          <Text className='recommendation-copy'>{recommendedScenario.prompt}</Text>
          <View className='tag-row recommendation-tags'>
            <Text className='pill'>{formatCategory(recommendedScenario.category)}</Text>
            <Text className='pill outline-pill'>{recommendedScenario.hint}</Text>
          </View>
          <Button
            className='secondary-button'
            onClick={() =>
              Taro.navigateTo({
                url: `/pages/challenge/index?scenarioId=${recommendedScenario.id}`
              })
            }
          >
            进入这一关
          </Button>
        </View>
      ) : null}

      <View className='content-card category-panel fade-up'>
        <Text className='section-title'>训练地图</Text>
        <Text className='section-subtitle'>先把日常最高频的四类表达练稳，再逐步拉高难度。</Text>
        <View className='category-grid'>
          {categoryCards.map((item) => (
            <View key={item.category} className='category-card'>
              <Text className='category-name'>{formatCategory(item.category)}</Text>
              <Text className='category-count'>{item.count} 关</Text>
              <Text className='category-headline'>代表场景：{item.headline}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className='content-card principle-panel fade-up'>
        <Text className='section-title'>表达骨架</Text>
        <Text className='section-subtitle'>一旦紧张，先抓结构。结构稳了，内容就不会散。</Text>
        <View className='principle-grid'>
          {principleCards.map((item) => (
            <View key={item.title} className='principle-card'>
              <Text className='principle-title'>{item.title}</Text>
              <Text className='principle-detail'>{item.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      {featuredQuote ? (
        <View className='quote-card quote-panel fade-up'>
          <Text className='section-title'>今天这句，适合记住</Text>
          <Text className='quote-text'>“{featuredQuote.text}”</Text>
          <Text className='quote-source'>{featuredQuote.source}</Text>
          <Text className='quote-takeaway'>{featuredQuote.takeaway}</Text>
        </View>
      ) : null}

      <View className='content-card legal-card fade-up'>
        <Text className='section-title'>使用说明</Text>
        <Text className='section-subtitle'>
          当前版本已经接入正式后端，可直接完成登录、训练、评分与成长记录查看。你也可以随时查看隐私政策和用户协议。
        </Text>
        <View className='legal-link-row'>
          <Button className='secondary-button legal-button' onClick={() => Taro.navigateTo({ url: "/pages/privacy/index" })}>
            隐私政策
          </Button>
          <Button className='secondary-button legal-button' onClick={() => Taro.navigateTo({ url: "/pages/agreement/index" })}>
            用户协议
          </Button>
        </View>
      </View>
    </View>
  );
}
