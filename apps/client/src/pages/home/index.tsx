import { useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { fetchMe, fetchQuotes, fetchScenarios, fetchTrainingRecords } from "@/services/api";
import type { Quote, Scenario, UserProfile } from "@/types";
import { formatCategory, formatDifficulty } from "@/utils/format";
import { getAuthToken } from "@/utils/session";
import "./index.scss";

const principles = [
  "先接住，再表达",
  "少解释，多定调",
  "有边界，但不带刺"
];

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
      if (token) {
        const [profile, records] = await Promise.all([fetchMe(), fetchTrainingRecords()]);
        setUser(profile);
        setRecordCount(records.length);
      } else {
        setUser(null);
        setRecordCount(0);
      }
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
  const greeting = useMemo(() => (user ? `${user.nickname}，继续练习吧` : "先练一关，看看你的表达底子"), [user]);

  return (
    <View className='page-shell home-page'>
      <View className='hero-card hero-panel fade-up'>
        <View className='hero-top'>
          <View>
            <Text className='pill'>{user ? "已登录" : "未登录"}</Text>
            <Text className='hero-status'>{greeting}</Text>
          </View>
          <Button className='ghost-button' onClick={() => Taro.navigateTo({ url: "/pages/profile/index" })}>
            我的成长
          </Button>
        </View>
        <Text className='hero-title'>把“我当时真不会回”</Text>
        <Text className='hero-title accent'>练成一句稳、准、狠的回答</Text>
        <Text className='hero-copy'>
          真实场景闯关，AI 帮你打分、拆问题、给更优回答。已累计训练 {recordCount} 次。
        </Text>
        <Button
          className='primary-button'
          onClick={() => {
            const firstScenario = scenarios[0];
            if (!firstScenario) {
              return;
            }

            Taro.navigateTo({
              url: `/pages/challenge/index?scenarioId=${firstScenario.id}`
            });
          }}
        >
          {loading ? "加载中..." : "开始第一关"}
        </Button>
      </View>

      <View className='content-card section-card fade-up'>
        <Text className='section-title'>表达原则</Text>
        <View className='tag-row'>
          {principles.map((item) => (
            <Text key={item} className='pill principle-pill'>
              {item}
            </Text>
          ))}
        </View>
      </View>

      {featuredQuote ? (
        <View className='quote-card quote-panel fade-up'>
          <Text className='section-title'>今日金句</Text>
          <Text className='quote-text'>“{featuredQuote.text}”</Text>
          <Text className='quote-source'>{featuredQuote.source}</Text>
          <Text className='section-subtitle'>{featuredQuote.takeaway}</Text>
        </View>
      ) : null}

      <View className='content-card section-card fade-up'>
        <Text className='section-title'>训练场景</Text>
        <Text className='section-subtitle'>先从高频生活场景开始，逐渐建立自己的表达套路。</Text>
        <View className='scenario-list'>
          {scenarios.map((scenario) => (
            <View
              key={scenario.id}
              className='scenario-card scenario-item'
              onClick={() =>
                Taro.navigateTo({
                  url: `/pages/challenge/index?scenarioId=${scenario.id}`
                })
              }
            >
              <View className='scenario-head'>
                <Text className='scenario-title'>{scenario.title}</Text>
                <Text className='scenario-level'>{formatDifficulty(scenario.difficulty)}</Text>
              </View>
              <Text className='scenario-copy'>{scenario.prompt}</Text>
              <View className='tag-row'>
                <Text className='pill'>{formatCategory(scenario.category)}</Text>
                <Text className='pill subtle-pill'>{scenario.hint}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View className='content-card legal-card fade-up'>
        <Text className='section-title'>使用说明</Text>
        <Text className='section-subtitle'>
          当前版本已补齐基础协议页，适合继续做提审准备和外部体验。你可以随时查看数据使用说明与用户规则。
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
