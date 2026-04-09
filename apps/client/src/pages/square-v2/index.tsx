import { useEffect, useMemo, useState } from "react";
import { Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import V2BottomNav from "@/components/v2-bottom-nav";
import { fetchQuotes, fetchScenarios } from "@/services/api";
import type { Quote, Scenario } from "@/types";
import { formatCategory, formatDifficulty } from "@/utils/format";
import "./index.scss";

function buildHotCases(scenarios: Scenario[]) {
  return scenarios.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.title,
    category: formatCategory(item.category),
    difficulty: formatDifficulty(item.difficulty),
    excerpt: item.counterpartLine,
    takeaway: item.hint
  }));
}

function buildStarterCards(scenarios: Scenario[]) {
  return scenarios.slice(0, 3).map((item) => ({
    id: `${item.id}-starter`,
    title: item.title,
    category: formatCategory(item.category),
    principle: item.coachingGoal,
    takeaway: item.hint
  }));
}

export default function SquareV2Page() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  useEffect(() => {
    fetchQuotes().then(setQuotes);
    fetchScenarios().then(setScenarios);
  }, []);

  const hotCases = useMemo(() => buildHotCases(scenarios), [scenarios]);
  const starterCards = useMemo(() => buildStarterCards(scenarios), [scenarios]);
  const featuredQuote = quotes[0] ?? null;
  const quoteList = quotes.slice(1, 4);

  return (
    <View className='square-v2-page'>
      <View className='square-v2-shell'>
        <View className='square-v2-topbar fade-up'>
          <View>
            <Text className='square-v2-title'>
              THE <Text className='square-v2-title-accent'>SQUARE</Text>
            </Text>
            <Text className='square-v2-subtitle'>
              先看别人怎么说，再回到自己的训练里。这里收的是值得借鉴的高频场景、金句和表达原则。
            </Text>
          </View>
          <View
            className='square-v2-filter'
            onClick={() => Taro.showToast({ title: "内容会持续更新", icon: "none" })}
          >
            <Text>•</Text>
          </View>
        </View>

        <View className='square-v2-hero fade-up fade-up-delay-1'>
          <View className='square-v2-hero-orbit orbit-a' />
          <View className='square-v2-hero-orbit orbit-b' />
          <Text className='square-v2-hero-eyebrow'>TODAY TO TAKE</Text>
          <Text className='square-v2-hero-title'>
            {featuredQuote ? `“${featuredQuote.text}”` : "正在为你整理今天最值得带走的一句话"}
          </Text>
          <Text className='square-v2-hero-copy'>
            {featuredQuote?.takeaway ?? "稍等一下，精选表达和案例马上就会加载出来。"}
          </Text>
          <View className='square-v2-hero-foot'>
            <Text className='square-v2-hero-source'>{featuredQuote?.source ?? "精选广场"}</Text>
            <Text className='square-v2-hero-note'>适合先看一眼，再回去练</Text>
          </View>
        </View>

        <View className='square-v2-section fade-up fade-up-delay-2'>
          <View className='square-v2-section-head'>
            <View>
              <Text className='square-v2-section-mark'>HOT CASES</Text>
              <Text className='square-v2-section-title'>本周热练</Text>
            </View>
            <Text className='square-v2-section-link'>{hotCases.length} 个案例</Text>
          </View>

          {hotCases.length ? (
            <View className='square-v2-hot-list'>
              {hotCases.map((item, index) => (
                <View
                  key={item.id}
                  className={`square-v2-card square-v2-card-hot tone-${index % 2 === 0 ? "orange" : "teal"}`}
                  onClick={() => Taro.navigateTo({ url: `/pages/challenge-v2/index?scenarioId=${item.id}` })}
                >
                  <View className='square-v2-card-head'>
                    <View className='square-v2-meta'>
                      <Text className={`square-v2-tag ${index % 2 === 0 ? "tone-orange" : "tone-teal"}`}>
                        {item.difficulty}
                      </Text>
                      <Text className='square-v2-category'>{item.category}</Text>
                    </View>
                    <Text className='square-v2-card-link'>去练这一关 →</Text>
                  </View>
                  <Text className='square-v2-card-title'>{item.title}</Text>
                  <Text className='square-v2-excerpt'>{`“${item.excerpt}”`}</Text>
                  <Text className='square-v2-summary'>{item.takeaway}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className='v2-empty-state'>
              <View className='v2-empty-state-icon'>
                <Text>热</Text>
              </View>
              <Text className='v2-empty-state-title'>本周热练还在生成</Text>
              <Text className='v2-empty-state-copy'>等训练数据再多一点，这里会自动筛出值得先看的高频场景。</Text>
            </View>
          )}
        </View>

        <View className='square-v2-section fade-up fade-up-delay-3'>
          <View className='square-v2-section-head'>
            <View>
              <Text className='square-v2-section-mark'>BEST LINE</Text>
              <Text className='square-v2-section-title'>高赞金句</Text>
            </View>
            <Text className='square-v2-section-link'>{quotes.length} 条</Text>
          </View>

          {quoteList.length ? (
            <View className='square-v2-quote-list'>
              {quoteList.map((item, index) => (
                <View key={item.id} className='square-v2-card square-v2-card-quote'>
                  <View className='square-v2-meta'>
                    <Text className={`square-v2-tag ${index % 2 === 0 ? "tone-slate" : "tone-teal"}`}>可直接借鉴</Text>
                    <Text className='square-v2-category'>{item.source}</Text>
                  </View>
                  <Text className='square-v2-card-title'>{`“${item.text}”`}</Text>
                  <Text className='square-v2-summary'>{item.takeaway}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className='v2-empty-state'>
              <View className='v2-empty-state-icon'>
                <Text>句</Text>
              </View>
              <Text className='v2-empty-state-title'>精选金句正在整理</Text>
              <Text className='v2-empty-state-copy'>等内容再多一点，这里会优先出现更贴近当前阶段的高赞表达样本。</Text>
            </View>
          )}
        </View>

        <View className='square-v2-section fade-up fade-up-delay-4'>
          <View className='square-v2-section-head'>
            <View>
              <Text className='square-v2-section-mark'>START HERE</Text>
              <Text className='square-v2-section-title'>新手先看</Text>
            </View>
            <Text className='square-v2-section-link'>底层原则</Text>
          </View>

          <View className='square-v2-principle-list'>
            {starterCards.map((item) => (
              <View key={item.id} className='square-v2-card square-v2-card-principle'>
                <Text className='square-v2-principle-category'>{item.category}</Text>
                <Text className='square-v2-card-title'>{item.title}</Text>
                <Text className='square-v2-principle-label'>训练目标</Text>
                <Text className='square-v2-principle-copy'>{item.principle}</Text>
                <Text className='square-v2-principle-label'>这一关最该记住</Text>
                <Text className='square-v2-principle-copy'>{item.takeaway}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <V2BottomNav active='square' />
    </View>
  );
}
