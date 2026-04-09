import { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import V2BottomNav from "@/components/v2-bottom-nav";
import { fetchScenarios } from "@/services/api";
import type { Scenario, ScenarioCategory } from "@/types";
import { formatCategory, formatDifficulty } from "@/utils/format";
import "./index.scss";

type FilterKey = "all" | ScenarioCategory;

const categoryOrder: ScenarioCategory[] = ["workplace", "social", "family", "relationship"];

function getAccent(category: ScenarioCategory) {
  if (category === "family") {
    return "orange";
  }

  if (category === "relationship") {
    return "violet";
  }

  return "teal";
}

function buildCampCards(scenarios: Scenario[]) {
  return categoryOrder
    .filter((category) => scenarios.some((item) => item.category === category))
    .map((category, index) => {
      const items = scenarios.filter((item) => item.category === category);
      const lead =
        items.find((item) => item.difficulty === "hard") ??
        items.find((item) => item.difficulty === "medium") ??
        items[0];

      return {
        key: category,
        accent: getAccent(category),
        title: `${formatCategory(category)}表达训练营`,
        eyebrow: index === 0 ? "本周热门" : index === 1 ? "适合先练" : "进阶补强",
        description: lead?.hint ?? "先接住对方，再说边界，最后把下一步讲清楚。",
        count: items.length,
        scenarioId: lead?.id ?? "",
        difficulty: lead ? formatDifficulty(lead.difficulty) : "实战训练"
      };
    });
}

function buildRouteScenarios(scenarios: Scenario[]) {
  return scenarios.slice(0, 3).map((item, index) => ({
    id: item.id,
    step: `0${index + 1}`,
    title: item.title,
    label: `${formatCategory(item.category)} · ${formatDifficulty(item.difficulty)}`,
    copy: item.coachingGoal
  }));
}

function pickFeaturedScenario(items: Scenario[]) {
  return (
    items.find((item) => item.difficulty === "hard") ??
    items.find((item) => item.difficulty === "medium") ??
    items[0] ??
    null
  );
}

export default function PracticeV2Page() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchScenarios()
      .then((items) => {
        if (mounted) {
          setScenarios(items);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const categoryTabs = useMemo(
    () => [
      { key: "all" as const, label: "全部" },
      ...categoryOrder
        .filter((category) => scenarios.some((item) => item.category === category))
        .map((category) => ({ key: category, label: formatCategory(category) }))
    ],
    [scenarios]
  );

  const filteredScenarios = useMemo(() => {
    if (activeFilter === "all") {
      return scenarios;
    }

    return scenarios.filter((item) => item.category === activeFilter);
  }, [activeFilter, scenarios]);

  const featuredScenario = useMemo(() => pickFeaturedScenario(filteredScenarios), [filteredScenarios]);
  const stressScenario = useMemo(
    () => filteredScenarios.find((item) => item.difficulty === "hard") ?? filteredScenarios[0] ?? null,
    [filteredScenarios]
  );
  const campCards = useMemo(() => buildCampCards(filteredScenarios), [filteredScenarios]);
  const routeScenarios = useMemo(() => buildRouteScenarios(filteredScenarios), [filteredScenarios]);

  function openScenario(scenarioId?: string) {
    if (!scenarioId) {
      return;
    }

    Taro.navigateTo({ url: `/pages/challenge-v2/index?scenarioId=${scenarioId}` });
  }

  return (
    <View className='practice-v2-page'>
      <View className='practice-v2-shell'>
        <View className='practice-v2-head fade-up'>
          <Text className='practice-v2-title'>
            PRACTICE <Text className='practice-v2-title-accent'>FIELD</Text>
          </Text>
          <Text className='practice-v2-subtitle'>
            别把这里当题库。这里更像你的训练营总览页，先帮你选路线，再带你进入最该练的那一关。
          </Text>
        </View>

        <View className='practice-v2-brief fade-up fade-up-delay-1'>
          <View className='practice-v2-brief-icon'>
            <Text>练</Text>
          </View>
          <View className='practice-v2-brief-copy'>
            <Text className='practice-v2-brief-title'>训练场状态</Text>
            <Text className='practice-v2-brief-text'>
              {loading ? "正在同步最新训练内容…" : `当前已整理 ${scenarios.length} 个真实场景，建议先从一个训练营开始。`}
            </Text>
          </View>
        </View>

        <View className='practice-v2-chip-row fade-up fade-up-delay-1'>
          <ScrollView className='practice-v2-chips' scrollX>
            {categoryTabs.map((item) => (
              <Text
                key={item.key}
                className={`practice-v2-chip ${activeFilter === item.key ? "practice-v2-chip-active" : ""}`}
                onClick={() => setActiveFilter(item.key)}
              >
                {item.label}
              </Text>
            ))}
          </ScrollView>
        </View>

        <View className='practice-v2-hero fade-up fade-up-delay-2'>
          <View className='practice-v2-hero-grid' />
          <View className='practice-v2-hero-head'>
            <Text className='practice-v2-hero-eyebrow'>TODAY PICK</Text>
            <View className='practice-v2-hero-tags'>
              <Text className='practice-v2-hero-tag'>
                {featuredScenario ? formatCategory(featuredScenario.category) : "等待推荐"}
              </Text>
              <Text className='practice-v2-hero-tag ghost'>
                {featuredScenario ? formatDifficulty(featuredScenario.difficulty) : "正在同步"}
              </Text>
            </View>
          </View>
          <Text className='practice-v2-hero-title'>
            {featuredScenario?.title ?? "正在为你准备今天最值得练的一关"}
          </Text>
          <Text className='practice-v2-hero-copy'>
            {featuredScenario?.prompt ?? "稍等一下，系统正在加载训练内容。"}
          </Text>
          <View className='practice-v2-hero-footer'>
            <View>
              <Text className='practice-v2-hero-note-label'>这一关在练什么</Text>
              <Text className='practice-v2-hero-note'>
                {featuredScenario?.coachingGoal ?? "先从一关短练开始，建立稳定的回应节奏。"}
              </Text>
            </View>
            <Button className='practice-v2-hero-button' onClick={() => openScenario(featuredScenario?.id)}>
              立即开练
            </Button>
          </View>
        </View>

        <View className='practice-v2-section fade-up fade-up-delay-2'>
          <View className='practice-v2-section-head'>
            <View>
              <Text className='practice-v2-section-mark'>TRAINING CAMP</Text>
              <Text className='practice-v2-section-title'>热门训练营</Text>
            </View>
            <Text className='practice-v2-link'>{campCards.length} 个方向</Text>
          </View>

          {campCards.length ? (
            <ScrollView className='practice-v2-camp-scroll' scrollX>
              <View className='practice-v2-camp-row'>
                {campCards.map((item) => (
                  <View
                    key={item.key}
                    className={`practice-v2-camp-card accent-${item.accent}`}
                    onClick={() => openScenario(item.scenarioId)}
                  >
                    <Text className='practice-v2-camp-eyebrow'>{item.eyebrow}</Text>
                    <Text className='practice-v2-camp-title'>{item.title}</Text>
                    <Text className='practice-v2-camp-copy'>{item.description}</Text>
                    <View className='practice-v2-camp-meta'>
                      <Text className='practice-v2-camp-pill'>{item.count} 个场景</Text>
                      <Text className='practice-v2-camp-pill ghost'>{item.difficulty}</Text>
                    </View>
                    <Text className='practice-v2-camp-link'>进入这条线 →</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className='v2-empty-state'>
              <View className='v2-empty-state-icon'>
                <Text>营</Text>
              </View>
              <Text className='v2-empty-state-title'>训练营正在整理中</Text>
              <Text className='v2-empty-state-copy'>先从推荐场景开始练，系统会随着题库补齐把训练营自动组织起来。</Text>
            </View>
          )}
        </View>

        <View className='practice-v2-grid fade-up fade-up-delay-3'>
          <View className='practice-v2-panel'>
            <View className='practice-v2-section-head compact'>
              <View>
                <Text className='practice-v2-section-mark'>ROUTE</Text>
                <Text className='practice-v2-section-title'>本周训练路线</Text>
              </View>
              <Text className='practice-v2-link'>{routeScenarios.length} 步</Text>
            </View>
            <View className='practice-v2-route-list'>
              {routeScenarios.map((item) => (
                <View key={item.id} className='practice-v2-route-item' onClick={() => openScenario(item.id)}>
                  <View className='practice-v2-route-step'>
                    <Text>{item.step}</Text>
                  </View>
                  <View className='practice-v2-route-body'>
                    <Text className='practice-v2-route-title'>{item.title}</Text>
                    <Text className='practice-v2-route-label'>{item.label}</Text>
                    <Text className='practice-v2-route-copy'>{item.copy}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className='practice-v2-panel practice-v2-panel-dark'>
            <View className='practice-v2-section-head compact'>
              <View>
                <Text className='practice-v2-section-mark'>PRESSURE TEST</Text>
                <Text className='practice-v2-section-title'>高压模拟</Text>
              </View>
            </View>
            <Text className='practice-v2-pressure-title'>{stressScenario?.title ?? "等待高压场景加载"}</Text>
            <Text className='practice-v2-pressure-copy'>
              {stressScenario?.hint ?? "这里会优先出现更接近真实冲突、更考验稳定度的情境。"}
            </Text>
            <View className='practice-v2-pressure-tags'>
              <Text className='practice-v2-pressure-pill'>
                {stressScenario ? formatCategory(stressScenario.category) : "待生成"}
              </Text>
              <Text className='practice-v2-pressure-pill ghost'>
                {stressScenario ? formatDifficulty(stressScenario.difficulty) : "等待同步"}
              </Text>
            </View>
            <Button className='practice-v2-pressure-button' onClick={() => openScenario(stressScenario?.id)}>
              去试这一关
            </Button>
          </View>
        </View>

        <View className='practice-v2-section fade-up fade-up-delay-4'>
          <View className='practice-v2-section-head'>
            <View>
              <Text className='practice-v2-section-mark'>ALL SCENES</Text>
              <Text className='practice-v2-section-title'>全部场景</Text>
            </View>
            <Text className='practice-v2-link'>{filteredScenarios.length} 道题</Text>
          </View>

          {filteredScenarios.length ? (
            <View className='practice-v2-scene-list'>
              {filteredScenarios.map((item) => (
                <View key={item.id} className='practice-v2-scene-card' onClick={() => openScenario(item.id)}>
                  <View className='practice-v2-scene-head'>
                    <View className='practice-v2-scene-tags'>
                      <Text className='practice-v2-scene-tag'>{formatCategory(item.category)}</Text>
                      <Text className='practice-v2-scene-tag ghost'>{formatDifficulty(item.difficulty)}</Text>
                    </View>
                    <Text className='practice-v2-scene-link'>开始 →</Text>
                  </View>
                  <Text className='practice-v2-scene-title'>{item.title}</Text>
                  <Text className='practice-v2-scene-prompt'>{`“${item.counterpartLine}”`}</Text>
                  <Text className='practice-v2-scene-copy'>{item.hint}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className='v2-empty-state'>
              <View className='v2-empty-state-icon'>
                <Text>空</Text>
              </View>
              <Text className='v2-empty-state-title'>这个分类暂时还没有内容</Text>
              <Text className='v2-empty-state-copy'>先切到别的训练营练一关，后面这里会继续补充。</Text>
            </View>
          )}
        </View>

        <View className='practice-v2-note fade-up fade-up-delay-4'>
          <Text className='practice-v2-note-title'>下一步还会补什么</Text>
          <Text className='practice-v2-note-copy'>
            后面这里会继续补“上传你自己的真实案例”和“分层训练路线”，现在先把核心主线练顺。
          </Text>
        </View>
      </View>

      <V2BottomNav active='practice' />
    </View>
  );
}
