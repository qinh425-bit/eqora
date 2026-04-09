import { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { fetchScenarios, saveTrainingRecord } from "@/services/api";
import type { EvaluationResult, Scenario } from "@/types";
import { formatCategory, formatDuration } from "@/utils/format";
import { getAuthToken } from "@/utils/session";
import "./index.scss";

type RecordSyncStatus = "guest" | "saving" | "saved" | "failed";

function buildScoreTone(score: number) {
  if (score >= 85) {
    return {
      label: "很稳",
      copy: "这次回答已经有结构、有分寸，也能把立场和方案讲得比较清楚。",
      delta: "+进阶",
      accent: "teal"
    };
  }

  if (score >= 70) {
    return {
      label: "有底",
      copy: "方向已经对了，下一步重点是把边界和动作说得更利落。",
      delta: "+继续练",
      accent: "blue"
    };
  }

  if (score >= 55) {
    return {
      label: "起势中",
      copy: "你已经开始接住场面了，但落点还不够准，再练一次会很有感觉。",
      delta: "+可突破",
      accent: "orange"
    };
  }

  return {
    label: "还要磨",
    copy: "先别追求锋利，先把情绪和结构稳住，提升会更明显。",
    delta: "+重练",
    accent: "slate"
  };
}

function buildScoreStatement(score: number) {
  if (score >= 85) {
    return "你已经不只是会说，而是在开始形成稳定的表达风格。";
  }

  if (score >= 70) {
    return "这轮已经能把局面接住，接下来要继续把答案磨得更成熟。";
  }

  if (score >= 55) {
    return "你的回答已经有方向了，现在最需要的是把关键句落准。";
  }

  return "先把回应节奏稳下来，下一轮会比这一轮更容易打开。";
}

function buildSaveStatus(syncStatus: RecordSyncStatus) {
  if (syncStatus === "saving") {
    return {
      copy: "正在把这次训练收进成长档案…",
      tone: "warn" as const
    };
  }

  if (syncStatus === "saved") {
    return {
      copy: "本次训练已保存到成长记录，可在“我的”页继续回看。",
      tone: "good" as const
    };
  }

  if (syncStatus === "failed") {
    return {
      copy: "训练记录保存失败，稍后再试一次会更稳。",
      tone: "warn" as const
    };
  }

  return {
    copy: "登录后会自动沉淀到成长档案，方便你持续复练。",
    tone: "muted" as const
  };
}

function findNextScenario(current: Scenario, scenarios: Scenario[]) {
  const sameCategory = scenarios.filter((item) => item.category === current.category && item.id !== current.id);
  if (sameCategory.length) {
    return sameCategory[0];
  }

  return scenarios.find((item) => item.id !== current.id) ?? null;
}

export default function ReportV2Page() {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [answer, setAnswer] = useState("");
  const [recordSyncStatus, setRecordSyncStatus] = useState<RecordSyncStatus>("guest");
  const [nextScenario, setNextScenario] = useState<Scenario | null>(null);

  useEffect(() => {
    setResult(Taro.getStorageSync("latestEvaluation"));
    setScenario(Taro.getStorageSync("latestScenario"));
    setAnswer(Taro.getStorageSync("latestAnswer") || "");
  }, []);

  useEffect(() => {
    if (!scenario) {
      return;
    }

    fetchScenarios().then((items) => {
      setNextScenario(findNextScenario(scenario, items));
    });
  }, [scenario]);

  useEffect(() => {
    if (!result || !scenario) {
      return;
    }

    if (!getAuthToken()) {
      setRecordSyncStatus("guest");
      return;
    }

    setRecordSyncStatus("saving");
    saveTrainingRecord({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      overallScore: result.overallScore,
      summary: result.summary,
      answer,
      thinkingTimeMs: result.metrics.thinkingTimeMs
    })
      .then(() => setRecordSyncStatus("saved"))
      .catch(() => setRecordSyncStatus("failed"));
  }, [answer, result, scenario]);

  const scoreTone = useMemo(() => buildScoreTone(result?.overallScore ?? 0), [result?.overallScore]);
  const scoreStatement = useMemo(() => buildScoreStatement(result?.overallScore ?? 0), [result?.overallScore]);
  const saveStatus = useMemo(() => buildSaveStatus(recordSyncStatus), [recordSyncStatus]);
  const reviewFocus = useMemo(() => {
    const weakest = [...(result?.scoreBreakdown ?? [])].sort((left, right) => left.score - right.score)[0];

    if (!weakest) {
      return {
        title: "继续把节奏练稳",
        copy: "先把回应结构练成肌肉记忆，再去追求更锋利的表达。"
      };
    }

    return {
      title: `下一轮先盯住“${weakest.label}”`,
      copy: weakest.comment
    };
  }, [result]);

  async function handleCopy(label: string, content: string) {
    if (!content.trim()) {
      return;
    }

    try {
      await Taro.setClipboardData({ data: content });
      Taro.showToast({ title: `${label}已复制`, icon: "success" });
    } catch (_error) {
      Taro.showToast({ title: "复制失败", icon: "none" });
    }
  }

  function handleRetry() {
    if (!scenario) {
      return;
    }

    Taro.redirectTo({ url: `/pages/challenge-v2/index?scenarioId=${scenario.id}` });
  }

  function handleNext() {
    if (!nextScenario) {
      Taro.reLaunch({ url: "/pages/practice-v2/index" });
      return;
    }

    Taro.redirectTo({ url: `/pages/challenge-v2/index?scenarioId=${nextScenario.id}` });
  }

  if (!result || !scenario) {
    return (
      <View className='report-v2-page'>
        <View className='report-v2-empty v2-empty-state v2-empty-state-center fade-up'>
          <View className='v2-empty-state-icon'>
            <Text>报</Text>
          </View>
          <Text className='v2-empty-state-title'>还没有这次训练的报告</Text>
          <Text className='v2-empty-state-copy'>先去练一关，系统会把本次评分结果、成长建议和复练方向放到这里。</Text>
          <Button className='report-v2-primary report-v2-empty-button' onClick={() => Taro.reLaunch({ url: "/pages/practice-v2/index" })}>
            去练习场
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View className='report-v2-page'>
      <ScrollView className='report-v2-scroll' scrollY>
        <View className='report-v2-shell'>
          <View className='report-v2-topbar fade-up'>
            <View className='report-v2-icon-button' onClick={() => Taro.reLaunch({ url: "/pages/home-v2/index" })}>
              <Text>⌂</Text>
            </View>
            <Text className='report-v2-mark'>REPORT</Text>
            <View
              className='report-v2-icon-button report-v2-icon-button-teal'
              onClick={() => Taro.showToast({ title: "分享功能筹备中", icon: "none" })}
            >
              <Text>↗</Text>
            </View>
          </View>

          <View className={`report-v2-hero accent-${scoreTone.accent} fade-up fade-up-delay-1`}>
            <View className='report-v2-hero-head'>
              <Text className='report-v2-hero-tag'>{formatCategory(scenario.category)} · {scoreTone.label}</Text>
              <Text className='report-v2-hero-delta'>{scoreTone.delta}</Text>
            </View>

            <View className='report-v2-score-wrap'>
              <Text className='report-v2-score-main'>{result.overallScore}</Text>
              <Text className='report-v2-score-unit'>分</Text>
            </View>

            <Text className='report-v2-hero-copy'>{scoreTone.copy}</Text>
            <Text className='report-v2-hero-summary'>{result.summary}</Text>

            <View className='report-v2-hero-note'>
              <Text className='report-v2-hero-note-label'>这一轮最值得记住的是</Text>
              <Text className='report-v2-hero-note-copy'>{scoreStatement}</Text>
            </View>

            <View className={`report-v2-save-row tone-${saveStatus.tone}`}>
              <Text className='report-v2-save-dot' />
              <Text className='report-v2-save-status'>{saveStatus.copy}</Text>
            </View>
          </View>

          <View className='report-v2-metrics fade-up fade-up-delay-1'>
            <View className='report-v2-metric-card'>
              <Text className='report-v2-metric-value'>{formatDuration(result.metrics.thinkingTimeMs)}</Text>
              <Text className='report-v2-metric-label'>思考时长</Text>
            </View>
            <View className='report-v2-metric-card'>
              <Text className='report-v2-metric-value'>{result.metrics.answerLength}</Text>
              <Text className='report-v2-metric-label'>回答字数</Text>
            </View>
          </View>

          <View className='report-v2-section-card fade-up fade-up-delay-2'>
            <View className='report-v2-section-head'>
              <View>
                <Text className='report-v2-section-mark'>BREAKDOWN</Text>
                <Text className='report-v2-section-title'>五维拆解</Text>
              </View>
            </View>
            <View className='report-v2-breakdown-grid'>
              {result.scoreBreakdown.map((item) => (
                <View key={item.key} className='report-v2-breakdown-item'>
                  <View className='report-v2-breakdown-head'>
                    <Text className='report-v2-breakdown-label'>{item.label}</Text>
                    <Text className='report-v2-breakdown-score'>{item.score}</Text>
                  </View>
                  <View className='report-v2-breakdown-track'>
                    <View className='report-v2-breakdown-fill' style={{ width: `${item.score}%` }} />
                  </View>
                  <Text className='report-v2-breakdown-copy'>{item.comment}</Text>
                </View>
              ))}
            </View>
          </View>

          {!!answer && (
            <View className='report-v2-section-card fade-up fade-up-delay-2'>
              <View className='report-v2-section-head'>
                <View>
                  <Text className='report-v2-section-mark'>YOUR ANSWER</Text>
                  <Text className='report-v2-section-title'>回看你刚才怎么说</Text>
                </View>
              </View>
              <Text className='report-v2-original-answer'>{answer}</Text>
              <View className='report-v2-copy-row'>
                <Text className='report-v2-copy-link' onClick={() => handleCopy("原回答", answer)}>
                  复制原回答
                </Text>
              </View>
            </View>
          )}

          <View className='report-v2-analysis-grid fade-up fade-up-delay-3'>
            <View className='report-v2-analysis-card'>
              <View className='report-v2-analysis-head'>
                <View className='report-v2-analysis-icon tone-good'>
                  <Text>优</Text>
                </View>
                <Text className='report-v2-analysis-title'>这次稳住了什么</Text>
              </View>
              <View className='report-v2-analysis-list'>
                {result.strengths.map((item) => (
                  <Text key={item} className='report-v2-analysis-copy'>
                    {item}
                  </Text>
                ))}
              </View>
            </View>

            <View className='report-v2-analysis-card'>
              <View className='report-v2-analysis-head'>
                <View className='report-v2-analysis-icon tone-warn'>
                  <Text>补</Text>
                </View>
                <Text className='report-v2-analysis-title'>下一步补哪里</Text>
              </View>
              <View className='report-v2-analysis-list'>
                {[...result.risks, ...result.missedConsiderations].slice(0, 4).map((item) => (
                  <Text key={item} className='report-v2-analysis-copy'>
                    {item}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View className='report-v2-script-card fade-up fade-up-delay-4'>
            <Text className='report-v2-script-mark'>TRY THIS</Text>
            <Text className='report-v2-script-title'>试着这样重说</Text>
            <Text className='report-v2-script-text'>{result.improvedAnswer}</Text>
            <View className='report-v2-copy-row'>
              <Text className='report-v2-copy-link' onClick={() => handleCopy("优化版话术", result.improvedAnswer)}>
                复制优化版
              </Text>
            </View>

            <View className='report-v2-script-divider' />

            <Text className='report-v2-script-subtitle'>如果你想更成熟一点</Text>
            <Text className='report-v2-script-text report-v2-script-text-advanced'>{result.advancedAnswer}</Text>
            <View className='report-v2-copy-row'>
              <Text className='report-v2-copy-link' onClick={() => handleCopy("进阶版话术", result.advancedAnswer)}>
                复制进阶版
              </Text>
            </View>
          </View>

          <View className='report-v2-next-card fade-up fade-up-delay-4'>
            <Text className='report-v2-section-mark'>NEXT STEP</Text>
            <Text className='report-v2-next-title'>{reviewFocus.title}</Text>
            <Text className='report-v2-next-copy'>{reviewFocus.copy}</Text>
            <View className='report-v2-next-strip'>
              <View>
                <Text className='report-v2-next-label'>推荐下一关</Text>
                <Text className='report-v2-next-scene'>{nextScenario ? nextScenario.title : "回练习场继续挑关卡"}</Text>
              </View>
              <Text className='report-v2-next-tag'>{nextScenario ? formatCategory(nextScenario.category) : "继续探索"}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className='report-v2-actions'>
        <Button className='report-v2-secondary' onClick={handleRetry}>
          再答一次
        </Button>
        <Button className='report-v2-primary' onClick={handleNext}>
          {nextScenario ? "下一关继续" : "回练习场"}
        </Button>
      </View>
    </View>
  );
}
