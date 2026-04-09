import { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import V2BottomNav from "@/components/v2-bottom-nav";
import { fetchMe, fetchScenarios, fetchTrainingRecords } from "@/services/api";
import type { Scenario, TrainingRecord, UserProfile } from "@/types";
import { formatCategory, formatDifficulty } from "@/utils/format";
import { getAuthToken } from "@/utils/session";
import { methodCardsMock } from "./mock";
import "./index.scss";

function getDateLabel() {
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long"
  });
  return formatter.format(new Date());
}

function countStreak(records: TrainingRecord[]) {
  if (!records.length) {
    return 0;
  }

  const uniqueDays = Array.from(
    new Set(
      records.map((item) => {
        const date = new Date(item.createdAt);
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      })
    )
  )
    .map((item) => new Date(item).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);

  let streak = 0;
  let cursor = new Date().setHours(0, 0, 0, 0);

  for (const day of uniqueDays) {
    if (day === cursor) {
      streak += 1;
      cursor -= 24 * 60 * 60 * 1000;
      continue;
    }

    if (streak === 0 && day === cursor - 24 * 60 * 60 * 1000) {
      streak += 1;
      cursor = day - 24 * 60 * 60 * 1000;
      continue;
    }

    break;
  }

  return streak;
}

function findWeakestCategory(records: TrainingRecord[]) {
  if (!records.length) {
    return null;
  }

  const bucket = new Map<string, { total: number; count: number }>();
  records.forEach((item) => {
    const current = bucket.get(item.category) ?? { total: 0, count: 0 };
    bucket.set(item.category, { total: current.total + item.overallScore, count: current.count + 1 });
  });

  return [...bucket.entries()]
    .map(([category, value]) => ({ category, avg: value.total / value.count }))
    .sort((a, b) => a.avg - b.avg)[0]?.category ?? null;
}

function findSuggestedScenario(scenarios: Scenario[], records: TrainingRecord[]) {
  const weakestCategory = findWeakestCategory(records);
  if (weakestCategory) {
    return scenarios.find((item) => item.category === weakestCategory) ?? null;
  }

  return scenarios.find((item) => item.difficulty === "easy") ?? scenarios[0] ?? null;
}

function buildHeroCopy(user: UserProfile | null, records: TrainingRecord[], scenario: Scenario | null) {
  if (!scenario) {
    return {
      eyebrow: "正在生成今日推荐",
      title: "把今天最值得练的一关放到你面前",
      subtitle: "稍等一下，我们正在根据你的训练进度整理最适合现在开口的场景。",
      cta: "去练习场"
    };
  }

  if (!user) {
    return {
      eyebrow: "今日推荐",
      title: scenario.title,
      subtitle: `${scenario.prompt} 先从这一关开始，把回应节奏和表达骨架练顺。`,
      cta: "开始第一关"
    };
  }

  if (!records.length) {
    return {
      eyebrow: "建立你的表达档案",
      title: scenario.title,
      subtitle: "先完成第一关，系统会从你的回答里生成第一份成长建议，并开始记录训练轨迹。",
      cta: "开始训练"
    };
  }

  return {
    eyebrow: "今天最值得练",
    title: scenario.title,
    subtitle: `你最近在${formatCategory(scenario.category)}场景还有提升空间，这一关最适合继续往下补。`,
    cta: "继续精练"
  };
}

function buildCampCards(scenarios: Scenario[], records: TrainingRecord[]) {
  const categories: Array<Scenario["category"]> = ["workplace", "social", "family", "relationship"];
  const weakest = findWeakestCategory(records);

  return categories
    .filter((category) => scenarios.some((item) => item.category === category))
    .slice(0, 3)
    .map((category, index) => {
      const items = scenarios.filter((item) => item.category === category);
      const lead = items[0];
      return {
        category,
        title: `${formatCategory(category)}表达训练营`,
        eyebrow: weakest === category ? "当前优先补强" : index === 0 ? "本周热门" : "推荐进阶",
        description: lead?.hint ?? "先接住，再说明边界，最后把下一步讲清楚。",
        scenarioId: lead?.id ?? "",
        count: `${items.length} 个真实场景`,
        highlight: lead ? formatDifficulty(lead.difficulty) : "实战模拟",
        accent: index === 0 ? "teal" : index === 1 ? "slate" : "orange"
      };
    });
}

function buildInsight(user: UserProfile | null, records: TrainingRecord[], scenario: Scenario | null) {
  if (!user) {
    return "登录后，首页会根据你的训练记录自动调整推荐场景和训练重点。";
  }

  if (!records.length) {
    return "你还没有留下训练轨迹。先完成第一关，系统就会开始生成专属建议。";
  }

  if (!scenario) {
    return "今天先从一关短练开始，把表达节奏和结构先稳住。";
  }

  return `你最近最值得继续补的是${formatCategory(scenario.category)}场景，建议先练“${scenario.title}”。`;
}

export default function HomeV2Page() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  async function loadHome() {
    const items = await fetchScenarios();
    setScenarios(items);

    if (!getAuthToken()) {
      setUser(null);
      setRecords([]);
      return;
    }

    try {
      const [profile, trainingRecords] = await Promise.all([fetchMe(), fetchTrainingRecords()]);
      const sorted = [...trainingRecords].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setUser(profile);
      setRecords(sorted);
    } catch (_error) {
      setUser(null);
      setRecords([]);
    }
  }

  useEffect(() => {
    loadHome();
  }, []);

  useDidShow(() => {
    loadHome();
  });

  const suggestedScenario = useMemo(() => findSuggestedScenario(scenarios, records), [records, scenarios]);
  const hero = useMemo(() => buildHeroCopy(user, records, suggestedScenario), [records, suggestedScenario, user]);
  const averageScore = useMemo(() => {
    if (!records.length) {
      return 0;
    }

    return Math.round(records.reduce((sum, item) => sum + item.overallScore, 0) / records.length);
  }, [records]);
  const latestRecord = records[0] ?? null;
  const weakestCategory = useMemo(() => findWeakestCategory(records), [records]);
  const stats = useMemo(
    () => [
      { label: "累计训练", value: `${records.length}`, suffix: "次" },
      { label: "平均得分", value: `${averageScore || 0}`, suffix: "分" },
      { label: "连续坚持", value: `${countStreak(records)}`, suffix: "天" }
    ],
    [averageScore, records]
  );
  const campCards = useMemo(() => buildCampCards(scenarios, records), [records, scenarios]);
  const insight = useMemo(() => buildInsight(user, records, suggestedScenario), [records, suggestedScenario, user]);

  function openSuggestedScenario() {
    if (suggestedScenario) {
      Taro.navigateTo({ url: `/pages/challenge-v2/index?scenarioId=${suggestedScenario.id}` });
      return;
    }

    Taro.navigateTo({ url: "/pages/practice-v2/index" });
  }

  return (
    <View className='home-v2-page'>
      <View className='home-v2-shell'>
        <View className='home-v2-topbar fade-up'>
          <View className='home-v2-brand-group'>
            <Text className='home-v2-brand'>eqora.</Text>
            <Text className='home-v2-date'>{getDateLabel()}</Text>
          </View>
          <View className='home-v2-topbar-right'>
            <View className='home-v2-progress-pill'>
              <Text className='home-v2-progress-label'>表达训练</Text>
              <Text className='home-v2-progress-value'>{records.length || 0}</Text>
            </View>
            <View className='home-v2-avatar' onClick={() => Taro.navigateTo({ url: "/pages/profile-v2/index" })}>
              <Text>{user?.nickname?.slice(0, 1) ?? "Q"}</Text>
            </View>
          </View>
        </View>

        <View className='home-v2-hero fade-up fade-up-delay-1'>
          <View className='home-v2-hero-orbit orbit-a' />
          <View className='home-v2-hero-orbit orbit-b' />
          <View className='home-v2-hero-grid' />

          <View className='home-v2-hero-head'>
            <Text className='home-v2-hero-eyebrow'>{hero.eyebrow}</Text>
            <View className='home-v2-hero-chips'>
              <Text className='home-v2-hero-chip'>AI 陪练</Text>
              <Text className='home-v2-hero-chip'>真实场景</Text>
              <Text className='home-v2-hero-chip'>今天就能练</Text>
            </View>
          </View>

          <View className='home-v2-hero-main'>
            <View className='home-v2-hero-copy-wrap'>
              <Text className='home-v2-hero-title'>{hero.title}</Text>
              <Text className='home-v2-hero-copy'>{hero.subtitle}</Text>
            </View>

            <View className='home-v2-hero-sidecard'>
              <Text className='home-v2-hero-side-label'>当前重点</Text>
              <Text className='home-v2-hero-side-value'>
                {suggestedScenario ? formatCategory(suggestedScenario.category) : "等待推荐"}
              </Text>
              <Text className='home-v2-hero-side-copy'>
                {suggestedScenario ? suggestedScenario.coachingGoal : "训练记录会影响这里的推荐方向。"}
              </Text>
            </View>
          </View>

          <View className='home-v2-hero-actions'>
            <Button className='home-v2-hero-button' onClick={openSuggestedScenario}>
              {hero.cta}
            </Button>
            <View className='home-v2-hero-secondary' onClick={() => Taro.navigateTo({ url: "/pages/practice-v2/index" })}>
              <Text className='home-v2-hero-secondary-label'>全部训练营</Text>
              <Text className='home-v2-hero-secondary-arrow'>→</Text>
            </View>
          </View>
        </View>

        <View className='home-v2-stats fade-up fade-up-delay-2'>
          {stats.map((item) => (
            <View key={item.label} className='home-v2-stat'>
              <Text className='home-v2-stat-value'>
                {item.value}
                <Text className='home-v2-stat-suffix'>{item.suffix}</Text>
              </Text>
              <Text className='home-v2-stat-label'>{item.label}</Text>
            </View>
          ))}
        </View>

        <View className='home-v2-section'>
          <View className='home-v2-section-head'>
            <View>
              <Text className='home-v2-section-mark'>FOCUS BOARD</Text>
              <Text className='home-v2-section-title'>今天的训练重点</Text>
            </View>
            <Text className='home-v2-section-link'>跟着这里练更省力</Text>
          </View>

          <View className='home-v2-focus-grid'>
            <View className='home-v2-focus-card'>
              <Text className='home-v2-focus-label'>建议先补</Text>
              <Text className='home-v2-focus-value'>{weakestCategory ? formatCategory(weakestCategory) : "从第一关开始"}</Text>
              <Text className='home-v2-focus-copy'>
                {weakestCategory
                  ? "这类场景最容易失分，先把表达节奏和边界感练稳。"
                  : "先做一次完整训练，系统才会开始识别你的薄弱点。"}
              </Text>
            </View>

            <View className='home-v2-focus-card home-v2-focus-card-dark'>
              <Text className='home-v2-focus-label'>最近一关</Text>
              <Text className='home-v2-focus-value'>{latestRecord?.overallScore ?? 0} 分</Text>
              <Text className='home-v2-focus-copy'>
                {latestRecord ? latestRecord.scenarioTitle : "你还没有留下训练结果。"}
              </Text>
            </View>
          </View>
        </View>

        <View className='home-v2-section'>
          <View className='home-v2-section-head'>
            <View>
              <Text className='home-v2-section-mark'>METHOD</Text>
              <Text className='home-v2-section-title'>先把表达骨架练出来</Text>
            </View>
            <Text className='home-v2-section-link'>开练前先看</Text>
          </View>
          <ScrollView className='home-v2-method-scroll' scrollX>
            <View className='home-v2-method-row'>
              {methodCardsMock.map((item) => (
                <View key={item.title} className={`home-v2-method-card accent-${item.accent}`}>
                  <Text className='home-v2-method-kicker'>{item.kicker}</Text>
                  <View className='home-v2-method-icon'>
                    <Text>{item.emoji}</Text>
                  </View>
                  <Text className='home-v2-method-title'>{item.title}</Text>
                  <Text className='home-v2-method-copy'>{item.copy}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className='home-v2-section'>
          <View className='home-v2-section-head'>
            <View>
              <Text className='home-v2-section-mark'>HOT CAMP</Text>
              <Text className='home-v2-section-title'>从真实训练营开始，而不是从空白开始</Text>
            </View>
            <Text className='home-v2-section-link'>{campCards.length} 个主题营</Text>
          </View>

          <View className='home-v2-camp-stack'>
            {campCards.map((item) => (
              <View
                key={item.title}
                className={`home-v2-camp-card accent-${item.accent}`}
                onClick={() => {
                  if (item.scenarioId) {
                    Taro.navigateTo({ url: `/pages/challenge-v2/index?scenarioId=${item.scenarioId}` });
                  }
                }}
              >
                <View className='home-v2-camp-head'>
                  <View>
                    <Text className='home-v2-camp-eyebrow'>{item.eyebrow}</Text>
                    <Text className='home-v2-camp-title'>{item.title}</Text>
                  </View>
                  <Text className='home-v2-camp-arrow'>→</Text>
                </View>

                <View className='home-v2-camp-meta-row'>
                  <Text className='home-v2-camp-badge'>{formatCategory(item.category)}</Text>
                  <Text className='home-v2-camp-badge home-v2-camp-badge-ghost'>{item.highlight}</Text>
                  <Text className='home-v2-camp-count'>{item.count}</Text>
                </View>

                <Text className='home-v2-camp-copy'>{item.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className='home-v2-lab fade-up fade-up-delay-4'>
          <View className='home-v2-lab-copy-wrap'>
            <Text className='home-v2-lab-mark'>WEEKLY NOTE</Text>
            <Text className='home-v2-lab-title'>本周训练提示</Text>
            <Text className='home-v2-lab-copy'>{insight}</Text>
          </View>
          <Button className='home-v2-lab-button' onClick={() => Taro.navigateTo({ url: "/pages/square-v2/index" })}>
            去看精选
          </Button>
        </View>
      </View>
      <V2BottomNav active='home' />
    </View>
  );
}
